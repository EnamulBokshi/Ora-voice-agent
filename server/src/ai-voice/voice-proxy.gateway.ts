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
import { AiToolsExecutor } from './tools/ai-tools.executor';
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
  AGENT_SPEAKING_MAX_MS,
} from '../gateway/session-timer.service';

/**
 * How long a session survives with no browser attached to it.
 *
 * A storefront is a multi-page app: clicking a product link unloads the document and
 * destroys the WebSocket with it. That is not recoverable — no browser API keeps a
 * socket across a navigation — but the session behind it does not have to die with it.
 * The expensive half of a voice session is the socket to Gemini, which is server to
 * Google and entirely unaffected by what the customer's browser is doing, and it holds
 * the whole conversation's context window.
 *
 * So a disconnect parks the session instead of ending it. A reload that returns within
 * this window rebinds to the SAME Gemini session and the customer carries on mid
 * conversation; past it, the session is cleaned up for real.
 *
 * Sized for a page load, not for a visit. Longer would hold a Gemini socket open for a
 * customer who has closed the tab, which counts against the concurrency limit.
 */
const SESSION_PARK_GRACE_MS = 30_000;

interface ProxySession {
  /**
   * The browser currently attached, or null while parked between page loads.
   * Everything that writes to the client must go through sendToClient, which reads
   * this field, so a rebind reaches the closures created for the previous page.
   */
  clientWs: WebSocket | null;
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
  /** True from the first audio frame of a turn until Gemini reports turnComplete. */
  isAgentSpeaking: boolean;
  /**
   * Bytes of Gemini output audio streamed during the current agent turn. Used only to
   * size the playback-acknowledgement fallback below: Gemini generates far faster than
   * real time, so the byte count is the only estimate available of how long the client
   * will still be speaking after the generation itself has finished.
   */
  turnAudioBytes: number;
  /**
   * Fallback for the client's `audio_playback_complete` acknowledgement. A widget
   * bundle older than that message will never send one, so the turn must still be able
   * to complete on its own.
   */
  playbackAckTimer: NodeJS.Timeout | null;
  /** True while no browser is attached and the grace window has not yet expired. */
  isParked: boolean;
  /** Fires at the end of the grace window and cleans the session up for real. */
  parkTimer: NodeJS.Timeout | null;
  /**
   * Binds a freshly connected browser to this session: re-registers the message,
   * close and error handlers on the new socket. Held on the session because the
   * connection that adopts it is a different invocation of handleConnection with no
   * access to the original closure.
   */
  attachClient: ((ws: WebSocket) => void) | null;
  /**
   * The device that owns this session. A session id is client-supplied, so adoption is
   * bound to the device that created it — otherwise a guessed id would hand a stranger
   * someone else's live conversation.
   */
  deviceId: string;
  /**
   * True only between Gemini finishing generation and the turn actually ending.
   *
   * The acknowledgement it gates arrives from the browser, so it is untrusted input:
   * without this, a client that sent it repeatedly would refresh `lastActivityAt` on
   * every message and disable idle detection for the whole session. One turn, one
   * acknowledgement.
   */
  awaitingPlaybackAck: boolean;
  /**
   * True immediately after navigate_to_page executes until turnComplete.
   * Suppresses redundant post-navigation speech (e.g. "Navigating to...")
   * because the spoken announcement was already delivered before the tool call.
   */
  suppressPostNavSpeech: boolean;
  /**
   * A browsing-context update that arrived while ORA was mid-sentence. Sending
   * it straight through would reach Gemini as a user turn and cancel the
   * in-flight audio, so it waits here and is flushed on turn completion. Only
   * the newest one is kept — the visitor's current page is all that matters.
   */
  pendingContextUpdate: ClientBrowsingContext | null;
  /** Safety net so a held update is not lost if turnComplete never arrives. */
  pendingContextTimer: NodeJS.Timeout | null;
  userId?: string;
  authenticatedUser?: { id: string; name: string; email: string; role: string; businessId?: string };
  sessionMode?: 'customer' | 'training';
  silentMode?: boolean;
}

/** Where the visitor is on the host site, as reported by the widget. */
interface ClientBrowsingContext {
  currentPath?: string;
  title?: string;
  history?: string[];
  activeSection?: string;
  product?: any;
  selectedVariantId?: string;
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
    private readonly aiToolsExecutor: AiToolsExecutor,
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
   * Invalidate in-memory cached user mapping.
   * If userId is provided, that user's cache is purged and any active sessions are updated in real-time.
   * If not, all cached users are cleared.
   */
  invalidateUserCache(userId?: string, newName?: string): void {
    if (userId) {
      this.userCache.delete(userId);
      this.logger.log(`[VoiceProxyGateway] In-memory cache invalidated for user: ${userId}`);

      // Push real-time update to any active sessions belonging to this user
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.userId === userId || session.authenticatedUser?.id === userId) {
          if (newName) {
            if (session.authenticatedUser) {
              session.authenticatedUser.name = newName;
            }

            // 1. Update Redis session customer entry so subsequent turns/tools read the new name
            try {
              const redis = this.redisService.getClient();
              redis
                .get(`session:${sessionId}:customer`)
                .then((raw) => {
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.name = newName;
                    return redis.set(`session:${sessionId}:customer`, JSON.stringify(parsed), 'EX', 86400);
                  }
                })
                .catch(() => {});
            } catch {}

            // 2. Notify Gemini Live model without triggering speech
            try {
              session.sessionControls?.sendContextUpdate?.({
                title: `Visitor profile updated: Name is now "${newName}". Call the user "${newName}".`,
              });
            } catch {}

            // 3. Notify client WebSocket that profile has been updated
            try {
              if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
                session.clientWs.send(
                  JSON.stringify({
                    type: 'user_updated',
                    user: session.authenticatedUser,
                  }),
                );
              }
            } catch {}
          }
        }
      }
    } else {
      this.userCache.clear();
      this.logger.log('[VoiceProxyGateway] All cached users cleared.');
    }
  }

  /**
   * Invalidate in-memory cached business mapping by businessId.
   */
  invalidateBusinessCache(businessId?: string): void {
    if (businessId) {
      for (const [key, val] of this.businessCache.entries()) {
        if (val.businessId === businessId) {
          this.businessCache.delete(key);
        }
      }
      this.logger.log(`[VoiceProxyGateway] Cache invalidated for business: ${businessId}`);
    } else {
      this.businessCache.clear();
      this.logger.log('[VoiceProxyGateway] All cached business entries cleared.');
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
        if (session.parkTimer) {
          clearTimeout(session.parkTimer);
          session.parkTimer = null;
        }
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
      // Fire-and-forget — handleConnection reports its own failures and never rejects.
      void this.handleConnection(clientWs, request);
    });

    this.logger.log('[VoiceProxyGateway] ✅ WebSocket proxy mounted at /ws/voice');
  }

  /**
   * Establishes one customer connection, and guarantees an answer either way.
   *
   * Every step of establishSession awaits something that can fail — Mongo lookups, the
   * Redis session binding, customer resolution, the Gemini connect. A rejection used to
   * be logged and nothing else, which left the browser holding an open socket that
   * would never say anything. The widget has no way to tell a server that is still
   * working from one that has given up, so it sat on "Connecting…" indefinitely and,
   * because its orb ignores taps in that state, could not be used again without a page
   * reload. Whatever goes wrong, the customer is told and the socket is closed.
   */
  private async handleConnection(
    clientWs: WebSocket,
    request: http.IncomingMessage,
  ): Promise<void> {
    try {
      await this.establishSession(clientWs, request);
    } catch (err: any) {
      this.logger.error(
        `[VoiceProxyGateway] Connection setup failed: ${err?.message}`,
        err?.stack,
      );
      try {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'error',
              message: 'Voice session could not be started. Please try again.',
            }),
          );
          clientWs.close(1011, 'Connection setup failed');
        }
      } catch {}

      // A throw late in setup can land after the session is already registered. Left
      // behind it would hold a Gemini socket against the concurrency quota with no
      // browser attached and, if the throw came from starting its timers, nothing that
      // would ever reclaim it.
      try {
        const failedSessionId = url.parse(request.url || '', true).query.sessionId as string;
        const orphan = failedSessionId ? this.sessions.get(failedSessionId) : undefined;
        if (orphan && orphan.clientWs === clientWs) {
          orphan.closed = true;
          if (orphan.parkTimer) {
            clearTimeout(orphan.parkTimer);
            orphan.parkTimer = null;
          }
          orphan.sessionControls?.closeSession();
          this.sessions.delete(failedSessionId);
          this.sessionTimerService.clearTimer(failedSessionId);
          this.logger.warn(
            `[VoiceProxyGateway] Discarded partially built session ${failedSessionId}.`,
          );
        }
      } catch {}
    }
  }

  private async establishSession(
    clientWs: WebSocket,
    request: http.IncomingMessage,
  ): Promise<void> {
    const parsedUrl = url.parse(request.url || '', true);
    const publishableKey = parsedUrl.query.publishableKey as string;
    const sessionId = parsedUrl.query.sessionId as string;

    /**
     * The session this connection ends up owning, once it exists.
     *
     * sendToClient reads the socket through it rather than closing over `clientWs`, so
     * every writer created for this page — the Gemini callbacks in particular — follows
     * the session when a later page load rebinds it to a new socket. Before the session
     * exists (parameter validation, auth failures) it falls back to the raw socket.
     */
    let boundSession: ProxySession | null = null;

    const sendToClient = (data: object) => {
      const target = boundSession ? boundSession.clientWs : clientWs;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify(data));
      }
    };

    /**
     * True once the browser has gone away, whether or not a session exists yet.
     *
     * Setting up a session is a long sequence of awaits, and the real close and error
     * handlers are not registered until the end of it, so for the whole of that window
     * the socket had nothing listening. A customer who gave up and navigated away mid
     * setup was therefore never noticed: the session was built anyway, registered, and
     * left holding a Gemini socket against the concurrency quota until its idle timer
     * eventually expired. An 'error' emitted in that window was worse — with no
     * listener, Node's EventEmitter throws it rather than delivering it.
     *
     * These are provisional: attachClient replaces them with the real handlers, which
     * park rather than abandon.
     */
    let clientGone = false;
    const onSetupClose = () => {
      clientGone = true;
    };
    const onSetupError = (err: Error) => {
      clientGone = true;
      this.logger.warn(
        `[VoiceProxyGateway] Client socket error during setup for session ${sessionId}: ${err.message}`,
      );
    };
    clientWs.on('close', onSetupClose);
    clientWs.on('error', onSetupError);

    /** Hands the socket over from the provisional handlers to the session's own. */
    const releaseSetupHandlers = () => {
      clientWs.off('close', onSetupClose);
      clientWs.off('error', onSetupError);
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
          adminUserId: authenticatedUser?.id,
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
    const sessionModeParam = parsedUrl.query.sessionMode as string;
    const sessionMode: 'customer' | 'training' = sessionModeParam === 'training' ? 'training' : 'customer';
    const silentMode = parsedUrl.query.silentMode === 'true';

    const initialClientContext: ClientBrowsingContext = {
      currentPath: currentPathParam,
      title: pageTitleParam,
      history: historyParam ? historyParam.split(',') : [currentPathParam],
      activeSection: activeSectionParam,
    };

    if (this.redisService) {
      this.redisService
        .getClient()
        .set(`session:${sessionId}:context`, JSON.stringify(initialClientContext), 'EX', 24 * 60 * 60)
        .catch(() => {});
    }

    // ── Adopt a parked session, or replace a live one ────────────────────────
    const existingSession = this.sessions.get(sessionId);

    if (
      existingSession &&
      existingSession.isParked &&
      !existingSession.closed &&
      existingSession.businessId === businessId &&
      existingSession.deviceId === (deviceIdParam || '') &&
      existingSession.attachClient
    ) {
      // The customer clicked a link and the browser rebuilt itself. The Gemini session
      // behind this one never closed, so the whole conversation — the model's context
      // window included — is still here. Rebind and carry on: no new Gemini session, no
      // new conversation record, and above all no second greeting.
      if (existingSession.parkTimer) {
        clearTimeout(existingSession.parkTimer);
        existingSession.parkTimer = null;
      }
      existingSession.isParked = false;
      existingSession.clientWs = clientWs;
      releaseSetupHandlers();
      existingSession.attachClient(clientWs);

      this.logger.log(
        `[VoiceProxyGateway] 🔄 Rebound parked session ${sessionId} to a new page (${currentPathParam}).`,
      );

      sendToClient({ type: 'session_resumed', sessionId });

      // Tell ORA where the customer now is. Routed through the same queue a mid-sentence
      // context update uses, so it cannot land as a user turn and cancel in-flight audio.
      try {
        existingSession.sessionControls?.sendContextUpdate(initialClientContext);
      } catch (err: any) {
        this.logger.warn(`[VoiceProxyGateway] Rebind context update notice: ${err.message}`);
      }

      return;
    }

    if (existingSession) {
      this.logger.log(`[VoiceProxyGateway] Cleaning up previous session with same sessionId: ${sessionId}`);
      try {
        existingSession.closed = true;
        if (existingSession.parkTimer) {
          clearTimeout(existingSession.parkTimer);
          existingSession.parkTimer = null;
        }
        existingSession.sessionControls?.closeSession();
        if (existingSession.clientWs && existingSession.clientWs.readyState === WebSocket.OPEN) {
          existingSession.clientWs.close(1000, 'Replaced by new session');
        }
      } catch { }
      this.sessions.delete(sessionId);
      this.sessionTimerService.clearTimer(sessionId);
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
      isParked: false,
      parkTimer: null,
      attachClient: null,
      deviceId: deviceIdParam || '',
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
      isAgentSpeaking: false,
      turnAudioBytes: 0,
      playbackAckTimer: null,
      awaitingPlaybackAck: false,
      suppressPostNavSpeech: false,
      pendingContextUpdate: null,
      pendingContextTimer: null,
      userId: authenticatedUser?.id,
      authenticatedUser,
      sessionMode,
      silentMode,
    };

    boundSession = session;

    /**
     * Closes whichever browser is attached right now.
     *
     * Session-ending paths must not close over the socket they were created with: after
     * a page navigation that socket is a dead object belonging to a page that no longer
     * exists, and the customer sitting on the new page would never be told the session
     * had ended.
     */
    const closeClient = (code: number, reason: string) => {
      const target = session.clientWs;
      if (target && target.readyState === WebSocket.OPEN) {
        target.close(code, reason);
      }
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

    /**
     * Deliver a browsing-context update that was held back during a turn. Safe
     * to call unconditionally: it is a no-op when nothing is pending.
     */
    const flushPendingContextUpdate = () => {
      if (session.pendingContextTimer) {
        clearTimeout(session.pendingContextTimer);
        session.pendingContextTimer = null;
      }
      if (session.playbackAckTimer) {
        clearTimeout(session.playbackAckTimer);
        session.playbackAckTimer = null;
      }
      const pending = session.pendingContextUpdate;
      if (!pending || session.closed) return;
      session.pendingContextUpdate = null;
      try {
        session.sessionControls?.sendContextUpdate(pending);
      } catch (e: any) {
        this.logger.warn(
          `[VoiceProxyGateway] Deferred context update failed for session ${sessionId}: ${e.message}`,
        );
      }
    };

    const cleanup = () => {
      if (session.closed) return;
      session.closed = true;
      if (session.pendingContextTimer) {
        clearTimeout(session.pendingContextTimer);
        session.pendingContextTimer = null;
      }
      if (session.playbackAckTimer) {
        clearTimeout(session.playbackAckTimer);
        session.playbackAckTimer = null;
      }
      session.awaitingPlaybackAck = false;
      if (session.parkTimer) {
        clearTimeout(session.parkTimer);
        session.parkTimer = null;
      }
      session.isParked = false;
      session.attachClient = null;
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
          this.configService.get<string>('GEMINI_LIVE_MODEL')?.replace('models/', '') ||
          process.env.GEMINI_MODEL?.replace('models/', '') ||
          process.env.GEMINI_LIVE_MODEL?.replace('models/', '') ||
          'gemini-3.1-flash-live-preview';

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
        this.redisService.getClient().del(`session:${sessionId}:greeted`).catch(() => {});
      } catch {}
      try {
        session.sessionControls?.closeSession();
      } catch { }
      this.logger.log(`[VoiceProxyGateway] Session ${sessionId} cleaned up.`);
    };

    /**
     * Ends the agent's turn as far as idle detection is concerned.
     *
     * Deliberately NOT called from Gemini's `turnComplete`. Gemini finishes generating a
     * 15-second answer in two or three seconds, but the customer is still listening to
     * it for the full fifteen — and the widget holds the mic uplink shut for every one
     * of those seconds, so they cannot produce activity even if they speak. Starting the
     * idle countdown at generation time therefore spent most of the customer's silence
     * budget before they had a chance to say anything, which is what made ORA interrupt
     * its own long answers to ask whether they were still there.
     *
     * The turn now ends when the client reports its WebAudio queue has drained.
     */
    const completeAgentTurn = (reason: 'playback_ack' | 'fallback' | 'interrupted') => {
      // A barge-in ends whatever is in flight; everything else must be answering an
      // outstanding turn. A repeated or unsolicited acknowledgement is dropped here.
      if (reason !== 'interrupted' && !session.awaitingPlaybackAck) return;

      session.awaitingPlaybackAck = false;
      if (session.playbackAckTimer) {
        clearTimeout(session.playbackAckTimer);
        session.playbackAckTimer = null;
      }
      session.turnAudioBytes = 0;
      this.sessionTimerService.markAgentTurnComplete(sessionId);
      if (reason === 'fallback') {
        this.logger.debug(
          `[VoiceProxyGateway] Playback acknowledgement never arrived for session ${sessionId}; ending turn on fallback.`,
        );
      }
    };

    /**
     * Arms the fallback that ends the turn if no `audio_playback_complete` arrives.
     *
     * Sized from the audio actually streamed this turn (Gemini Live output is 24 kHz
     * mono PCM16, so 48000 bytes per second of speech) plus a margin for network and
     * jitter buffering, rather than a flat constant that would be far too short for a
     * long answer and far too long for a one-word one.
     */
    const armPlaybackAckFallback = () => {
      if (session.playbackAckTimer) clearTimeout(session.playbackAckTimer);
      session.awaitingPlaybackAck = true;
      const estimatedPlaybackMs = (session.turnAudioBytes / 48000) * 1000;
      const fallbackMs = Math.min(
        AGENT_SPEAKING_MAX_MS,
        Math.max(5_000, estimatedPlaybackMs + 8_000),
      );
      session.playbackAckTimer = setTimeout(
        () => completeAgentTurn('fallback'),
        fallbackMs,
      );
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
        sessionMode,

        // Google → client: audio response
        onAudioData: (base64AudioPcm) => {
          if (session.suppressPostNavSpeech || session.silentMode) {
            return;
          }
          session.isGreetingPending = false;
          session.isAgentSpeaking = true;
          if (base64AudioPcm) {
            const decodedBytes = Math.round(base64AudioPcm.length * 0.75);
            session.audioOutputBytes += decodedBytes;
            session.turnAudioBytes += decodedBytes;
          }
          // ORA is talking — suppress the idle warning until this turn completes,
          // so a long answer can never be interrupted by "are you still there?".
          this.sessionTimerService.markAgentSpeaking(sessionId);
          sendToClient({ type: 'audio', data: base64AudioPcm });
        },

        // Google → client: text transcript
        onTextData: (text) => {
          if (session.suppressPostNavSpeech) {
            return;
          }
          if (!session.silentMode) {
            sendToClient({ type: 'text', text });
          }
          const clean = (text || '').trim();
          if (clean && !clean.startsWith('**') && !clean.startsWith('#')) {
            session.bufferedAiText = (session.bufferedAiText ? session.bufferedAiText + ' ' : '') + clean;
          }
        },

        // Google → client: barge-in / interruption
        onInterrupted: () => {
          session.suppressPostNavSpeech = false;
          // Prevent early false barge-in during initial greeting startup
          if (session.isGreetingPending && Date.now() - session.greetingDispatchedAt < 1200) {
            return;
          }
          sendToClient({ type: 'interrupted' });
          // A barge-in is undeniable proof of a live user, and it also ends ORA's turn.
          session.isAgentSpeaking = false;
          // A barge-in stops playback on the client too, so there is no queue left to
          // wait on — end the turn now rather than on an acknowledgement that the
          // client will never send for this turn.
          completeAgentTurn('interrupted');
          this.sessionTimerService.markActivity(sessionId);
          flushBufferedUserText(); // user spoke again; save whatever they said before the barge-in
          flushBufferedAiText();
          flushPendingContextUpdate();
        },

        // Google → client: agent finished speaking
        onTurnComplete: () => {
          session.suppressPostNavSpeech = false;
          session.isGreetingPending = false;
          session.isAgentSpeaking = false;
          sendToClient({ type: 'turn_complete' });
          flushPendingContextUpdate();
          flushBufferedUserText(); // safety flush: user utterance must be complete by now
          flushBufferedAiText();
          // Generation is done; the customer is still listening. The idle countdown
          // starts when the widget acknowledges that playback has drained.
          armPlaybackAckFallback();

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
              closeClient(1000, 'Idle timeout completed');
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
          sendToClient({ type: 'user_transcript', text: text.trim(), isFinal });
          if (isFinal) {
            flushBufferedUserText();
          }
        },

        // Server-side ORA output transcription — Gemini reads back its own synthesised audio as text.
        // This is the ONLY source of ORA’s spoken text when responseModalities=[AUDIO].
        // Fragments are buffered into bufferedAiText; isFinal=true or onTurnComplete triggers the DB write.
        onOutputTranscript: (text, isFinal) => {
          if (session.suppressPostNavSpeech || !text.trim()) return;
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
          closeClient(1011, 'Google session error');
        },

        // Google WS closed (post-setup)
        onClose: () => {
          this.logger.log(`[VoiceProxyGateway] Google WS closed for session ${sessionId}`);
          sendToClient({ type: 'session_closed' });
          cleanup();
          closeClient(1000, 'Session ended');
        },
      });
    } catch (err: any) {
      this.logger.error(
        `[VoiceProxyGateway] Failed to establish Google session for ${sessionId}: ${err.message}`,
      );
      const isDepleted =
        err.message?.includes('depleted') ||
        err.message?.includes('credits') ||
        err.message?.includes('quota') ||
        err.message?.includes('1011');
      const clientMessage = isDepleted
        ? 'Voice service is currently undergoing provider capacity maintenance. Please try again shortly.'
        : err.message || 'Failed to connect to AI service.';
      sendToClient({ type: 'error', message: clientMessage });
      clientWs.close(1011, 'Session setup failed');
      return;
    }

    // ── Abort if the customer left while the session was being built ─────────
    // Registering it now would leave a session nobody is attached to holding an open
    // Gemini socket against the concurrency quota, reachable only by its idle timer.
    if (clientGone) {
      this.logger.log(
        `[VoiceProxyGateway] Client left during setup for session ${sessionId} — discarding it.`,
      );
      releaseSetupHandlers();
      try {
        sessionControls.closeSession();
      } catch {}
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
        closeClient(1000, 'Session time limit reached');
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
            closeClient(1000, 'Idle timeout fallback');
          }
        }, 15000);
      },
    );

    const skipGreetingParam = parsedUrl.query.skipGreeting === 'true';
    const returningVisitorParam = parsedUrl.query.returningVisitor === 'true';

    /**
     * Whether this session has already been greeted, tracked server-side.
     *
     * `skipGreeting` alone is not enough. It is set by the widget from its own
     * sessionStorage, which a hard reload can lose, an opened-in-new-tab link never
     * has, and a restored bfcache page may disagree about — and every one of those
     * cases reconnects with the SAME sessionId, so the customer would be greeted
     * again mid-conversation. The session id is the thing that actually defines "this
     * conversation", so the flag belongs next to it.
     *
     * 24h TTL: past that the id is a dead conversation, and a greeting is correct again.
     */
    const greetedKey = `session:${sessionId}:greeted`;
    let alreadyGreeted = false;
    try {
      alreadyGreeted = (await this.redisService.getClient().get(greetedKey)) === '1';
    } catch (err: any) {
      // Redis unavailable — fall back to the client's own claim rather than failing the
      // connection. Worst case is a repeated greeting, not a broken session.
      this.logger.warn(`[VoiceProxyGateway] Greeting-state read notice: ${err.message}`);
    }

    // ── Dispatch Proactive Initial Greeting on Voice Connection ─────────────
    if (!skipGreetingParam && !alreadyGreeted && !silentMode) {
      try {
        session.isGreetingPending = true;
        session.greetingDispatchedAt = Date.now();

        let greetingTrigger = '';
        if (sessionMode === 'training') {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] Merchant training mode activated. This is ${authenticatedUser?.name || 'the store owner'}. Greet them warmly in ONE short sentence: "Hello ${authenticatedUser?.name || ''}! I'm ORA, and I'm ready in training mode. What would you like to teach me?". Speak aloud now.`;
        } else if (authenticatedUser) {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] Visitor connected. This is ${authenticatedUser.name || 'a merchant'}, an authenticated ${authenticatedUser.role || 'user'}. Greet them warmly in ONE concise sentence introducing yourself as ORA (e.g. "Hello ${authenticatedUser.name || ''}! I'm ORA. How can I help you today?"). Speak aloud now.`;
        } else if (!isUserAnon && resolvedName && resolvedName !== 'Guest Shopper' && resolvedName !== 'Guest Visitor') {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] Visitor connected. Name: ${resolvedName}. Greet them warmly in ONE concise sentence introducing yourself as ORA (e.g. "Hi ${resolvedName}! I'm ORA. How can I help you today?"). Speak aloud now.`;
        } else if (returningVisitorParam) {
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] A returning visitor reconnected in a new conversation. Greet them warmly in ONE short sentence introducing yourself (e.g. "Hello again! I'm ORA. Great to have you back. How can I help you today?"). Speak aloud now.`;
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
          greetingTrigger = `[SYSTEM_TRIGGER: GREETING_INITIALIZATION] New visitor connected${pageContextNote}. Speak first in ONE short, friendly sentence introducing yourself as ORA (e.g. "Hi! I'm ORA. How can I help you today?"). Speak aloud now.`;
        }

        this.logger.log(
          `[VoiceProxyGateway] 🎙️ Dispatching initial greeting trigger (${sessionMode}) for session ${sessionId}`,
        );
        sessionControls.sendTextMessage(greetingTrigger);

        // Recorded immediately, not on turn completion: a reconnect racing the greeting
        // must find the flag already set, or it greets over the top of it.
        this.redisService
          .getClient()
          .set(greetedKey, '1', 'EX', 86400)
          .catch(() => { });
      } catch (greetErr: any) {
        this.logger.warn(
          `[VoiceProxyGateway] Greeting trigger notice for session ${sessionId}: ${greetErr.message}`,
        );
      }
    }

    /**
     * Parks the session when the browser goes away, rather than ending it.
     *
     * See SESSION_PARK_GRACE_MS. A close here is far more often a page navigation than
     * a customer leaving, and the two are indistinguishable at this layer — so assume
     * the recoverable one and let the grace timer settle the argument.
     */
    const parkClient = () => {
      if (session.closed || session.isParked) return;

      session.isParked = true;
      session.clientWs = null;

      // Any audio still being generated has nowhere to play. End the turn so idle
      // detection is not left waiting on a playback acknowledgement that cannot come.
      // markAgentTurnComplete is called directly as well as through completeAgentTurn:
      // the latter no-ops when the turn was still generating rather than awaiting an
      // acknowledgement, which would leave the timer's agent-speaking flag stuck set.
      session.isAgentSpeaking = false;
      completeAgentTurn('fallback');
      this.sessionTimerService.markAgentTurnComplete(sessionId);

      session.parkTimer = setTimeout(() => {
        session.parkTimer = null;
        if (session.closed || !session.isParked) return;
        this.logger.log(
          `[VoiceProxyGateway] Parked session ${sessionId} not reclaimed within ${SESSION_PARK_GRACE_MS / 1000}s — closing.`,
        );
        cleanup();
      }, SESSION_PARK_GRACE_MS);

      this.logger.log(
        `[VoiceProxyGateway] Session ${sessionId} parked; holding its Gemini session for ${SESSION_PARK_GRACE_MS / 1000}s.`,
      );
    };

    // ── Route incoming messages from client → Google ──────────────────────────
    const attachClient = (ws: WebSocket) => {
    ws.on('message', async (data: WebSocket.Data) => {
      if (session.closed) return;
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'end_session') {
          // The customer tapped stop. A bare socket close is indistinguishable from a
          // page navigation and is therefore parked, but this is not ambiguous: the
          // conversation is over, so end it now rather than holding its Gemini session
          // open for the rest of the grace window.
          this.logger.log(
            `[VoiceProxyGateway] Session ${sessionId} ended at the client's request.`,
          );
          cleanup();
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Ended by client');
          }
          return;
        }

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

        if (msg.type === 'cart_sync') {
          // If the storefront cart accepted the item, no correction is needed.
          if (msg.ok === true) return;

          // On failure (e.g. sold out, unavailable), reconcile ORA's cart and inform the model
          try {
            const correction = await this.aiToolsExecutor.syncStorefrontCart(
              session.businessId,
              sessionId,
              {
                ok: false,
                variantId: msg.variantId,
                productId: msg.productId,
                reason: msg.reason,
              },
            );
            if (correction) {
              sessionControls.sendTextMessage(correction);
            }
          } catch (e: any) {
            this.logger.warn(`[VoiceProxyGateway] Cart sync reconciliation failed for ${sessionId}: ${e.message}`);
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
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Session suspended on idle');
          }
          return;
        }

        if (msg.type === 'client_context_update') {
          this.logger.log(`[VoiceProxyGateway] Context update for session ${sessionId}: page="${msg.currentPath || '/'}" title="${msg.title || ''}"`);
          // Gemini Live treats any client turn as a barge-in, so an update sent
          // while ORA is speaking cuts her off mid-sentence. Hold it until the
          // turn ends; the visitor's page is still current a second later.
          const context: ClientBrowsingContext = {
            currentPath: msg.currentPath,
            title: msg.title,
            history: msg.history,
            activeSection: msg.activeSection,
            product: msg.product,
            selectedVariantId: msg.selectedVariantId,
          };
          if (this.redisService) {
            this.redisService
              .getClient()
              .set(`session:${sessionId}:context`, JSON.stringify(context), 'EX', 24 * 60 * 60)
              .catch(() => {});
          }
          if (session.isAgentSpeaking) {
            session.pendingContextUpdate = context;
            // Gemini does not always emit turnComplete (a dropped or truncated
            // turn), so re-check instead of trusting it alone. After a few
            // tries the update is dropped rather than forced through: ORA not
            // knowing the current page is a far smaller fault than ORA being
            // cut off mid-sentence, which is what forcing it would cause.
            if (!session.pendingContextTimer) {
              let attemptsLeft = 5;
              const recheck = () => {
                session.pendingContextTimer = null;
                if (session.closed || !session.pendingContextUpdate) return;
                if (session.isAgentSpeaking) {
                  if (--attemptsLeft <= 0) {
                    this.logger.debug(
                      `[VoiceProxyGateway] Dropping held context update for session ${sessionId}; turn never completed.`,
                    );
                    session.pendingContextUpdate = null;
                    return;
                  }
                  session.pendingContextTimer = setTimeout(recheck, 2000);
                  return;
                }
                flushPendingContextUpdate();
              };
              session.pendingContextTimer = setTimeout(recheck, 2000);
            }
            return;
          }
          sessionControls.sendContextUpdate(context);
          return;
        }

        if (msg.type === 'audio_playback_complete') {
          // The widget's WebAudio queue has drained — ORA has now finished speaking in
          // the customer's ear, which is the only moment from which their silence can
          // fairly be measured. See completeAgentTurn().
          completeAgentTurn('playback_ack');
          return;
        }

        if (msg.type === 'user_speaking') {
          // The widget's own noise gate has opened on sustained speech. Raw audio frames
          // still do not count as activity (they carry room noise, and would keep an
          // abandoned session alive forever), but a gate that has held open past its
          // onset requirement is a different signal: it is the widget asserting that it
          // is looking at speech, not noise. It is the only activity source that survives
          // when Gemini's transcription is slow and the browser has no SpeechRecognition,
          // which is the combination that let sessions close on a talking customer.
          this.sessionTimerService.markActivity(sessionId);
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
    ws.on('close', () => {
      // Only the socket that is currently bound may park the session. A stale handler
      // from a previous page fires its close event AFTER the new page has already been
      // adopted, and must not park the live conversation out from under it.
      if (session.clientWs !== ws) return;
      this.logger.log(`[VoiceProxyGateway] Client disconnected for session ${sessionId}`);
      parkClient();
    });

    ws.on('error', (err) => {
      this.logger.error(
        `[VoiceProxyGateway] Client WS error for session ${sessionId}: ${err.message}`,
      );
      if (session.clientWs !== ws) return;
      parkClient();
    });
    };

    session.attachClient = attachClient;
    releaseSetupHandlers();
    attachClient(clientWs);
  }

  /** For health checks / monitoring */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
