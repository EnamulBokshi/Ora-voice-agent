import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as http from 'http';
import * as url from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { GeminiVoiceService, GeminiVoiceSessionControls } from './gemini-voice.service';
import { RedisService } from '../common/redis/redis.service';

import { CustomersService } from '../customers/customers.service';

interface ProxySession {
  clientWs: WebSocket;
  sessionControls: GeminiVoiceSessionControls;
  businessId: string;
  customerId: string;
  isAnonymous: boolean;
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
    private readonly redisService: RedisService,
    private readonly customersService: CustomersService,
  ) { }


  /**
   * Invalidate in-memory cached business mapping for a publishable key
   * (called when a key is deleted/revoked or updated).
   */
  invalidatePublishableKey(publishableKey?: string): void {
    if (publishableKey) {
      this.businessCache.delete(publishableKey);
      this.logger.log(`[VoiceProxyGateway] Cache invalidated for key: ${publishableKey.substring(0, 16)}...`);
    } else {
      this.businessCache.clear();
      this.logger.log('[VoiceProxyGateway] All cached business keys cleared.');
    }
  }

  /**
   * Mount the raw ws.Server on the NestJS HTTP server's upgrade event.
   * Called from main.ts after app.listen().
   */
  attachToServer(server: http.Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      if (parsedUrl.pathname !== '/ws/voice') return;

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
      let business = await this.businessModel.findOne({ publishableKey, status: 'active' }).exec();

      if (!business && publishableKey === 'biz_live_mock_key_12345' && process.env.NODE_ENV !== 'production') {
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
      this.logger.warn(
        `[VoiceProxyGateway] Connection rejected: invalid or inactive publishable key '${publishableKey}' for session ${sessionId}`,
      );
      sendToClient({ type: 'error', message: 'Invalid or inactive publishable key. Access denied.' });
      clientWs.close(1008, 'Invalid publishable key');
      return;
    }

    this.logger.log(
      `[VoiceProxyGateway] Resolved business ${businessId} (${businessName}) for session ${sessionId}`,
    );

    // ── Resolve Customer Identity (Tier 1 HMAC / Tier 2 Device ID / Tier 3 Ghost) ──
    const customerIdParam = parsedUrl.query.customerId as string;
    const customerTsParam = parsedUrl.query.customerTimestamp as string;
    const customerSigParam = parsedUrl.query.customerSignature as string;
    const deviceIdParam = parsedUrl.query.deviceId as string;

    let customerToken: { customerId: string; timestamp: number; signature: string } | undefined = undefined;
    if (customerIdParam && customerTsParam && customerSigParam) {
      customerToken = {
        customerId: customerIdParam,
        timestamp: Number(customerTsParam),
        signature: customerSigParam,
      };
    }

    const { customer: activeCustomer } = await this.customersService.resolveOrCreateCustomer(businessId, {
      customerToken,
      deviceId: deviceIdParam,
      sessionId,
    });

    // Store active session customer mapping in Redis
    try {
      const redis = this.redisService.getClient();
      await redis.set(
        `session:${sessionId}:customer`,
        JSON.stringify({
          customerId: activeCustomer.id,
          isAnonymous: activeCustomer.isAnonymous,
          name: activeCustomer.name,
          businessId,
        }),
        'EX',
        86400,
      );
    } catch (err: any) {
      this.logger.warn(`[VoiceProxyGateway] Redis session customer binding notice: ${err.message}`);
    }

    const resumptionToken = parsedUrl.query.resumptionToken as string;
    if (resumptionToken) {
      try {
        const redis = this.redisService.getClient();
        const savedState = await redis.get(`conversation:session:${sessionId}:suspended`);
        if (savedState) {
          this.logger.log(
            `[VoiceProxyGateway] 🔄 Resuming suspended session ${sessionId} with token ${resumptionToken}`,
          );
          sendToClient({ type: 'session_resumed', sessionId });
        }
      } catch (err: any) {
        this.logger.warn(`[VoiceProxyGateway] Error checking resumption state: ${err.message}`);
      }
    }

    // ── Extract Live Client Context from Query ───────────────────────────────
    const currentPathParam = (parsedUrl.query.currentPath as string) || '/';
    const pageTitleParam = (parsedUrl.query.pageTitle as string) || '';
    const historyParam = (parsedUrl.query.history as string) || '';
    const activeSectionParam = (parsedUrl.query.activeSection as string) || '';

    const initialClientContext = {
      currentPath: currentPathParam,
      title: pageTitleParam,
      history: historyParam ? historyParam.split(',') : [currentPathParam],
      activeSection: activeSectionParam,
    };

    // ── Build the proxy session object ────────────────────────────────────────
    const session: ProxySession = {
      clientWs,
      sessionControls: null as any, // filled after createVoiceSession resolves
      businessId,
      customerId: activeCustomer.id,
      isAnonymous: activeCustomer.isAnonymous,
      closed: false,
    };

    const cleanup = () => {
      if (session.closed) return;
      session.closed = true;
      this.sessions.delete(sessionId);
      try {
        session.sessionControls?.closeSession();
      } catch { }
      this.logger.log(`[VoiceProxyGateway] Session ${sessionId} cleaned up.`);
    };

    // ── Open outbound session to Google Gemini Live ───────────────────────────
    let sessionControls: ProxySession['sessionControls'];

    try {
      sessionControls = await this.geminiVoiceService.createVoiceSession({
        businessId,
        sessionId,
        customerId: activeCustomer.id,
        deviceId: deviceIdParam,
        clientContext: initialClientContext,

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

        // Tool executed server-side → notify client for UI and forward action payload if present
        onToolResult: (toolName, result) => {
          sendToClient({
            type: 'tool_result',
            toolName,
            action: result?.action,
            message: result?.message,
          });
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
    sendToClient({
      type: 'setup_complete',
      customer: {
        id: activeCustomer.id,
        isAnonymous: activeCustomer.isAnonymous,
        name: activeCustomer.name,
      },
    });
    this.logger.log(
      `[VoiceProxyGateway] ✅ Session ${sessionId} is live (Customer: ${activeCustomer.id}, Anon: ${activeCustomer.isAnonymous}). Active sessions: ${this.sessions.size}`,
    );

    // ── Route incoming messages from client → Google ──────────────────────────
    clientWs.on('message', async (data: WebSocket.Data) => {
      if (session.closed) return;
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'client_identify') {
          // Dynamic identity update (e.g. user logged in mid-session or passed auth token)
          this.logger.log(`[VoiceProxyGateway] Runtime identity update received for session ${sessionId}`);
          try {
            const token = msg.customerToken;
            if (token && token.customerId && token.signature) {
              const { customer: newCustomer } = await this.customersService.resolveOrCreateCustomer(
                businessId,
                { customerToken: token, sessionId },
              );
              if (!newCustomer.isAnonymous && session.customerId !== newCustomer.id) {
                await this.customersService.stitchCustomerAccounts(
                  businessId,
                  session.customerId,
                  newCustomer.id,
                  sessionId,
                  'runtime_client_identify',
                );
                session.customerId = newCustomer.id;
                session.isAnonymous = false;

                const redis = this.redisService.getClient();
                await redis.set(
                  `session:${sessionId}:customer`,
                  JSON.stringify({
                    customerId: newCustomer.id,
                    isAnonymous: false,
                    name: newCustomer.name,
                    businessId,
                  }),
                  'EX',
                  86400,
                );

                sendToClient({
                  type: 'customer_identified',
                  customerId: newCustomer.id,
                  name: newCustomer.name,
                });
              }
            }
          } catch (e: any) {
            this.logger.warn(`[VoiceProxyGateway] Runtime identification failed: ${e.message}`);
          }
          return;
        }

        if (msg.type === 'client_idle_suspend') {
          this.logger.log(`[VoiceProxyGateway] Session ${sessionId} suspended on client idle.`);
          const rToken = `res_${sessionId}_${Date.now()}`;
          try {
            const redis = this.redisService.getClient();
            await redis.set(
              `conversation:session:${sessionId}:suspended`,
              JSON.stringify({ businessId, suspendedAt: Date.now(), resumptionToken: rToken }),
              'EX',
              86400,
            );
          } catch (e) {}
          sendToClient({ type: 'session_suspended', resumptionToken: rToken });
          cleanup();
          return;
        }

        if (msg.type === 'client_context_update') {
          this.logger.log(`[VoiceProxyGateway] Context update for session ${sessionId}: page="${msg.currentPath || '/'}" title="${msg.title || ''}"`);
          sessionControls.sendContextUpdate({
            currentPath: msg.currentPath,
            title: msg.title,
            history: msg.history,
            activeSection: msg.activeSection,
          });
          return;
        }

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
