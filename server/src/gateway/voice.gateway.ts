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
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { GeminiVoiceService } from '../ai-voice/gemini-voice.service';

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

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly geminiVoiceService: GeminiVoiceService,
  ) { }

  handleConnection(client: Socket) {
    this.logger.log(`[VoiceGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[VoiceGateway] Client disconnected: ${client.id}`);
    const session = this.activeVoiceSessions.get(client.id);
    if (session) {
      session.closeSession();
      this.activeVoiceSessions.delete(client.id);
    }
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
        onError: (err) => {
          client.emit('voice-error', { message: err.message || 'Gemini error' });
        },
        onClose: () => {
          client.emit('voice-session-ended', { sessionId });
          this.activeVoiceSessions.delete(client.id);
        },
      });

      this.activeVoiceSessions.set(client.id, voiceSession);

      client.emit('voice-session-started', {
        success: true,
        sessionId,
        businessId,
      });
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
