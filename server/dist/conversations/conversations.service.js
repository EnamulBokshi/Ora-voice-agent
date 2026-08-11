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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const conversation_schema_1 = require("./schemas/conversation.schema");
const message_schema_1 = require("./schemas/message.schema");
const redis_service_1 = require("../common/redis/redis.service");
const domain_exception_1 = require("../common/exceptions/domain.exception");
let ConversationsService = class ConversationsService {
    conversationModel;
    messageModel;
    redisService;
    constructor(conversationModel, messageModel, redisService) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.redisService = redisService;
    }
    async findOrCreateSession(businessId, sessionId, channel = conversation_schema_1.ConversationChannel.WIDGET_CHAT) {
        let conversation = await this.conversationModel
            .findOne({ sessionId })
            .exec();
        if (!conversation) {
            conversation = new this.conversationModel({
                businessId: businessId,
                sessionId,
                channel,
                status: conversation_schema_1.ConversationStatus.ACTIVE,
                lastActivityAt: new Date(),
            });
            await conversation.save();
        }
        else {
            conversation.status = conversation_schema_1.ConversationStatus.ACTIVE;
            conversation.lastActivityAt = new Date();
            await conversation.save();
        }
        const redisKey = `session:conv:${sessionId}`;
        await this.redisService.getClient().set(redisKey, JSON.stringify({
            sessionId,
            businessId,
            channel,
            status: conversation.status,
            lastActivityAt: conversation.lastActivityAt,
        }), 'EX', 24 * 60 * 60);
        return conversation;
    }
    async appendMessage(conversationId, role, content, toolCall) {
        const message = new this.messageModel({
            conversationId: conversationId,
            role,
            content,
            toolCall,
            timestamp: new Date(),
        });
        const savedMessage = await message.save();
        await this.conversationModel
            .findByIdAndUpdate(conversationId, {
            $set: { lastActivityAt: new Date() },
        })
            .exec();
        return savedMessage;
    }
    async getTranscript(businessId, conversationId) {
        const conversation = await this.conversationModel
            .findOne({
            _id: conversationId,
            businessId: businessId,
        })
            .exec();
        if (!conversation) {
            throw new domain_exception_1.DomainException('CONVERSATION_NOT_FOUND', `Conversation with ID '${conversationId}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        const messages = await this.messageModel
            .find({ conversationId: conversation._id })
            .sort({ timestamp: 1 })
            .exec();
        return {
            conversation,
            messages,
        };
    }
    async updateStatus(businessId, conversationId, status) {
        const conversation = await this.conversationModel
            .findOneAndUpdate({
            _id: conversationId,
            businessId: businessId,
        }, { $set: { status, lastActivityAt: new Date() } }, { new: true })
            .exec();
        if (!conversation) {
            throw new domain_exception_1.DomainException('CONVERSATION_NOT_FOUND', `Conversation with ID '${conversationId}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return conversation;
    }
    async findAll(businessId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = { businessId: businessId };
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
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(conversation_schema_1.Conversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        redis_service_1.RedisService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map