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
exports.VectorIndexSchema = exports.VectorIndex = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../../users/schemas/business.schema");
const vector_entry_interface_1 = require("../interfaces/vector-entry.interface");
let VectorIndex = class VectorIndex {
    businessId;
    entityType;
    entityId;
    text;
    vector;
    metadata;
};
exports.VectorIndex = VectorIndex;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: business_schema_1.Business.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], VectorIndex.prototype, "businessId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: Object.values(vector_entry_interface_1.EntityType),
        index: true,
    }),
    __metadata("design:type", String)
], VectorIndex.prototype, "entityType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], VectorIndex.prototype, "entityId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VectorIndex.prototype, "text", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Number], required: true }),
    __metadata("design:type", Array)
], VectorIndex.prototype, "vector", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], VectorIndex.prototype, "metadata", void 0);
exports.VectorIndex = VectorIndex = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VectorIndex);
exports.VectorIndexSchema = mongoose_1.SchemaFactory.createForClass(VectorIndex);
exports.VectorIndexSchema.index({ businessId: 1, entityType: 1, entityId: 1 }, { unique: true });
//# sourceMappingURL=vector-index.schema.js.map