"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const rag_controller_1 = require("./rag.controller");
const rag_service_1 = require("./services/rag.service");
const embedding_service_1 = require("./services/embedding.service");
const vector_store_service_1 = require("./services/vector-store.service");
const vector_index_schema_1 = require("./schemas/vector-index.schema");
const products_module_1 = require("../products/products.module");
const knowledge_module_1 = require("../knowledge/knowledge.module");
let RagModule = class RagModule {
};
exports.RagModule = RagModule;
exports.RagModule = RagModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            products_module_1.ProductsModule,
            knowledge_module_1.KnowledgeModule,
            mongoose_1.MongooseModule.forFeature([
                { name: vector_index_schema_1.VectorIndex.name, schema: vector_index_schema_1.VectorIndexSchema },
            ]),
        ],
        controllers: [rag_controller_1.RagController],
        providers: [rag_service_1.RagService, embedding_service_1.EmbeddingService, vector_store_service_1.VectorStoreService],
        exports: [rag_service_1.RagService, embedding_service_1.EmbeddingService, vector_store_service_1.VectorStoreService],
    })
], RagModule);
//# sourceMappingURL=rag.module.js.map