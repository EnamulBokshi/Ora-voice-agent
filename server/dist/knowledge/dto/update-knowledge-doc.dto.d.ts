import { CreateKnowledgeDocDto } from './create-knowledge-doc.dto';
declare const UpdateKnowledgeDocDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateKnowledgeDocDto>>;
export declare class UpdateKnowledgeDocDto extends UpdateKnowledgeDocDto_base {
    content?: string;
    isActive?: boolean;
}
export {};
