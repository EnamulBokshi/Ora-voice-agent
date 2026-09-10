import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as http from 'http';
import * as url from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { GeminiVoiceService, GeminiVoiceSessionControls } from './gemini-voice.service';
import { RedisService } from '../common/redis/redis.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationChannel, ConversationStatus } from '../conversations/schemas/conversation.schema';
import { MessageRole } from '../conversations/schemas/message.schema';

import { CustomersService } from '../customers/customers.service';
import { UsageTrackingService } from '../usage/usage-tracking.service';
import { UsageChannelType } from '../usage/schemas/token-usage-record.schema';
import {
  SessionTimerService,
  DEFAULT_SESSION_DURATION_SECONDS,
  IDLE_WARNING_SECONDS,
  IDLE_TERMINATE_SECONDS,
} from '../gateway/session-timer.service';

interface ProxySession {
  clientWs: WebSocket;
  sessionControls: GeminiVoiceSessionControls;
  businessId: string;
  customerId: string;
  conversationId: string | null;
  bufferedAiText: string;
  bufferedUserText: string;   // accumulates user's speech chunks from Gemini inputTranscription
  isAnonymous: boolean;
  closed: boolean;
  audioInputBytes: number;
  audioOutputBytes: number;
  promptTokens: number;
  completionTokens: number;
  isGreetingPending: boolean;
  greetingDispatchedAt: number;
  isClosingOnIdle?: boolean;
}

@Injectable()
export class VoiceProxyGateway {
  private readonly logger = new Logger(VoiceProxyGateway.name);
  private readonly sessions = new Map<string, ProxySession>();
  private readonly businessCache = new Map<string, { businessId: string; name: string; isWidgetActive: boolean; maxSessionDurationSeconds?: number | null; expiresAt: number }>();
  private readonly userCache = new Map<string, { user: { id: string; name: string; email: string; role: string; businessId?: string }; expiresAt: number }>();
  private wss: WebSocketServer | null = null;

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    private readonly geminiVoiceService: GeminiVoiceService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly customersService: CustomersService,
    private readonly conversationsService: ConversationsService,
    private readonly sessionTimerService: SessionTimerService,
    private readonly usageTrackingService?: UsageTrackingService,
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
      this.userCache.clear();
      this.logger.log('[VoiceProxyGateway] All cached business and user keys cleared.');
    }
  }

  /**
   * Terminate all active live customer sessions for a business when widget is toggled off.
   * Sends code 1008 and teardown signal, cleanly releasing resources and removing widget from client DOM.
   */
  terminateBusinessSessions(businessId: string): void {
    let count = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.businessId === businessId && !session.closed) {
        session.closed = true;
        count++;
        try {
          session.sessionControls?.closeSession?.();
        } catch {}
        try {
          if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
            session.clientWs.send(JSON.stringify({ type: 'error', message: 'Widget disabled by store owner.' }));
            session.clientWs.close(1008, 'Widget disabled by store owner');
          }
        } catch {}
        this.sessions.delete(sessionId);
        this.sessionTimerService.clearTimer(sessionId);
      }
    }
    if (count > 0) {
      this.logger.log(`[VoiceProxyGateway] Terminated ${count} active voice session(s) for business ${businessId} due to storefront widget deactivation.`);
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

    // ── Check for Authenticated AdminUser / Merchant Token First ──────────────
    const authTokenParam = parsedUrl.query.authToken as string;
    let authenticatedUser: { id: string; name: string; email: string; role: string; businessId?: string } | undefined = undefined;

    if (authTokenParam) {
      try {
        const decoded = await this.jwtService.verifyAsync(authTokenParam);
        if (decoded && decoded.sub) {
          const cached = this.userCache.get(decoded.sub);
          if (cached && cached.expiresAt > Date.now()) {
            authenticatedUser = cached.user;
          } else {
            const userDoc = await this.adminUserModel.findById(decoded.sub).exec();
            if (userDoc) {
              const uBizId = userDoc.businessId ? (userDoc.businessId as any).toString() : undefined;
              authenticatedUser = {
                id: (userDoc._id as any).toString(),
                name: userDoc.name || 'Merchant User',
                email: userDoc.email,
                role: userDoc.role || decoded.role || 'owner',
                businessId: uBizId,
              };
              this.userCache.set(decoded.sub, {
                user: authenticatedUser,
                expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
              });
            }
          }
          if (authenticatedUser) {
            this.logger.log(
              `[VoiceProxyGateway] 👤 Authenticated user connected via JWT: ${authenticatedUser.name} (${authenticatedUser.email}, role: ${authenticatedUser.role}) for session ${sessionId}`,
            );
          }
        }
      } catch (authErr: any) {
        this.logger.warn(`[VoiceProxyGateway] Auth token verification notice for session ${sessionId}: ${authErr.message}`);
      }
    }

    // If not authenticated via query token, attempt resolving via session cookie stored in Redis
    if (!authenticatedUser && request.headers.cookie) {
      try {
        const cookieHeader = request.headers.cookie;
        const cookiePairs = cookieHeader.split(';');
        let cookieSessionId: string | undefined = undefined;

        for (const pair of cookiePairs) {
          const [key, val] = pair.split('=');
          if (key && key.trim() === 'sessionId' && val) {
            cookieSessionId = decodeURIComponent(val.trim());
            break;
          }
        }

        if (cookieSessionId) {
          const sessionData = await this.redisService.getSession(cookieSessionId);
          if (sessionData && sessionData.adminUserId) {
            const userDoc = await this.adminUserModel.findById(sessionData.adminUserId).exec();
            if (userDoc) {
              const uBizId = userDoc.businessId ? (userDoc.businessId as any).toString() : sessionData.businessId;
              authenticatedUser = {
                id: (userDoc._id as any).toString(),
                name: userDoc.name || 'Merchant User',
                email: userDoc.email,
                role: userDoc.role || sessionData.role || 'owner',
                businessId: uBizId,
              };
              this.logger.log(
                `[VoiceProxyGateway] 👤 Authenticated user resolved via session cookie (${cookieSessionId}): ${authenticatedUser.name} (${authenticatedUser.email}, role: ${authenticatedUser.role}) for session ${sessionId}`,
              );
            }
          }
        }
      } catch (cookieErr: any) {
        this.logger.warn(`[VoiceProxyGateway] Cookie session resolution notice for session ${sessionId}: ${cookieErr.message}`);
      }
    }

    // ── Resolve Host Business from Publishable Key (Single Source of Truth) ───
    let businessId: string | null = null;
    let businessName: string = '';
    let bizMaxSessionDurationSeconds: number | null = null;
    let isWidgetActive: boolean = true;

    const cachedBiz = this.businessCache.get(publishableKey);
    if (cachedBiz && cachedBiz.expiresAt > Date.now()) {
      businessId = cachedBiz.businessId;
      businessName = cachedBiz.name;
      bizMaxSessionDurationSeconds = cachedBiz.maxSessionDurationSeconds ?? null;
      isWidgetActive = cachedBiz.isWidgetActive;
    } else {
      let business = await this.businessModel.findOne({ publishableKey, status: 'active' }).exec();

      // In dev environment: if platform system key is used, resolve platform business
      if (!business && (publishableKey === 'biz_live_ora_platform_system' || publishableKey === 'biz_live_mock_key_12345') && process.env.NODE_ENV !== 'production') {
        business = await this.businessModel.findOne({ publishableKey: 'biz_live_ora_platform_system' }).exec();
        if (!business) {
          business = await this.businessModel.findOne({ name: 'ORA Platform' }).exec();
        }
      }

      if (business) {
        const id = (business._id as any).toString();
        businessId = id;
        businessName = business.name;
        bizMaxSessionDurationSeconds = (business as any).maxSessionDurationSeconds ?? null;
        isWidgetActive = (business as any).isWidgetActive !== false;
        this.businessCache.set(publishableKey, {
          businessId: id,
          name: businessName,
          isWidgetActive,
          maxSessionDurationSeconds: bizMaxSessionDurationSeconds,
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

    // If merchant has disabled storefront widget and this is an unauthenticated public shopper, reject
    if (!authenticatedUser && !isWidgetActive) {
      this.logger.warn(
        `[VoiceProxyGateway] Connection rejected: storefront widget is disabled by merchant for business ${businessId} (${businessName}) for session ${sessionId}`,
      );
      sendToClient({ type: 'error', message: 'Storefront widget is disabled by store owner.' });
      clientWs.close(1008, 'Widget disabled');
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

    const isUserAnon = authenticatedUser ? false : activeCustomer.isAnonymous;
    const resolvedName = authenticatedUser?.name || activeCustomer.name;

    // Store active session customer mapping in Redis
    try {
      const redis = this.redisService.getClient();
      await redis.set(
        `session:${sessionId}:customer`,
        JSON.stringify({
          customerId: activeCustomer.id,
          isAnonymous: isUserAnon,
          name: resolvedName,
          email: authenticatedUser?.email,
          role: authenticatedUser?.role,
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

    // ── Terminate any existing session with the same sessionId ───────────────
    const existingSession = this.sessions.get(sessionId);
    if (existingSession) {
      this.logger.log(`[VoiceProxyGateway] Cleaning up previous session with same sessionId: ${sessionId}`);
      try {
        existingSession.closed = true;
        existingSession.sessionControls?.closeSession();
        if (existingSession.clientWs.readyState === WebSocket.OPEN) {
          existingSession.clientWs.close(1000, 'Replaced by new session');
        }
      } catch { }
      this.sessions.delete(sessionId);
    }

    // ── Find or Create Conversation Document in MongoDB ─────────────────────
    let conversationId: string | null = null;
    try {
      const conv = await this.conversationsService.findOrCreateSession(
        businessId,
        sessionId,
        ConversationChannel.WIDGET_VOICE,
        {
          customerName: resolvedName,
          initialPath: currentPathParam,
          pageTitle: pageTitleParam,
          authenticatedUser: authenticatedUser
            ? {
              name: authenticatedUser.name,
              email: authenticatedUser.email,
              role: authenticatedUser.role,
            }
            : undefined,
        },
        activeCustomer.id,
      );
      conversationId = (conv._id as any).toString();
      this.logger.log(`[VoiceProxyGateway] 📝 Linked voice session ${sessionId} to conversation ${conversationId}`);
    } catch (convErr: any) {
      this.logger.warn(`[VoiceProxyGateway] Failed to initialize conversation record for session ${sessionId}: ${convErr.message}`);
    }

    // ── Build the proxy session object ────────────────────────────────────────
    const session: ProxySession = {
      clientWs,
      sessionControls: null as any, // filled after createVoiceSession resolves
      businessId,
      customerId: activeCustomer.id,
      conversationId,
      bufferedAiText: '',
      bufferedUserText: '',
      isAnonymous: isUserAnon,
      closed: false,
      audioInputBytes: 0,
      audioOutputBytes: 0,
      promptTokens: 0,
      completionTokens: 0,
      isGreetingPending: false,
      greetingDispatchedAt: 0,
    };

    const flushBufferedAiText = () => {
      if (session.bufferedAiText && session.bufferedAiText.trim() && session.conversationId) {
        const textToSave = session.bufferedAiText.trim();
        session.completionTokens += Math.ceil(textToSave.length / 4);
        session.bufferedAiText = '';
        this.conversationsService
          .appendMessage(session.conversationId, MessageRole.ASSISTANT, textToSave)
          .catch((e) => this.logger.warn(`[VoiceProxyGateway] Error saving AI message turn: ${e.message}`));
      }
    };

    // Assembles fragmented user speech chunks into one coherent utterance and persists it.
    // Gemini streams inputTranscription in real-time; we accumulate until finished=true or turn boundary.
    const flushBufferedUserText = () => {
      if (session.bufferedUserText && session.bufferedUserText.trim() && session.conversationId) {
        const textToSave = session.bufferedUserText.trim();
        session.promptTokens += Math.ceil(textToSave.length / 4);
        session.bufferedUserText = '';
        this.conversationsService
          .appendMessage(session.conversationId, MessageRole.USER, textToSave)
          .catch((e) => this.logger.warn(`[VoiceProxyGateway] Error saving user transcript: ${e.message}`));
      }
    };

    const cleanup = () => {
      if (session.closed) return;
      session.closed = true;
      flushBufferedUserText(); // save any partial user speech before closing
      flushBufferedAiText();
      if (session.conversationId) {
        this.conversationsService
          .updateStatus(businessId, session.conversationId, ConversationStatus.CLOSED)
          .catch(() => { });
      }

      // Record voice token & audio compute OpEx
      if (this.usageTrackingService) {
        const audioInSecs = session.audioInputBytes / 32000;
        const audioOutSecs = session.audioOutputBytes / 48000;
        const promptToks = session.promptTokens + 800; // baseline system instructions
        const compToks = session.completionTokens;
        const activeModelName =
          this.configService.get<string>('GEMINI_MODEL')?.replace('models/', '') ||
          'gemini-2.0-flash';

        this.usageTrackingService
          .recordUsage({
            businessId,
            sessionId,
            channelType: UsageChannelType.VOICE_STREAM,
            model: activeModelName,
            promptTokens: promptToks,
            completionTokens: compToks,
            audioInputSeconds: audioInSecs,
            audioOutputSeconds: audioOutSecs,
          })
          .catch((err) => {
            this.logger.warn(`[VoiceProxyGateway] Usage telemetry notice: ${err?.message}`);
          });
      }

      this.sessions.delete(sessionId);
      this.sessionTimerService.clearTimer(sessionId);
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
        authenticatedUser,

        // Google → client: audio response
        onAudioData: (base64AudioPcm) => {
          session.isGreetingPending = false;
          if (base64AudioPcm) {
            session.audioOutputBytes += Math.round(base64AudioPcm.length * 0.75);
          }
          // ORA is talking — suppress the idle warning until this turn completes,
          // so a long answer can never be interrupted by "are you still there?".
          this.sessionTimerService.markAgentSpeaking(sessionId);
          sendToClient({ type: 'audio', data: base64AudioPcm });
        },

        // Google → client: text transcript
        onTextData: (text) => {
          sendToClient({ type: 'text', text });
          const clean = (text || '').trim();
          if (clean && !clean.startsWith('**') && !clean.startsWith('#')) {
            session.bufferedAiText = (session.bufferedAiText ? session.bufferedAiText + ' ' : '') + clean;
          }
        },

        // Google → client: barge-in / interruption
        onInterrupted: () => {
          // Prevent early false barge-in during initial greeting startup
          if (session.isGreetingPending && Date.now() - session.greetingDispatchedAt < 1200) {
            return;
          }
          sendToClient({ type: 'interrupted' });
          // A barge-in is undeniable proof of a live user, and it also ends ORA's turn.
          this.sessionTimerService.markAgentTurnComplete(sessionId);
          this.sessionTimerService.markActivity(sessionId);
          flushBufferedUserText(); // user spoke again; save whatever they said before the barge-in
          flushBufferedAiText();
        },

        // Google → client: agent finished speaking
        onTurnComplete: () => {
          session.isGreetingPending = false;
          sendToClient({ type: 'turn_complete' });
          flushBufferedUserText(); // safety flush: user utterance must be complete by now
          flushBufferedAiText();
          this.sessionTimerService.markAgentTurnComplete(sessionId);

          if (session.isClosingOnIdle) {
            this.logger.log(`[VoiceProxyGateway] Goodbye speech turn complete for session ${sessionId}. Scheduling clean termination.`);
            sendToClient({
              type: 'session_ended',
              reason: 'idle_timeout',
              message: 'Session closed due to inactivity. Start a new session anytime!',
            });
            // Allow 4 seconds for the client's browser WebAudio queue to finish speaking all audio packets before closing socket
            setTimeout(() => {
              cleanup();
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close(1000, 'Idle timeout completed');
              }
            }, 4000);
          }
        },

        // Server-side user input transcription — Gemini’s own STT of the user’s microphone audio.
        // Comes in small chunks while the user is still speaking; isFinal=true signals end of utterance.
        // Buffers fragments (“hello” + “ I want” + “ shoes”) into one complete message before saving.
        onInputTranscript: (text, isFinal) => {
          if (!text.trim()) return;
          // Any transcribed chunk is real recognised speech, not mic noise — mark activity
          // immediately. Waiting for isFinal meant a voice-only user never marked activity
          // at all, because Gemini Live does not reliably send `finished` on
          // inputTranscription frames, so sessions closed while the user was talking.
          this.sessionTimerService.markActivity(sessionId);
          session.bufferedUserText = (session.bufferedUserText ? session.bufferedUserText + ' ' : '') + text.trim();
          if (isFinal) {
            flushBufferedUserText();
          }
        },

        // Server-side ORA output transcription — Gemini reads back its own synthesised audio as text.
        // This is the ONLY source of ORA’s spoken text when responseModalities=[AUDIO].
        // Fragments are buffered into bufferedAiText; isFinal=true or onTurnComplete triggers the DB write.
        onOutputTranscript: (text, isFinal) => {
          if (!text.trim()) return;
          session.bufferedAiText = (session.bufferedAiText ? session.bufferedAiText + ' ' : '') + text.trim();
          if (isFinal) {
            flushBufferedAiText();
          }
        },

        // Tool executed server-side → notify client for UI and forward action payload if present
        onToolResult: (toolName, result) => {
          sendToClient({
            type: 'tool_result',
            toolName,
            action: result?.action,
            message: result?.message,
          });

          if (session.conversationId) {
            this.conversationsService
              .appendMessage(
                session.conversationId,
                MessageRole.TOOL,
                `⚡ Executed tool: ${toolName}`,
                { name: toolName, result },
              )
              .catch((e) => this.logger.warn(`[VoiceProxyGateway] Error saving tool result message: ${e.message}`));
          }
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

    // Resolve per-merchant session duration limit (or fall back to platform default)
    const defaultDuration =
      this.configService.get<number>('DEFAULT_SESSION_DURATION_SECONDS') ??
      DEFAULT_SESSION_DURATION_SECONDS;
    const sessionDurationSeconds: number =
      typeof bizMaxSessionDurationSeconds === 'number' && bizMaxSessionDurationSeconds > 0
        ? bizMaxSessionDurationSeconds
        : defaultDuration;

    // ── Notify client that session is ready ───────────────────────────────────
    sendToClient({
      type: 'setup_complete',
      user: authenticatedUser || null,
      sessionDurationSeconds,
      customer: {
        id: activeCustomer.id,
        isAnonymous: isUserAnon,
        name: resolvedName,
      },
    });
    this.logger.log(
      `[VoiceProxyGateway] ✅ Session ${sessionId} is live (User: ${authenticatedUser?.name || 'Guest'}, Anon: ${isUserAnon}, Duration: ${sessionDurationSeconds}s). Active sessions: ${this.sessions.size}`,
    );

    // ── Start Session Timers (Max Duration + idle warning / terminate) ─────────
    this.sessionTimerService.startTimer(
      sessionId,
      sessionId,
      businessId,
      sessionDurationSeconds,
      // onMaxWarning: 60s before hard limit
      (remainingSeconds) => {
        sendToClient({
          type: 'session_warning',
          remainingSeconds,
          message: `Your session will end in ${remainingSeconds} seconds.`,
        });
      },
      // onMaxExpiry: hard limit reached
      () => {
        sendToClient({
          type: 'session_ended',
          reason: 'session_time_limit',
          message: 'Session ended: maximum session duration reached.',
        });
        cleanup();
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1000, 'Session time limit reached');
        }
      },
      // onIdleWarning: 15s of silence
      () => {
        sendToClient({
          type: 'idle_warning',
          message: `Are you still there? Your session will close in ${IDLE_TERMINATE_SECONDS} seconds due to inactivity.`,
          secondsUntilClose: IDLE_TERMINATE_SECONDS,
        });
        try {
          sessionControls.sendTextMessage(
            `[SYSTEM_TRIGGER: IDLE_WARNING] The user has been silent for ${IDLE_WARNING_SECONDS} seconds. Ask them warmly and briefly if they are still there in ONE short sentence. Speak aloud now.`,
          );
        } catch { }
      },
      // onIdleExpiry: 20s after idle warning if still silent
      () => {
        session.isClosingOnIdle = true;
        this.logger.log(`[VoiceProxyGateway] Idle expiry triggered for session ${sessionId}. Requesting spoken goodbye.`);
        try {
          sessionControls.sendTextMessage(
            '[SYSTEM_TRIGGER: IDLE_CLOSE] The user did not respond. Say a brief, warm goodbye in ONE short sentence and let them know they can start a new session anytime. Speak aloud now.',
          );
        } catch { }

        // Fallback safety timer: if Gemini never responds or onTurnComplete does not fire within 15s, force close
        setTimeout(() => {
          if (!session.closed) {
            this.logger.warn(`[VoiceProxyGateway] Fallback idle timeout close for session ${sessionId}`);
            sendToClient({
              type: 'session_ended',
              reason: 'idle_timeout',
              message: 'Session closed due to inactivity. Start a new session anytime!',
            });
            cleanup();
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close(1000, 'Idle timeout fallback');
            }
          }
        }, 15000);
      },
    );

    const skipGreetingParam = parsedUrl.query.skipGreeting === 'true';

    // ── Dispatch Proactive Initial Greeting on Voice Connection ─────────────
    if (!skipGreetingParam) {
      try {
        let greetingTrigger = '';
        if (authenticatedUser) {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] Visitor connected. This is ${authenticatedUser.name || 'a merchant'}, an authenticated ${authenticatedUser.role || 'user'}. Greet them by name in ONE warm, concise sentence (maximum 10-12 words, e.g. "Welcome back, ${authenticatedUser.name || ''}! How can I help you today?"). Speak aloud now.`;
        } else if (!isUserAnon && resolvedName && resolvedName !== 'Guest Shopper' && resolvedName !== 'Guest Visitor') {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] Visitor connected. Name: ${resolvedName}. Greet them in ONE warm, concise sentence (maximum 10-12 words, e.g. "Hi ${resolvedName}! How can I help you today?"). Speak aloud now.`;
        } else {
          const isPricing = currentPathParam === '/pricing';
          const isDocs = currentPathParam.startsWith('/docs');
          const isDashboard = currentPathParam.startsWith('/dashboard');
          const pageContextNote = isPricing
            ? ' on pricing page'
            : isDocs
              ? ' on docs guide'
              : isDashboard
                ? ' in dashboard'
                : '';
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] New visitor connected${pageContextNote}. Speak first in ONE short, friendly sentence (maximum 10-12 words, e.g. "Hi there! I'm ORA. How can I help you today?"). Do not give long speeches. Speak aloud now.`;
        }

        this.logger.log(
          `[VoiceProxyGateway] 🎙️ Dispatching initial greeting trigger for session ${sessionId}`,
        );
        sessionControls.sendTextMessage(greetingTrigger);
      } catch (greetErr: any) {
        this.logger.warn(
          `[VoiceProxyGateway] Greeting trigger notice for session ${sessionId}: ${greetErr.message}`,
        );
      }
    }

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

        if (msg.type === 'confirm_customer_details') {
          this.logger.log(`[VoiceProxyGateway] Customer confirmed/modified details for session ${sessionId}: ${JSON.stringify(msg.data)}`);
          try {
            const clientData = msg.data || {};
            const updates: any = {};
            if (clientData.name) updates.name = clientData.name;
            if (clientData.email) updates.email = clientData.email;
            if (clientData.phone) updates.phone = clientData.phone;
            if (clientData.address) {
              updates.metadata = {
                shippingAddress: clientData.address,
                verifiedAt: new Date(),
              };
            }

            if (session.customerId && this.customersService) {
              await this.customersService.update(businessId, session.customerId, updates).catch((err: any) => {
                this.logger.warn(`[VoiceProxyGateway] Failed to update customer record on confirm: ${err.message}`);
              });
            }

            // Update Redis customer cache
            try {
              const redis = this.redisService.getClient();
              const existing = await redis.get(`session:${sessionId}:customer`);
              const parsed = existing ? JSON.parse(existing) : {};
              if (clientData.name) parsed.name = clientData.name;
              await redis.set(`session:${sessionId}:customer`, JSON.stringify(parsed), 'EX', 86400);
            } catch { }

            sendToClient({
              type: 'customer_details_confirmed',
              success: true,
              data: clientData,
            });

            // Inform Gemini Live session of the verified information
            const summaryParts = [
              clientData.name ? `Name: "${clientData.name}"` : null,
              clientData.email ? `Email: "${clientData.email}"` : null,
              clientData.phone ? `Phone: "${clientData.phone}"` : null,
              clientData.address ? `Address: "${clientData.address}"` : null,
            ].filter(Boolean);

            if (summaryParts.length > 0) {
              sessionControls.sendTextMessage(
                `[SYSTEM_UPDATE: The customer just reviewed and saved their contact details on screen: ${summaryParts.join(', ')}. Keep these details in your memory and answer with them if asked.]`,
              );
            }
          } catch (e: any) {
            this.logger.warn(`[VoiceProxyGateway] Error processing confirmed customer details: ${e.message}`);
          }
          return;
        }

        if (msg.type === 'client_idle_suspend') {
          this.logger.log(`[VoiceProxyGateway] Session ${sessionId} suspended on client idle.`);
          flushBufferedAiText();
          if (session.conversationId) {
            this.conversationsService
              .updateStatus(businessId, session.conversationId, ConversationStatus.SUSPENDED)
              .catch(() => { });
          }

          const rToken = `res_${sessionId}_${Date.now()}`;
          try {
            const redis = this.redisService.getClient();
            await redis.set(
              `conversation:session:${sessionId}:suspended`,
              JSON.stringify({ businessId, suspendedAt: Date.now(), resumptionToken: rToken }),
              'EX',
              86400,
            );
          } catch (e) { }
          sendToClient({ type: 'session_suspended', resumptionToken: rToken });
          cleanup();
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000, 'Session suspended on idle');
          }
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

        if (msg.type === 'user_transcript' && msg.text) {
          const userSpeechText = (msg.text as string).trim();
          // Browser-side speech recognition result — a second independent proof of a live user.
          if (userSpeechText) {
            this.sessionTimerService.markActivity(sessionId);
          }
          if (userSpeechText && session.conversationId) {
            this.conversationsService
              .appendMessage(session.conversationId, MessageRole.USER, userSpeechText)
              .catch((e) => this.logger.warn(`[VoiceProxyGateway] Error saving user transcript: ${e.message}`));
          }
          return;
        }

        if (msg.type === 'audio' && msg.data) {
          session.audioInputBytes += Math.round((msg.data as string).length * 0.75);
          // Protect initial greeting from early mic initialization noise / clicks
          if (session.isGreetingPending && Date.now() - session.greetingDispatchedAt < 600) {
            return;
          }
          sessionControls.sendAudioChunk(msg.data as string);
          // Note: markActivity() is intentionally NOT called on raw audio chunks — they carry
          // background noise and would keep dead sessions alive forever. Activity is marked from
          // recognised speech instead: Gemini's input transcription, the browser's own
          // `user_transcript`, and barge-in interruptions.
        } else if (msg.type === 'text' && msg.text) {
          const userText = (msg.text as string).trim();
          session.promptTokens += Math.ceil(userText.length / 4);
          this.sessionTimerService.markActivity(sessionId);
          if (userText && session.conversationId) {
            this.conversationsService
              .appendMessage(session.conversationId, MessageRole.USER, userText)
              .catch((e) => this.logger.warn(`[VoiceProxyGateway] Error saving user text: ${e.message}`));
          }
          sessionControls.sendTextMessage(userText);
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
