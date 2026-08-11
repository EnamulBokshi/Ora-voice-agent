"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const knowledge_service_1 = require("./knowledge.service");
const knowledge_controller_1 = require("./knowledge.controller");
const knowledge_base_schema_1 = require("./schemas/knowledge-base.schema");
const knowledge_chunk_schema_1 = require("./schemas/knowledge-chunk.schema");
let KnowledgeModule = class KnowledgeModule {
};
exports.KnowledgeModule = KnowledgeModule;
exports.KnowledgeModule = KnowledgeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: knowledge_base_schema_1.KnowledgeBase.name, schema: knowledge_base_schema_1.KnowledgeBaseSchema },
                { name: knowledge_chunk_schema_1.KnowledgeChunk.name, schema: knowledge_chunk_schema_1.KnowledgeChunkSchema },
            ]),
        ],
        controllers: [knowledge_controller_1.KnowledgeController],
        providers: [knowledge_service_1.KnowledgeService],
        exports: [knowledge_service_1.KnowledgeService, mongoose_1.MongooseModule],
    })
], KnowledgeModule);
//# sourceMappingURL=knowledge.module.js.map