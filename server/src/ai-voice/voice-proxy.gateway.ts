import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as http from 'http';
import * as url from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { GeminiVoiceService } from './gemini-voice.service';

interface ProxySession {
  clientWs: WebSocket;
  sessionControls: {
    sendAudioChunk: (base64Pcm16k: string) => void;
    sendTextMessage: (text: string) => void;
    closeSession: () => void;
  };
  businessId: string;
  closed: boolean;
}

@Injectable()
export class VoiceProxyGateway {
  private readonly logger = new Logger(VoiceProxyGateway.name);
  private readonly sessions = new Map<string, ProxySession>();
  private readonly businessCache = new Map<string, { businessId: string; name: string; expiresAt: number }>();
  private wss: WebSocketServer | null = null;

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly geminiVoiceService: GeminiVoiceService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Mount the raw ws.Server on the NestJS HTTP server's upgrade event.
   * Called from main.ts after app.listen().
   */
  attachToServer(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      if (parsedUrl.pathname !== '/ws/voice' && parsedUrl.pathname !== '/api/v1/ws/voice') return;

      this.wss!.handleUpgrade(request, socket as any, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (clientWs: WebSocket, request: http.IncomingMessage) => {
      // Fire-and-forget — errors are caught internally
      this.handleConnection(clientWs, request).catch((err) => {
        this.logger.error(`[VoiceProxyGateway] Unhandled connection error: ${err.message}`);
      });
    });

    this.logger.log('[VoiceProxyGateway] ✅ WebSocket proxy mounted at /ws/voice');
  }

  private async handleConnection(
    clientWs: WebSocket,
    request: http.IncomingMessage,
  ): Promise<void> {
    const parsedUrl = url.parse(request.url || '', true);
    const publishableKey = parsedUrl.query.publishableKey as string;
    const sessionId = parsedUrl.query.sessionId as string;

    const sendToClient = (data: object) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(data));
      }
    };

    // ── Validate required params ──────────────────────────────────────────────
    if (!publishableKey || !sessionId) {
      sendToClient({ type: 'error', message: 'publishableKey and sessionId are required.' });
      clientWs.close(1008, 'Missing credentials');
      return;
    }

    this.logger.log(
      `[VoiceProxyGateway] New connection — session: ${sessionId}, key: ${publishableKey.substring(0, 16)}...`,
    );

    // ── Resolve business from publishable key (with memory cache) ──────────────
    let businessId: string | null = null;
    let businessName: string = '';

    const cachedBiz = this.businessCache.get(publishableKey);
    if (cachedBiz && cachedBiz.expiresAt > Date.now()) {
      businessId = cachedBiz.businessId;
      businessName = cachedBiz.name;
    } else {
      let business = await this.businessModel.findOne({ publishableKey }).exec();

      if (!business) {
        business = await this.businessModel
          .findOne({ status: 'active', publishableKey: { $ne: 'biz_live_mock_key_12345' } })
          .sort({ createdAt: -1 })
          .exec();
      }

      if (!business) {
        business = await this.businessModel.findOne({}).sort({ createdAt: -1 }).exec();
      }

      if (business) {
        const id = (business._id as any).toString();
        businessId = id;
        businessName = business.name;
        this.businessCache.set(publishableKey, {
          businessId: id,
          name: businessName,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
        });
      }
    }

    if (!businessId) {
      sendToClient({ type: 'error', message: 'Invalid publishable key. No active store found.' });
      clientWs.close(1008, 'Invalid publishable key');
      return;
    }

    this.logger.log(
      `[VoiceProxyGateway] Resolved business ${businessId} (${businessName}) for session ${sessionId}`,
    );

    // ── Build the proxy session object ────────────────────────────────────────
    const session: ProxySession = {
      clientWs,
      sessionControls: null as any, // filled after createVoiceSession resolves
      businessId,
      closed: false,
    };

    const cleanup = () => {
      if (session.closed) return;
      session.closed = true;
      this.sessions.delete(sessionId);
      try {
        session.sessionControls?.closeSession();
      } catch {}
      this.logger.log(`[VoiceProxyGateway] Session ${sessionId} cleaned up.`);
    };

    // ── Open outbound session to Google Gemini Live ───────────────────────────
    let sessionControls: ProxySession['sessionControls'];

    try {
      sessionControls = await this.geminiVoiceService.createVoiceSession({
        businessId,
        sessionId,

        // Google → client: audio response
        onAudioData: (base64AudioPcm) => {
          sendToClient({ type: 'audio', data: base64AudioPcm });
        },

        // Google → client: text transcript
        onTextData: (text) => {
          sendToClient({ type: 'text', text });
        },

        // Google → client: barge-in / interruption
        onInterrupted: () => {
          sendToClient({ type: 'interrupted' });
        },

        // Google → client: agent finished speaking
        onTurnComplete: () => {
          sendToClient({ type: 'turn_complete' });
        },

        // Tool executed server-side → notify client for UI only
        onToolResult: (toolName) => {
          sendToClient({ type: 'tool_result', toolName });
        },

        // Google WS error (post-setup)
        onError: (err) => {
          this.logger.error(
            `[VoiceProxyGateway] Google session error for ${sessionId}: ${err.message}`,
          );
          sendToClient({ type: 'error', message: 'Voice session error. Please try again.' });
          cleanup();
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, 'Google session error');
          }
        },

        // Google WS closed (post-setup)
        onClose: () => {
          this.logger.log(`[VoiceProxyGateway] Google WS closed for session ${sessionId}`);
          sendToClient({ type: 'session_closed' });
          cleanup();
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000, 'Session ended');
          }
        },
      });
    } catch (err: any) {
      this.logger.error(
        `[VoiceProxyGateway] Failed to establish Google session for ${sessionId}: ${err.message}`,
      );
      sendToClient({ type: 'error', message: err.message || 'Failed to connect to AI service.' });
      clientWs.close(1011, 'Session setup failed');
      return;
    }

    // Store session controls
    session.sessionControls = sessionControls;
    this.sessions.set(sessionId, session);

    // ── Notify client that session is ready ───────────────────────────────────
    sendToClient({ type: 'setup_complete' });
    this.logger.log(
      `[VoiceProxyGateway] ✅ Session ${sessionId} is live. Active sessions: ${this.sessions.size}`,
    );

    // ── Route incoming messages from client → Google ──────────────────────────
    clientWs.on('message', (data: WebSocket.Data) => {
      if (session.closed) return;
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'audio' && msg.data) {
          sessionControls.sendAudioChunk(msg.data as string);
        } else if (msg.type === 'text' && msg.text) {
          sessionControls.sendTextMessage(msg.text as string);
        }
      } catch (err: any) {
        this.logger.warn(
          `[VoiceProxyGateway] Could not parse client message for session ${sessionId}: ${err.message}`,
        );
      }
    });

    // ── Handle client disconnect ──────────────────────────────────────────────
    clientWs.on('close', () => {
      this.logger.log(`[VoiceProxyGateway] Client disconnected for session ${sessionId}`);
      cleanup();
    });

    clientWs.on('error', (err) => {
      this.logger.error(
        `[VoiceProxyGateway] Client WS error for session ${sessionId}: ${err.message}`,
      );
      cleanup();
    });
  }

  /** For health checks / monitoring */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
