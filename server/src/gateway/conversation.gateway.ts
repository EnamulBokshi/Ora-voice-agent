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
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/schemas/message.schema';
import { ConversationStatus } from '../conversations/schemas/conversation.schema';
import { AiToolsExecutor } from '../ai-voice/tools/ai-tools.executor';
import { RedisService } from '../common/redis/redis.service';
import {
  SessionTimerService,
  DEFAULT_SESSION_DURATION_SECONDS,
  IDLE_TERMINATE_SECONDS,
} from './session-timer.service';
import { EntitlementService } from '../common/entitlement/entitlement.service';

/**
 * Fix 2 — Verification Parity:
 * ConversationGateway (text chat) now routes product lookups through the same
 * AiToolsExecutor.handleFindProducts path used by VoiceGateway, ensuring that
 * every price/stock value surfaced to a customer is live-verified via
 * ProductsService.verifyLive() — never stale RAG data.
 *
 * The RagService is no longer called directly from here; it is invoked
 * internally by AiToolsExecutor → RagService → ProductsService.verifyLive().
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'conversations',
})
export class ConversationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationGateway.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly conversationsService: ConversationsService,
    private readonly aiToolsExecutor: AiToolsExecutor,
    private readonly redisService: RedisService,
    private readonly sessionTimerService: SessionTimerService,
    private readonly configService: ConfigService,
    private readonly entitlementService: EntitlementService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);
    // Always clear the session timer on disconnect
    this.sessionTimerService.clearTimer(client.id);
  }

  @SubscribeMessage('init-session')
  async handleInitSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { publishableKey: string; sessionId: string; channel?: any },
  ) {
    const { publishableKey, sessionId, channel } = payload;

    if (!publishableKey || !sessionId) {
      client.emit('error', { message: 'publishableKey and sessionId are required.' });
      return;
    }

    const business = await this.businessModel.findOne({ publishableKey, status: 'active' }).exec();
    if (!business) {
      client.emit('error', { message: 'Invalid or inactive publishable widget key.' });
      return;
    }

    const entitlement = await this.entitlementService.decide(business._id.toString());
    if (!entitlement.entitled) {
      this.logger.warn(
        `[ConversationGateway] Connection rejected: business ${business._id} is not entitled (${entitlement.code})`,
      );
      client.emit('error', {
        message:
          entitlement.code === 'TRIAL_EXPIRED'
            ? 'The 14-day free trial for this store has expired. Please upgrade in the dashboard.'
            : 'The AI sales agent is currently unavailable for this store.',
      });
      return;
    }

    const conversation = await this.conversationsService.findOrCreateSession(
      business._id.toString(),
      sessionId,
      channel,
    );

    client.join(`session:${sessionId}`);
    client.data = {
      businessId: business._id.toString(),
      sessionId,
      conversationId: conversation._id.toString(),
    };

    // Resolve per-merchant session duration limit (or fall back to platform default)
    const defaultDuration =
      this.configService.get<number>('DEFAULT_SESSION_DURATION_SECONDS') ??
      DEFAULT_SESSION_DURATION_SECONDS;
    const sessionDurationSeconds: number =
      typeof business.maxSessionDurationSeconds === 'number' && business.maxSessionDurationSeconds > 0
        ? business.maxSessionDurationSeconds
        : defaultDuration;

    client.emit('session-initialized', {
      success: true,
      sessionId,
      businessId: business._id.toString(),
      status: conversation.status,
      sessionDurationSeconds,
    });

    // Start session duration timer
    this.sessionTimerService.startTimer(
      client.id,
      sessionId,
      business._id.toString(),
      sessionDurationSeconds,
      // onMaxWarning — fires at T-60s of hard session limit
      (remainingSeconds) => {
        client.emit('session-warning', {
          sessionId,
          remainingSeconds,
          message: `Your session will end in ${remainingSeconds} seconds.`,
        });
      },
      // onMaxExpiry — fires at hard session limit (max duration)
      async () => {
        try {
          await this.conversationsService.updateStatus(
            business._id.toString(),
            conversation._id.toString(),
            ConversationStatus.CLOSED,
          );
        } catch (err: any) {
          this.logger.warn(`[ConversationGateway] Failed to close conversation on max expiry: ${err?.message}`);
        }
        client.emit('session-ended', {
          sessionId,
          reason: 'session_time_limit',
          message: 'Session ended: maximum session duration reached.',
        });
      },
      // onIdleWarning — fires after IDLE_WARNING_SECONDS of user silence
      () => {
        client.emit('session-idle-warning', {
          sessionId,
          message: `Are you still there? Your session will close in ${IDLE_TERMINATE_SECONDS} seconds due to inactivity.`,
          secondsUntilClose: IDLE_TERMINATE_SECONDS,
        });
      },
      // onIdleExpiry — fires IDLE_TERMINATE_SECONDS after the idle warning if user is still silent
      async () => {
        try {
          await this.conversationsService.updateStatus(
            business._id.toString(),
            conversation._id.toString(),
            ConversationStatus.CLOSED,
          );
        } catch (err: any) {
          this.logger.warn(`[ConversationGateway] Failed to close conversation on idle: ${err?.message}`);
        }
        client.emit('session-ended', {
          sessionId,
          reason: 'idle_timeout',
          message: 'Session closed due to inactivity. Feel free to start a new chat anytime!',
        });
      },
    );
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { publishableKey: string; sessionId: string; content: string },
  ) {
    const { publishableKey, sessionId, content } = payload;

    if (!content || !sessionId) {
      client.emit('error', { message: 'sessionId and content are required.' });
      return;
    }

    const business = await this.businessModel.findOne({ publishableKey, status: 'active' }).exec();
    if (!business) {
      client.emit('error', { message: 'Invalid or inactive publishable key.' });
      return;
    }

    const businessId = business._id.toString();
    const conversation = await this.conversationsService.findOrCreateSession(
      businessId,
      sessionId,
    );

    // 1. Mark user activity for idle detection (pure timestamp write, no timer restart)
    this.sessionTimerService.markActivity(client.id);

    // 2. Save incoming user message
    await this.conversationsService.appendMessage(
      conversation._id.toString(),
      MessageRole.USER,
      content,
    );

    // 2. Fix 2: Route through AiToolsExecutor.find_products — same live-verified
    //    code path used by VoiceGateway. This guarantees price/stock data returned
    //    to text-chat customers is verified via ProductsService.verifyLive().
    const findResult = await this.aiToolsExecutor.executeTool(
      businessId,
      sessionId,
      'find_products',
      { query: content },
    );

    const foundProducts: any[] = findResult.products || [];
    const fallbackTriggered: boolean = findResult.fallbackTriggered || false;

    // 3. Construct assistant response using live-verified product data
    let assistantReply: string;
    if (foundProducts.length > 0) {
      const topProd = foundProducts[0];
      const urgency = topProd.urgencyHint ? ` ${topProd.urgencyHint}` : '';
      assistantReply =
        `Thank you for reaching out! I found some products for you. ` +
        `I recommend **${topProd.name}** at $${topProd.price}${urgency}. ` +
        `Let me know if you'd like more details or to add it to your cart!`;
    } else {
      assistantReply = `I'm here to help you browse ${business.name}! ` +
        `I couldn't find any matching products right now — let me know what you're looking for and I'll do my best.`;
    }

    // 4. Save assistant response
    const assistantMsg = await this.conversationsService.appendMessage(
      conversation._id.toString(),
      MessageRole.ASSISTANT,
      assistantReply,
      { ragProducts: foundProducts },
    );

    // 5. Emit assistant response back to client socket room
    this.server.to(`session:${sessionId}`).emit('message-received', {
      sessionId,
      messageId: assistantMsg._id.toString(),
      role: MessageRole.ASSISTANT,
      content: assistantReply,
      ragContext: {
        products: foundProducts,
        fallbackTriggered,
        fallbackTier: findResult.fallbackTier,
      },
      timestamp: assistantMsg.timestamp,
    });
  }
}
