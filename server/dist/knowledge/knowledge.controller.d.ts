import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDocDto } from './dto/create-knowledge-doc.dto';
import { UpdateKnowledgeDocDto } from './dto/update-knowledge-doc.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class KnowledgeController {
    private readonly knowledgeService;
    constructor(knowledgeService: KnowledgeService);
    create(user: JwtPayloadUser, dto: CreateKnowledgeDocDto): Promise<{
        document: import("./schemas/knowledge-base.schema").KnowledgeBaseDocument;
        chunksCount: number;
    }>;
    findAll(user: JwtPayloadUser, docType?: string, search?: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/knowledge-base.schema").KnowledgeBaseDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/knowledge-base.schema").KnowledgeBase & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOne(user: JwtPayloadUser, id: string): Promise<import("./schemas/knowledge-base.schema").KnowledgeBaseDocument>;
    findChunks(user: JwtPayloadUser, id: string): Promise<import("./schemas/knowledge-chunk.schema").KnowledgeChunkDocument[]>;
    update(user: JwtPayloadUser, id: string, dto: UpdateKnowledgeDocDto): Promise<{
        document: import("./schemas/knowledge-base.schema").KnowledgeBaseDocument;
        chunksCount?: number;
    }>;
    remove(user: JwtPayloadUser, id: string): Promise<{
        message: string;
    }>;
}
