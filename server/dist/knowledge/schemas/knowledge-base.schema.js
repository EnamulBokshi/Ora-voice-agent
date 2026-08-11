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
exports.KnowledgeBaseSchema = exports.KnowledgeBase = exports.DocType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
var DocType;
(function (DocType) {
    DocType["POLICY"] = "policy";
    DocType["BRAND_RULE"] = "brand_rule";
    DocType["FAQ"] = "faq";
    DocType["SALES_PLAYBOOK"] = "sales_playbook";
    DocType["UPLOADED_DOC"] = "uploaded_doc";
    DocType["PRODUCT_MANUAL"] = "product_manual";
})(DocType || (exports.DocType = DocType = {}));
let KnowledgeBase = class KnowledgeBase {
    businessId;
    docType;
    title;
    content;
    sourceUrl;
    metadata;
    isActive;
};
exports.KnowledgeBase = KnowledgeBase;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], KnowledgeBase.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: Object.values(DocType),
        default: DocType.FAQ,
    }),
    __metadata("design:type", String)
], KnowledgeBase.prototype, "docType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], KnowledgeBase.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], KnowledgeBase.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], KnowledgeBase.prototype, "sourceUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], KnowledgeBase.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true, index: true }),
    __metadata("design:type", Boolean)
], KnowledgeBase.prototype, "isActive", void 0);
exports.KnowledgeBase = KnowledgeBase = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], KnowledgeBase);
exports.KnowledgeBaseSchema = mongoose_1.SchemaFactory.createForClass(KnowledgeBase);
exports.KnowledgeBaseSchema.index({ businessId: 1, title: 'text', content: 'text' });
//# sourceMappingURL=knowledge-base.schema.js.map