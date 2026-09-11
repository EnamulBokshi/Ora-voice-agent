import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { GeminiVoiceService } from '../ai-voice/gemini-voice.service';
import { SessionTimerService, DEFAULT_SESSION_DURATION_SECONDS } from './session-timer.service';
import { EntitlementService } from '../common/entitlement/entitlement.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private activeVoiceSessions = new Map<
    string,
    {
      sendAudioChunk: (base64Pcm16k: string) => void;
      sendTextMessage: (text: string) => void;
      closeSession: () => void;
    }
  >();
  private readonly closingOnIdleSessions = new Set<string>();

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly geminiVoiceService: GeminiVoiceService,
    private readonly sessionTimerService: SessionTimerService,
    private readonly configService: ConfigService,
      private readonly entitlementService: EntitlementService,
  ) { }

  handleConnection(client: Socket) {
    this.logger.log(`[VoiceGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[VoiceGateway] Client disconnected: ${client.id}`);
    this.closingOnIdleSessions.delete(client.id);
    const session = this.activeVoiceSessions.get(client.id);
    if (session) {
      session.closeSession();
      this.activeVoiceSessions.delete(client.id);
    }
    // Always clear the session timer on disconnect
    this.sessionTimerService.clearTimer(client.id);
  }

  @SubscribeMessage('start-voice-session')
  async handleStartVoiceSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { publishableKey: string; sessionId: string },
  ) {
    const { publishableKey, sessionId } = payload;

    if (!publishableKey || !sessionId) {
      client.emit('voice-error', {
        message: 'publishableKey and sessionId are required.',
      });
      return;
    }

    let business = await this.businessModel
      .findOne({ publishableKey })
      .exec();

    // Fallback to active store if publishable key is not found or is mock/demo
    if (!business) {
      business = await this.businessModel
        .findOne({ status: 'active', publishableKey: { $ne: 'biz_live_mock_key_12345' } })
        .sort({ createdAt: -1 })
        .exec();
    }

    if (!business) {
      business = await this.businessModel
        .findOne({})
        .sort({ createdAt: -1 })
        .exec();
    }

    if (!business) {
      client.emit('voice-error', { message: 'Invalid publishable key. No active store found.' });
      return;
    }

    // Check if store or key is suspended by administration
    if (business.status === 'suspended' || business.keyStatus === 'suspended') {
      this.logger.warn(
        `[VoiceGateway] Connection rejected: key/store suspended for business ${business._id} (${business.name})`,
      );
      client.emit('voice-error', {
        message: 'This publishable key has been suspended by administration. Access denied.',
      });
      return;
    }

    // The storefront agent is the product, so an unpaid tenant must not serve
    // it either. The message stays generic: it reaches a shopper on the
    // merchant's storefront, who is not party to the merchant's billing.
    const entitlement = await this.entitlementService.decide(
      business._id.toString(),
    );
    if (!entitlement.entitled) {
      this.logger.warn(
        `[VoiceGateway] Connection rejected: business ${business._id} (${business.name}) is not entitled (${entitlement.code})`,
      );
      client.emit('voice-error', {
        message: 'The voice agent is not available for this store.',
      });
      return;
    }

    // Check if merchant disabled the storefront widget
    if (business.isWidgetActive === false) {
      this.logger.warn(
        `[VoiceGateway] Connection rejected: widget disabled by merchant for business ${business._id} (${business.name})`,
      );
      client.emit('voice-error', {
        message: 'Storefront widget has been disabled by the store owner.',
      });
      return;
    }

    // Extract connection origin/referer telemetry
    const rawOrigin =
      (client.handshake.headers.origin as string) ||
      (client.handshake.headers.referer as string) ||
      'direct-connection';

    let parsedDomain = 'direct';
    try {
      if (rawOrigin.startsWith('http://') || rawOrigin.startsWith('https://')) {
        parsedDomain = new URL(rawOrigin).hostname;
      } else {
        parsedDomain = rawOrigin;
      }
    } catch {
      parsedDomain = rawOrigin;
    }

    // Determine domain mismatch anomaly
    let isMismatch = false;
    if (business.domain && business.domain.trim().length > 0) {
      const cleanStoreDomain = business.domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
      const cleanOriginDomain = parsedDomain.trim().toLowerCase();
      const isLocalhost =
        cleanOriginDomain === 'localhost' ||
        cleanOriginDomain === '127.0.0.1' ||
        cleanOriginDomain.endsWith('.localhost');

      if (
        !isLocalhost &&
        !cleanOriginDomain.includes(cleanStoreDomain) &&
        !cleanStoreDomain.includes(cleanOriginDomain)
      ) {
        isMismatch = true;
      }
    }

    // Record origin telemetry asynchronously
    this.recordOriginTelemetry(business._id, rawOrigin, parsedDomain, isMismatch);

    const businessId = business._id.toString();

    try {
      const voiceSession = await this.geminiVoiceService.createVoiceSession({
        businessId,
        sessionId,
        onAudioData: (base64AudioPcm: string) => {
          client.emit('audio-stream', {
            sessionId,
            audio: base64AudioPcm,
            mimeType: 'audio/pcm;rate=24000',
          });
        },
        onTextData: (text: string) => {
          client.emit('text-stream', { sessionId, text });
        },
        onToolResult: (toolName: string, result?: any) => {
          client.emit('tool-result', {
            sessionId,
            toolName,
            action: result?.action,
            message: result?.message,
          });
        },
        /**
         * onInputTranscript — fires when Gemini transcribes what the user ACTUALLY SAID.
         * This is the correct idle-reset signal: real speech, not background noise.
         * Raw audio-chunk events are NOT used for idle detection (noise would reset the clock).
         */
        onInputTranscript: (_text: string, isFinal: boolean) => {
          if (isFinal) {
            // User finished a spoken turn — reset idle clock
            this.sessionTimerService.markActivity(client.id);
          }
        },
        /**
         * onTurnComplete — fires when ORA finishes speaking its response.
         * Idle countdown starts AFTER ORA's turn, not while it's mid-response.
         * This prevents false idle timeouts during long ORA replies.
         */
        onTurnComplete: () => {
          this.sessionTimerService.markAgentTurnComplete(client.id);
          if (this.closingOnIdleSessions.has(client.id)) {
            this.closingOnIdleSessions.delete(client.id);
            this.logger.log(`[VoiceGateway] Goodbye turn completed for client ${client.id}. Emitting voice-session-ended.`);
            client.emit('voice-session-ended', {
              sessionId,
              reason: 'idle_timeout',
              message: 'Session closed due to inactivity. Start a new session anytime!',
            });
            setTimeout(() => {
              const s = this.activeVoiceSessions.get(client.id);
              if (s) {
                s.closeSession();
                this.activeVoiceSessions.delete(client.id);
              }
            }, 4000);
          }
        },
        onError: (err) => {
          client.emit('voice-error', { message: err.message || 'Gemini error' });
        },
        onClose: () => {
          client.emit('voice-session-ended', { sessionId });
          this.activeVoiceSessions.delete(client.id);
        },
      });

      this.activeVoiceSessions.set(client.id, voiceSession);

      // Resolve per-merchant session duration limit (or fall back to platform default)
      const defaultDuration =
        this.configService.get<number>('DEFAULT_SESSION_DURATION_SECONDS') ??
        DEFAULT_SESSION_DURATION_SECONDS;
      const sessionDurationSeconds: number =
        typeof business.maxSessionDurationSeconds === 'number' && business.maxSessionDurationSeconds > 0
          ? business.maxSessionDurationSeconds
          : defaultDuration;

      client.emit('voice-session-started', {
        success: true,
        sessionId,
        businessId,
        sessionDurationSeconds,
      });

      // Start session duration timer
      this.sessionTimerService.startTimer(
        client.id,
        sessionId,
        businessId,
        sessionDurationSeconds,
        // onMaxWarning — fires at T-60s of hard session limit
        (remainingSeconds) => {
          client.emit('voice-session-warning', {
            sessionId,
            remainingSeconds,
            message: `Your session will end in ${remainingSeconds} seconds.`,
          });
        },
        // onMaxExpiry — fires at hard session limit (max duration)
        () => {
          const activeSession = this.activeVoiceSessions.get(client.id);
          if (activeSession) {
            activeSession.closeSession();
            this.activeVoiceSessions.delete(client.id);
          }
          client.emit('voice-session-ended', {
            sessionId,
            reason: 'session_time_limit',
            message: 'Session ended: maximum session duration reached.',
          });
        },
        // onIdleWarning — fires after 15s of user silence
        () => {
          client.emit('voice-idle-warning', {
            sessionId,
            message: 'Are you still there? Your session will close in 20 seconds due to inactivity.',
            secondsUntilClose: 20,
          });
          // Also prompt ORA to speak the warning aloud so the user hears it
          const activeSession = this.activeVoiceSessions.get(client.id);
          if (activeSession) {
            try {
              activeSession.sendTextMessage(
                '[SYSTEM_TRIGGER: IDLE_WARNING] The user has been silent for 15 seconds. ' +
                'Ask them warmly and briefly if they are still there in ONE short sentence. Speak aloud now.',
              );
            } catch { /* non-critical */ }
          }
        },
        // onIdleExpiry — fires 20s after the idle warning if user is still silent
        () => {
          const activeSession = this.activeVoiceSessions.get(client.id);
          if (activeSession) {
            this.closingOnIdleSessions.add(client.id);
            this.logger.log(`[VoiceGateway] Idle expiry triggered for client ${client.id}. Requesting spoken goodbye.`);
            try {
              activeSession.sendTextMessage(
                '[SYSTEM_TRIGGER: IDLE_CLOSE] The user did not respond. ' +
                'Say a brief, warm goodbye in ONE short sentence and let them know they can start a new session anytime. Speak aloud now.',
              );
            } catch { /* non-critical */ }

            // Fallback safety timeout
            setTimeout(() => {
              if (this.closingOnIdleSessions.has(client.id)) {
                this.closingOnIdleSessions.delete(client.id);
                const s = this.activeVoiceSessions.get(client.id);
                if (s) {
                  s.closeSession();
                  this.activeVoiceSessions.delete(client.id);
                }
                client.emit('voice-session-ended', {
                  sessionId,
                  reason: 'idle_timeout',
                  message: 'Session closed due to inactivity. Start a new session anytime!',
                });
              }
            }, 15000);
          } else {
            client.emit('voice-session-ended', {
              sessionId,
              reason: 'idle_timeout',
              message: 'Session closed due to inactivity. Start a new session anytime!',
            });
          }
        },
      );

      // Dispatch proactive initial greeting
      try {
        voiceSession.sendTextMessage(
          '[SYSTEM_TRIGGER: GREETING] A visitor just joined the website. Greet them warmly, smoothly, and naturally in English: "Hi! Welcome to ORA. How can I help you today?"',
        );
      } catch (greetErr: any) {
        this.logger.warn(`[VoiceGateway] Greeting trigger notice: ${greetErr.message}`);
      }
    } catch (err: any) {
      this.logger.error(
        `[VoiceGateway] Failed to start voice session: ${err.message}`,
      );
      client.emit('voice-error', { message: err.message });
    }
  }

  @SubscribeMessage('audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { audio: string },
  ) {
    const session = this.activeVoiceSessions.get(client.id);
    if (session && payload.audio) {
      session.sendAudioChunk(payload.audio);
      // NOTE: markActivity() is intentionally NOT called here.
      // Raw audio chunks carry background noise and would reset the idle clock
      // even when the user is silent. Activity is only marked via Gemini's
      // onInputTranscript (user finished speaking) and onTurnComplete (ORA
      // finished responding) — both are semantic speech events, not raw audio.
    }
  }

  @SubscribeMessage('stop-voice-session')
  handleStopVoiceSession(@ConnectedSocket() client: Socket) {
    const session = this.activeVoiceSessions.get(client.id);
    if (session) {
      session.closeSession();
      this.activeVoiceSessions.delete(client.id);
      client.emit('voice-session-ended', { success: true });
    }
    // Clear timer on explicit stop
    this.sessionTimerService.clearTimer(client.id);
  }

  private async recordOriginTelemetry(
    businessId: any,
    origin: string,
    domain: string,
    isMismatch: boolean,
  ) {
    try {
      const business = await this.businessModel.findById(businessId);
      if (!business) return;

      const existingOrigins = business.detectedOrigins || [];
      const existingIndex = existingOrigins.findIndex(
        (o) => o.domain === domain || o.origin === origin,
      );

      if (existingIndex >= 0) {
        existingOrigins[existingIndex].lastSeen = new Date();
        existingOrigins[existingIndex].sessionCount =
          (existingOrigins[existingIndex].sessionCount || 1) + 1;
        existingOrigins[existingIndex].isMismatch = isMismatch;
      } else {
        if (existingOrigins.length >= 20) {
          existingOrigins.shift();
        }
        existingOrigins.push({
          origin,
          domain,
          lastSeen: new Date(),
          sessionCount: 1,
          isMismatch,
        });
      }

      await this.businessModel.updateOne(
        { _id: businessId },
        { $set: { detectedOrigins: existingOrigins } },
      );
    } catch (err: any) {
      this.logger.warn(`[VoiceGateway] Origin telemetry error: ${err.message}`);
    }
  }
}
