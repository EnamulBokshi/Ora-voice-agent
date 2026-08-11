"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ConversationGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../users/schemas/business.schema");
const conversations_service_1 = require("../conversations/conversations.service");
const message_schema_1 = require("../conversations/schemas/message.schema");
const rag_service_1 = require("../rag/services/rag.service");
const redis_service_1 = require("../common/redis/redis.service");
let ConversationGateway = ConversationGateway_1 = class ConversationGateway {
    businessModel;
    conversationsService;
    ragService;
    redisService;
    server;
    logger = new common_1.Logger(ConversationGateway_1.name);
    constructor(businessModel, conversationsService, ragService, redisService) {
        this.businessModel = businessModel;
        this.conversationsService = conversationsService;
        this.ragService = ragService;
        this.redisService = redisService;
    }
    handleConnection(client) {
        this.logger.log(`[WebSocket] Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);
    }
    async handleInitSession(client, payload) {
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
        const conversation = await this.conversationsService.findOrCreateSession(business._id.toString(), sessionId, channel);
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
    async handleSendMessage(client, payload) {
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
        const conversation = await this.conversationsService.findOrCreateSession(businessId, sessionId);
        await this.conversationsService.appendMessage(conversation._id.toString(), message_schema_1.MessageRole.USER, content);
        const ragResult = await this.ragService.searchCombined(businessId, content, {
            limit: 3,
        });
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
        const assistantMsg = await this.conversationsService.appendMessage(conversation._id.toString(), message_schema_1.MessageRole.ASSISTANT, assistantReply, { ragProducts: ragResult.products, ragKnowledge: ragResult.knowledge });
        this.server.to(`session:${sessionId}`).emit('message-received', {
            sessionId,
            messageId: assistantMsg._id.toString(),
            role: message_schema_1.MessageRole.ASSISTANT,
            content: assistantReply,
            ragContext: {
                products: ragResult.products,
                knowledge: ragResult.knowledge,
                fallbackTriggered: ragResult.fallbackTriggered,
            },
            timestamp: assistantMsg.timestamp,
        });
    }
};
exports.ConversationGateway = ConversationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ConversationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('init-session'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ConversationGateway.prototype, "handleInitSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send-message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ConversationGateway.prototype, "handleSendMessage", null);
exports.ConversationGateway = ConversationGateway = ConversationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: 'conversations',
    }),
    __param(0, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        conversations_service_1.ConversationsService,
        rag_service_1.RagService,
        redis_service_1.RedisService])
], ConversationGateway);
//# sourceMappingURL=conversation.gateway.js.map