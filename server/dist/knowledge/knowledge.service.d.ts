import { Model, Types } from 'mongoose';
import { KnowledgeBase, KnowledgeBaseDocument } from './schemas/knowledge-base.schema';
import { KnowledgeChunkDocument } from './schemas/knowledge-chunk.schema';
import { CreateKnowledgeDocDto } from './dto/create-knowledge-doc.dto';
import { UpdateKnowledgeDocDto } from './dto/update-knowledge-doc.dto';
export declare class KnowledgeService {
    private readonly knowledgeBaseModel;
    private readonly knowledgeChunkModel;
    private readonly logger;
    constructor(knowledgeBaseModel: Model<KnowledgeBaseDocument>, knowledgeChunkModel: Model<KnowledgeChunkDocument>);
    create(businessId: string, dto: CreateKnowledgeDocDto): Promise<{
        document: KnowledgeBaseDocument;
        chunksCount: number;
    }>;
    findAll(businessId: string, docType?: string, search?: string): Promise<(import("mongoose").Document<unknown, {}, KnowledgeBaseDocument, {}, import("mongoose").DefaultSchemaOptions> & KnowledgeBase & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOne(businessId: string, id: string): Promise<KnowledgeBaseDocument>;
    findChunksForDoc(businessId: string, knowledgeBaseId: string): Promise<KnowledgeChunkDocument[]>;
    update(businessId: string, id: string, dto: UpdateKnowledgeDocDto): Promise<{
        document: KnowledgeBaseDocument;
        chunksCount?: number;
    }>;
    remove(businessId: string, id: string): Promise<{
        message: string;
    }>;
    private chunkText;
}
