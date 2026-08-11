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
var VectorStoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vector_index_schema_1 = require("../schemas/vector-index.schema");
const embedding_service_1 = require("./embedding.service");
let VectorStoreService = VectorStoreService_1 = class VectorStoreService {
    vectorIndexModel;
    embeddingService;
    logger = new common_1.Logger(VectorStoreService_1.name);
    constructor(vectorIndexModel, embeddingService) {
        this.vectorIndexModel = vectorIndexModel;
        this.embeddingService = embeddingService;
    }
    async upsertVector(businessId, entry) {
        const vector = await this.embeddingService.generateEmbedding(entry.text);
        const doc = await this.vectorIndexModel.findOneAndUpdate({
            businessId: businessId,
            entityType: entry.entityType,
            entityId: entry.entityId,
        }, {
            $set: {
                text: entry.text,
                vector,
                metadata: entry.metadata || {},
            },
        }, { upsert: true, new: true }).exec();
        return doc;
    }
    async searchVectors(businessId, queryVector, options = {}) {
        const limit = options.limit || 5;
        const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.65;
        const filter = {
            businessId: businessId,
        };
        if (options.entityType) {
            filter.entityType = options.entityType;
        }
        const candidateDocs = await this.vectorIndexModel.find(filter).exec();
        const scored = candidateDocs
            .map((doc) => {
            const score = this.embeddingService.cosineSimilarity(queryVector, doc.vector);
            return {
                entityId: doc.entityId,
                entityType: doc.entityType,
                text: doc.text,
                score,
                metadata: doc.metadata,
            };
        })
            .filter((item) => item.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return scored;
    }
    async deleteVectorByEntityId(businessId, entityId) {
        await this.vectorIndexModel
            .deleteMany({
            businessId: businessId,
            entityId,
        })
            .exec();
    }
    async deleteTenantVectors(businessId) {
        await this.vectorIndexModel
            .deleteMany({
            businessId: businessId,
        })
            .exec();
    }
};
exports.VectorStoreService = VectorStoreService;
exports.VectorStoreService = VectorStoreService = VectorStoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(vector_index_schema_1.VectorIndex.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        embedding_service_1.EmbeddingService])
], VectorStoreService);
//# sourceMappingURL=vector-store.service.js.map