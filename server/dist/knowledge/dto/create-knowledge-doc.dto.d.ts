import { DocType } from '../schemas/knowledge-base.schema';
export declare class CreateKnowledgeDocDto {
    docType: DocType;
    title: string;
    content: string;
    sourceUrl?: string;
    metadata?: Record<string, any>;
}
