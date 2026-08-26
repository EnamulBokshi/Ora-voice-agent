import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationChannel,
  ConversationStatus,
} from './schemas/conversation.schema';
import { Message, MessageDocument, MessageRole } from './schemas/message.schema';
import { RedisService } from '../common/redis/redis.service';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    private readonly redisService: RedisService,
  ) {}

  async findOrCreateSession(
    businessId: string,
    sessionId: string,
    channel: ConversationChannel = ConversationChannel.WIDGET_CHAT,
    metadata?: Record<string, any>,
    customerId?: string,
  ): Promise<ConversationDocument> {
    let conversation = await this.conversationModel
      .findOne({ sessionId })
      .exec();

    if (!conversation) {
      conversation = new this.conversationModel({
        businessId: businessId as any,
        sessionId,
        customerId: customerId ? (customerId as any) : undefined,
        channel,
        status: ConversationStatus.ACTIVE,
        lastActivityAt: new Date(),
        metadata: metadata || {},
      });
      await conversation.save();
    } else {
      conversation.status = ConversationStatus.ACTIVE;
      conversation.lastActivityAt = new Date();
      if (channel) conversation.channel = channel;
      if (customerId) conversation.customerId = customerId as any;
      if (metadata) {
        conversation.metadata = {
          ...(conversation.metadata || {}),
          ...metadata,
        };
      }
      await conversation.save();
    }

    // Persist session context in Redis (10s idle state retention concept)
    const redisKey = `session:conv:${sessionId}`;
    await this.redisService.getClient().set(
      redisKey,
      JSON.stringify({
        sessionId,
        businessId,
        channel: conversation.channel,
        status: conversation.status,
        lastActivityAt: conversation.lastActivityAt,
        customerId: conversation.customerId?.toString(),
        metadata: conversation.metadata,
      }),
      'EX',
      24 * 60 * 60, // 24 hours
    );

    return conversation;
  }

  async appendMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    toolCall?: Record<string, any>,
  ): Promise<MessageDocument> {
    const message = new this.messageModel({
      conversationId: conversationId as any,
      role,
      content,
      toolCall,
      timestamp: new Date(),
    });

    const savedMessage = await message.save();

    await this.conversationModel
      .findByIdAndUpdate(conversationId, {
        $set: {
          lastActivityAt: new Date(),
          'metadata.lastMessage': content,
        },
      })
      .exec();

    return savedMessage;
  }

  async getTranscript(businessId: string, conversationId: string) {
    const isObjId = Types.ObjectId.isValid(conversationId);
    const query: any = {
      businessId: businessId as any,
      ...(isObjId
        ? { $or: [{ _id: new Types.ObjectId(conversationId) }, { sessionId: conversationId }] }
        : { sessionId: conversationId }),
    };

    const conversation = await this.conversationModel.findOne(query).exec();

    if (!conversation) {
      throw new DomainException(
        'CONVERSATION_NOT_FOUND',
        `Conversation with ID '${conversationId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const messages = await this.messageModel
      .find({ conversationId: conversation._id as any })
      .sort({ timestamp: 1 })
      .exec();

    return {
      conversation,
      messages,
    };
  }

  async updateStatus(
    businessId: string,
    conversationId: string,
    status: ConversationStatus,
  ) {
    const isObjId = Types.ObjectId.isValid(conversationId);
    const query: any = {
      businessId: businessId as any,
      ...(isObjId
        ? { $or: [{ _id: new Types.ObjectId(conversationId) }, { sessionId: conversationId }] }
        : { sessionId: conversationId }),
    };

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        query,
        { $set: { status, lastActivityAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!conversation) {
      throw new DomainException(
        'CONVERSATION_NOT_FOUND',
        `Conversation with ID '${conversationId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return conversation;
  }

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { businessId: businessId as any };

    const [items, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
