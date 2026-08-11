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
exports.SalesPlaybookSchema = exports.SalesPlaybook = exports.VoiceSettingsSchema = exports.VoiceSettings = exports.AgentConfigSchema = exports.AgentConfig = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
let AgentConfig = class AgentConfig {
    businessId;
    brandVoiceDescription;
    language;
    idleTimeoutSeconds;
    discountFloorPercent;
    alwaysOfferProductIds;
    isActive;
};
exports.AgentConfig = AgentConfig;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], AgentConfig.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'Helpful, professional, and friendly sales assistant.' }),
    __metadata("design:type", String)
], AgentConfig.prototype, "brandVoiceDescription", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'en' }),
    __metadata("design:type", String)
], AgentConfig.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 10 }),
    __metadata("design:type", Number)
], AgentConfig.prototype, "idleTimeoutSeconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 10 }),
    __metadata("design:type", Number)
], AgentConfig.prototype, "discountFloorPercent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AgentConfig.prototype, "alwaysOfferProductIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], AgentConfig.prototype, "isActive", void 0);
exports.AgentConfig = AgentConfig = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AgentConfig);
exports.AgentConfigSchema = mongoose_1.SchemaFactory.createForClass(AgentConfig);
let VoiceSettings = class VoiceSettings {
    businessId;
    voiceId;
    language;
    connectedPlatform;
};
exports.VoiceSettings = VoiceSettings;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], VoiceSettings.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'alloy' }),
    __metadata("design:type", String)
], VoiceSettings.prototype, "voiceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'en' }),
    __metadata("design:type", String)
], VoiceSettings.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'default' }),
    __metadata("design:type", String)
], VoiceSettings.prototype, "connectedPlatform", void 0);
exports.VoiceSettings = VoiceSettings = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VoiceSettings);
exports.VoiceSettingsSchema = mongoose_1.SchemaFactory.createForClass(VoiceSettings);
let SalesPlaybook = class SalesPlaybook {
    businessId;
    upsellCategories;
    mentionLowStockUrgency;
};
exports.SalesPlaybook = SalesPlaybook;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], SalesPlaybook.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], SalesPlaybook.prototype, "upsellCategories", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], SalesPlaybook.prototype, "mentionLowStockUrgency", void 0);
exports.SalesPlaybook = SalesPlaybook = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SalesPlaybook);
exports.SalesPlaybookSchema = mongoose_1.SchemaFactory.createForClass(SalesPlaybook);
//# sourceMappingURL=agent-config.schema.js.map