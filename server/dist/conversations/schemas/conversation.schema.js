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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationSchema = exports.Conversation = exports.ConversationStatus = exports.ConversationChannel = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
const customer_schema_1 = require("../../customers/schemas/customer.schema");
var ConversationChannel;
(function (ConversationChannel) {
    ConversationChannel["WIDGET_CHAT"] = "widget_chat";
    ConversationChannel["WIDGET_VOICE"] = "widget_voice";
    ConversationChannel["API"] = "api";
})(ConversationChannel || (exports.ConversationChannel = ConversationChannel = {}));
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["ACTIVE"] = "active";
    ConversationStatus["SUSPENDED"] = "suspended";
    ConversationStatus["CLOSED"] = "closed";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
let Conversation = class Conversation {
    businessId;
    sessionId;
    customerId;
    channel;
    status;
    lastActivityAt;
    metadata;
};
exports.Conversation = Conversation;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], Conversation.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], Conversation.prototype, "sessionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: customer_schema_1.Customer.name,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], Conversation.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(ConversationChannel),
        default: ConversationChannel.WIDGET_CHAT,
    }),
    __metadata("design:type", String)
], Conversation.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(ConversationStatus),
        default: ConversationStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Conversation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Conversation.prototype, "lastActivityAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], Conversation.prototype, "metadata", void 0);
exports.Conversation = Conversation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Conversation);
exports.ConversationSchema = mongoose_1.SchemaFactory.createForClass(Conversation);
exports.ConversationSchema.index({ businessId: 1, status: 1 });
//# sourceMappingURL=conversation.schema.js.map