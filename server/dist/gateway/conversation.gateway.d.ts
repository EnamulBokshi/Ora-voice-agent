import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Model } from 'mongoose';
import { BusinessDocument } from '../users/schemas/business.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { RagService } from '../rag/services/rag.service';
import { RedisService } from '../common/redis/redis.service';
export declare class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly businessModel;
    private readonly conversationsService;
    private readonly ragService;
    private readonly redisService;
    server: Server;
    private readonly logger;
    constructor(businessModel: Model<BusinessDocument>, conversationsService: ConversationsService, ragService: RagService, redisService: RedisService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleInitSession(client: Socket, payload: {
        publishableKey: string;
        sessionId: string;
        channel?: any;
    }): Promise<void>;
    handleSendMessage(client: Socket, payload: {
        publishableKey: string;
        sessionId: string;
        content: string;
    }): Promise<void>;
}
