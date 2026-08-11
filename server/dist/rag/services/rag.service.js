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
var RagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const vector_store_service_1 = require("./vector-store.service");
const embedding_service_1 = require("./embedding.service");
const products_service_1 = require("../../products/products.service");
const knowledge_service_1 = require("../../knowledge/knowledge.service");
const vector_entry_interface_1 = require("../interfaces/vector-entry.interface");
let RagService = RagService_1 = class RagService {
    vectorStoreService;
    embeddingService;
    productsService;
    knowledgeService;
    logger = new common_1.Logger(RagService_1.name);
    constructor(vectorStoreService, embeddingService, productsService, knowledgeService) {
        this.vectorStoreService = vectorStoreService;
        this.embeddingService = embeddingService;
        this.productsService = productsService;
        this.knowledgeService = knowledgeService;
    }
    async searchProducts(businessId, queryText, options = {}) {
        const limit = Math.min(options.limit || 5, 5);
        const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.65;
        const queryVector = await this.embeddingService.generateEmbedding(queryText);
        const vectorResults = await this.vectorStoreService.searchVectors(businessId, queryVector, {
            entityType: vector_entry_interface_1.EntityType.PRODUCT,
            limit,
            confidenceThreshold: threshold,
        });
        let fallbackTriggered = false;
        let finalResults = [];
        if (vectorResults.length === 0) {
            fallbackTriggered = true;
            this.logger.log(`[RAG Engine] RAG_FALLBACK_TRIGGERED for query: "${queryText}" (businessId: ${businessId})`);
            const fallbackProducts = await this.productsService.findAll(businessId, {
                search: queryText,
                limit,
            });
            finalResults = fallbackProducts.items.map((prod) => ({
                entityId: prod._id.toString(),
                entityType: vector_entry_interface_1.EntityType.PRODUCT,
                text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
                score: prod.confidenceScore || 0.7,
                data: prod,
            }));
            for (const prod of fallbackProducts.items) {
                this.vectorStoreService
                    .upsertVector(businessId, {
                    entityType: vector_entry_interface_1.EntityType.PRODUCT,
                    entityId: prod._id.toString(),
                    text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
                    metadata: {
                        nativeProductId: prod.nativeProductId,
                        price: prod.price,
                        category: prod.category,
                    },
                })
                    .catch((err) => this.logger.error(`[Self-Healing RAG] Failed to index product ${prod._id}: ${err.message}`));
            }
        }
        else {
            finalResults = await Promise.all(vectorResults.map(async (res) => {
                try {
                    const productData = await this.productsService.findOne(businessId, res.entityId);
                    return {
                        ...res,
                        data: productData,
                    };
                }
                catch {
                    return res;
                }
            }));
        }
        return {
            query: queryText,
            fallbackTriggered,
            results: finalResults,
        };
    }
    async searchKnowledge(businessId, queryText, options = {}) {
        const limit = options.limit || 5;
        const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.60;
        const queryVector = await this.embeddingService.generateEmbedding(queryText);
        const vectorResults = await this.vectorStoreService.searchVectors(businessId, queryVector, {
            entityType: vector_entry_interface_1.EntityType.KNOWLEDGE_CHUNK,
            limit,
            confidenceThreshold: threshold,
        });
        return {
            query: queryText,
            results: vectorResults,
        };
    }
    async searchCombined(businessId, queryText, options = {}) {
        const [productsRes, knowledgeRes] = await Promise.all([
            this.searchProducts(businessId, queryText, options),
            this.searchKnowledge(businessId, queryText, options),
        ]);
        return {
            query: queryText,
            fallbackTriggered: productsRes.fallbackTriggered,
            products: productsRes.results,
            knowledge: knowledgeRes.results,
        };
    }
    async reindexTenant(businessId) {
        this.logger.log(`[RAG Engine] Starting bulk re-indexing for tenant ${businessId}...`);
        let indexedProducts = 0;
        let indexedChunks = 0;
        const productsRes = await this.productsService.findAll(businessId, { limit: 500 });
        for (const prod of productsRes.items) {
            await this.vectorStoreService.upsertVector(businessId, {
                entityType: vector_entry_interface_1.EntityType.PRODUCT,
                entityId: prod._id.toString(),
                text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
                metadata: {
                    nativeProductId: prod.nativeProductId,
                    price: prod.price,
                    category: prod.category,
                },
            });
            indexedProducts++;
        }
        const knowledgeDocs = await this.knowledgeService.findAll(businessId);
        for (const doc of knowledgeDocs) {
            const chunks = await this.knowledgeService.findChunksForDoc(businessId, doc._id.toString());
            for (const chunk of chunks) {
                await this.vectorStoreService.upsertVector(businessId, {
                    entityType: vector_entry_interface_1.EntityType.KNOWLEDGE_CHUNK,
                    entityId: chunk._id.toString(),
                    text: chunk.text,
                    metadata: {
                        knowledgeBaseId: doc._id.toString(),
                        docTitle: doc.title,
                        docType: doc.docType,
                    },
                });
                indexedChunks++;
            }
        }
        return {
            message: 'Tenant bulk re-indexing completed successfully.',
            indexedProducts,
            indexedChunks,
        };
    }
};
exports.RagService = RagService;
exports.RagService = RagService = RagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [vector_store_service_1.VectorStoreService,
        embedding_service_1.EmbeddingService,
        products_service_1.ProductsService,
        knowledge_service_1.KnowledgeService])
], RagService);
//# sourceMappingURL=rag.service.js.map