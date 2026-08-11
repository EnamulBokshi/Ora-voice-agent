import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument, ConversationChannel, ConversationStatus } from './schemas/conversation.schema';
import { Message, MessageDocument, MessageRole } from './schemas/message.schema';
import { RedisService } from '../common/redis/redis.service';
export declare class ConversationsService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly redisService;
    constructor(conversationModel: Model<ConversationDocument>, messageModel: Model<MessageDocument>, redisService: RedisService);
    findOrCreateSession(businessId: string, sessionId: string, channel?: ConversationChannel): Promise<ConversationDocument>;
    appendMessage(conversationId: string, role: MessageRole, content: string, toolCall?: Record<string, any>): Promise<MessageDocument>;
    getTranscript(businessId: string, conversationId: string): Promise<{
        conversation: import("mongoose").Document<unknown, {}, ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & Conversation & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        messages: (import("mongoose").Document<unknown, {}, MessageDocument, {}, import("mongoose").DefaultSchemaOptions> & Message & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
    }>;
    updateStatus(businessId: string, conversationId: string, status: ConversationStatus): Promise<import("mongoose").Document<unknown, {}, ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & Conversation & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    findAll(businessId: string, page?: number, limit?: number): Promise<{
        items: (import("mongoose").Document<unknown, {}, ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & Conversation & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
