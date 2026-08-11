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
exports.ProductSchema = exports.Product = exports.SourceTier = exports.ProductAvailability = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
var ProductAvailability;
(function (ProductAvailability) {
    ProductAvailability["IN_STOCK"] = "in_stock";
    ProductAvailability["OUT_OF_STOCK"] = "out_of_stock";
    ProductAvailability["PREORDER"] = "preorder";
    ProductAvailability["DISCONTINUED"] = "discontinued";
})(ProductAvailability || (exports.ProductAvailability = ProductAvailability = {}));
var SourceTier;
(function (SourceTier) {
    SourceTier["TIER1_CONNECTOR"] = "tier1_connector";
    SourceTier["TIER2_FEED"] = "tier2_feed";
    SourceTier["TIER3_PASSIVE"] = "tier3_passive";
    SourceTier["TIER4_MANUAL"] = "tier4_manual";
})(SourceTier || (exports.SourceTier = SourceTier = {}));
let Product = class Product {
    businessId;
    nativeProductId;
    name;
    description;
    price;
    currency;
    availability;
    stockQuantity;
    images;
    category;
    attributes;
    sourceTier;
    confidenceScore;
    isEmbedded;
    embeddingRef;
    lastVerifiedAt;
    isActive;
    timesRecommendedByAgent;
    timesUpsold;
};
exports.Product = Product;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], Product.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, index: true }),
    __metadata("design:type", String)
], Product.prototype, "nativeProductId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, index: true }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Number }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'USD', trim: true }),
    __metadata("design:type", String)
], Product.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(ProductAvailability),
        default: ProductAvailability.IN_STOCK,
    }),
    __metadata("design:type", String)
], Product.prototype, "availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stockQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, index: true }),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], Product.prototype, "attributes", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(SourceTier),
        default: SourceTier.TIER1_CONNECTOR,
    }),
    __metadata("design:type", String)
], Product.prototype, "sourceTier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1.0, min: 0.0, max: 1.0 }),
    __metadata("design:type", Number)
], Product.prototype, "confidenceScore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "isEmbedded", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Product.prototype, "embeddingRef", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Product.prototype, "lastVerifiedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true, index: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "timesRecommendedByAgent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "timesUpsold", void 0);
exports.Product = Product = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Product);
exports.ProductSchema = mongoose_1.SchemaFactory.createForClass(Product);
exports.ProductSchema.index({ businessId: 1, nativeProductId: 1 }, { unique: true });
exports.ProductSchema.index({ businessId: 1, name: 'text', description: 'text', category: 'text' });
//# sourceMappingURL=product.schema.js.map