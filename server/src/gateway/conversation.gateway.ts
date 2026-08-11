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
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/schemas/message.schema';
import { RagService } from '../rag/services/rag.service';
import { RedisService } from '../common/redis/redis.service';

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
    private readonly ragService: RagService,
    private readonly redisService: RedisService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);
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

    const business = await this.businessModel.findOne({ publishableKey }).exec();
    if (!business) {
      client.emit('error', { message: 'Invalid publishable widget key.' });
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

    client.emit('session-initialized', {
      success: true,
      sessionId,
      businessId: business._id.toString(),
      status: conversation.status,
    });
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

    const business = await this.businessModel.findOne({ publishableKey }).exec();
    if (!business) {
      client.emit('error', { message: 'Invalid publishable key.' });
      return;
    }

    const businessId = business._id.toString();
    const conversation = await this.conversationsService.findOrCreateSession(
      businessId,
      sessionId,
    );

    // 1. Save incoming user message
    await this.conversationsService.appendMessage(
      conversation._id.toString(),
      MessageRole.USER,
      content,
    );

    // 2. Perform RAG semantic lookup for catalog products and store policies
    const ragResult = await this.ragService.searchCombined(businessId, content, {
      limit: 3,
    });

    // 3. Construct assistant response with RAG context
    let assistantReply = `Thank you for reaching out! I searched our store catalog. `;
    if (ragResult.products.length > 0) {
      const topProd = ragResult.products[0].data || ragResult.products[0];
      assistantReply += `I recommend checking out **${topProd.name || topProd.text}** ($${topProd.price || ''}). `;
    }
    if (ragResult.knowledge.length > 0) {
      assistantReply += `Regarding store policies: ${ragResult.knowledge[0].text.substring(0, 150)}...`;
    }

    if (ragResult.products.length === 0 && ragResult.knowledge.length === 0) {
      assistantReply = `I am here to help you browse ${business.name}! Let me know what products or store details you are looking for.`;
    }

    // 4. Save assistant response
    const assistantMsg = await this.conversationsService.appendMessage(
      conversation._id.toString(),
      MessageRole.ASSISTANT,
      assistantReply,
      { ragProducts: ragResult.products, ragKnowledge: ragResult.knowledge },
    );

    // 5. Emit assistant response back to client socket room
    this.server.to(`session:${sessionId}`).emit('message-received', {
      sessionId,
      messageId: assistantMsg._id.toString(),
      role: MessageRole.ASSISTANT,
      content: assistantReply,
      ragContext: {
        products: ragResult.products,
        knowledge: ragResult.knowledge,
        fallbackTriggered: ragResult.fallbackTriggered,
      },
      timestamp: assistantMsg.timestamp,
    });
  }
}
