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
var KnowledgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const knowledge_base_schema_1 = require("./schemas/knowledge-base.schema");
const knowledge_chunk_schema_1 = require("./schemas/knowledge-chunk.schema");
const domain_exception_1 = require("../common/exceptions/domain.exception");
let KnowledgeService = KnowledgeService_1 = class KnowledgeService {
    knowledgeBaseModel;
    knowledgeChunkModel;
    logger = new common_1.Logger(KnowledgeService_1.name);
    constructor(knowledgeBaseModel, knowledgeChunkModel) {
        this.knowledgeBaseModel = knowledgeBaseModel;
        this.knowledgeChunkModel = knowledgeChunkModel;
    }
    async create(businessId, dto) {
        const bId = new mongoose_2.Types.ObjectId(businessId);
        const doc = new this.knowledgeBaseModel({
            ...dto,
            businessId: bId,
        });
        const savedDoc = await doc.save();
        const chunks = this.chunkText(savedDoc.content);
        const chunkDocs = chunks.map((chunkText, index) => ({
            businessId: bId,
            knowledgeBaseId: savedDoc._id,
            text: chunkText,
            chunkIndex: index,
            metadata: {
                docTitle: savedDoc.title,
                docType: savedDoc.docType,
            },
        }));
        if (chunkDocs.length > 0) {
            await this.knowledgeChunkModel.insertMany(chunkDocs);
        }
        return {
            document: savedDoc,
            chunksCount: chunkDocs.length,
        };
    }
    async findAll(businessId, docType, search) {
        const filter = {
            businessId: businessId,
            isActive: true,
        };
        if (docType) {
            filter.docType = docType;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
            ];
        }
        const items = await this.knowledgeBaseModel
            .find(filter)
            .sort({ updatedAt: -1 })
            .exec();
        return items;
    }
    async findOne(businessId, id) {
        const doc = await this.knowledgeBaseModel
            .findOne({
            _id: id,
            businessId: businessId,
        })
            .exec();
        if (!doc) {
            throw new domain_exception_1.DomainException('KNOWLEDGE_DOC_NOT_FOUND', `Knowledge document with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return doc;
    }
    async findChunksForDoc(businessId, knowledgeBaseId) {
        return this.knowledgeChunkModel
            .find({
            businessId: businessId,
            knowledgeBaseId: knowledgeBaseId,
        })
            .sort({ chunkIndex: 1 })
            .exec();
    }
    async update(businessId, id, dto) {
        const doc = await this.findOne(businessId, id);
        const isContentUpdated = dto.content && dto.content !== doc.content;
        Object.assign(doc, dto);
        const updatedDoc = await doc.save();
        let chunksCount;
        if (isContentUpdated) {
            await this.knowledgeChunkModel.deleteMany({
                knowledgeBaseId: updatedDoc._id,
            });
            const chunks = this.chunkText(updatedDoc.content);
            const chunkDocs = chunks.map((chunkText, index) => ({
                businessId: new mongoose_2.Types.ObjectId(businessId),
                knowledgeBaseId: updatedDoc._id,
                text: chunkText,
                chunkIndex: index,
                metadata: {
                    docTitle: updatedDoc.title,
                    docType: updatedDoc.docType,
                },
            }));
            if (chunkDocs.length > 0) {
                await this.knowledgeChunkModel.insertMany(chunkDocs);
            }
            chunksCount = chunkDocs.length;
        }
        return {
            document: updatedDoc,
            chunksCount,
        };
    }
    async remove(businessId, id) {
        const result = await this.knowledgeBaseModel
            .deleteOne({ _id: id, businessId: businessId })
            .exec();
        if (result.deletedCount === 0) {
            throw new domain_exception_1.DomainException('KNOWLEDGE_DOC_NOT_FOUND', `Knowledge document with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        await this.knowledgeChunkModel.deleteMany({ knowledgeBaseId: id });
        return { message: 'Knowledge base document and its chunks deleted successfully.' };
    }
    chunkText(text, chunkSize = 500, overlap = 50) {
        if (!text || text.trim().length === 0)
            return [];
        const normalized = text.replace(/\r\n/g, '\n').trim();
        if (normalized.length <= chunkSize)
            return [normalized];
        const chunks = [];
        let start = 0;
        while (start < normalized.length) {
            let end = start + chunkSize;
            if (end >= normalized.length) {
                chunks.push(normalized.substring(start));
                break;
            }
            const lastNewline = normalized.lastIndexOf('\n', end);
            const lastPeriod = normalized.lastIndexOf('. ', end);
            const lastSpace = normalized.lastIndexOf(' ', end);
            if (lastNewline > start + chunkSize / 2) {
                end = lastNewline + 1;
            }
            else if (lastPeriod > start + chunkSize / 2) {
                end = lastPeriod + 1;
            }
            else if (lastSpace > start + chunkSize / 2) {
                end = lastSpace + 1;
            }
            chunks.push(normalized.substring(start, end).trim());
            start = Math.max(start + 1, end - overlap);
        }
        return chunks;
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = KnowledgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(knowledge_base_schema_1.KnowledgeBase.name)),
    __param(1, (0, mongoose_1.InjectModel)(knowledge_chunk_schema_1.KnowledgeChunk.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map