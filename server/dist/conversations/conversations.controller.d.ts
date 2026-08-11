import { ConversationsService } from './conversations.service';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class ConversationsController {
    private readonly conversationsService;
    constructor(conversationsService: ConversationsService);
    findAll(user: JwtPayloadUser, page?: number, limit?: number): Promise<{
        items: (import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/conversation.schema").Conversation & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
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
    getTranscript(user: JwtPayloadUser, id: string): Promise<{
        conversation: import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/conversation.schema").Conversation & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        messages: (import("mongoose").Document<unknown, {}, import("./schemas/message.schema").MessageDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/message.schema").Message & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
    }>;
    closeConversation(user: JwtPayloadUser, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").ConversationDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/conversation.schema").Conversation & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
}
