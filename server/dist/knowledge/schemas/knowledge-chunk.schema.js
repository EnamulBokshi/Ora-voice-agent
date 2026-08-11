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
exports.KnowledgeChunkSchema = exports.KnowledgeChunk = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
const knowledge_base_schema_1 = require("./knowledge-base.schema");
let KnowledgeChunk = class KnowledgeChunk {
    businessId;
    knowledgeBaseId;
    text;
    chunkIndex;
    embeddingRef;
    metadata;
};
exports.KnowledgeChunk = KnowledgeChunk;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], KnowledgeChunk.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: knowledge_base_schema_1.KnowledgeBase.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], KnowledgeChunk.prototype, "knowledgeBaseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], KnowledgeChunk.prototype, "text", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Number }),
    __metadata("design:type", Number)
], KnowledgeChunk.prototype, "chunkIndex", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], KnowledgeChunk.prototype, "embeddingRef", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], KnowledgeChunk.prototype, "metadata", void 0);
exports.KnowledgeChunk = KnowledgeChunk = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], KnowledgeChunk);
exports.KnowledgeChunkSchema = mongoose_1.SchemaFactory.createForClass(KnowledgeChunk);
exports.KnowledgeChunkSchema.index({ businessId: 1, knowledgeBaseId: 1 });
//# sourceMappingURL=knowledge-chunk.schema.js.map