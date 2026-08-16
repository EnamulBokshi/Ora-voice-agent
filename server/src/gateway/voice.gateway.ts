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

    const business = await this.businessModel
      .findOne({ publishableKey, status: 'active' })
      .exec();

    if (!business) {
      this.logger.warn(
        `[VoiceGateway] Connection rejected: invalid or inactive publishable key '${publishableKey}' for session ${sessionId}`,
      );
      client.emit('voice-error', {
        message: 'Invalid or inactive publishable key. Access denied.',
      });
      return;
    }

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
}
