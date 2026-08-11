import { Document, Schema as MongooseSchema } from 'mongoose';
export type KnowledgeChunkDocument = KnowledgeChunk & Document;
export declare class KnowledgeChunk {
    businessId: MongooseSchema.Types.ObjectId;
    knowledgeBaseId: MongooseSchema.Types.ObjectId;
    text: string;
    chunkIndex: number;
    embeddingRef?: string;
    metadata: Record<string, any>;
}
export declare const KnowledgeChunkSchema: MongooseSchema<KnowledgeChunk, import("mongoose").Model<KnowledgeChunk, any, any, any, any, any, KnowledgeChunk>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    knowledgeBaseId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    text?: import("mongoose").SchemaDefinitionProperty<string, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    chunkIndex?: import("mongoose").SchemaDefinitionProperty<number, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    embeddingRef?: import("mongoose").SchemaDefinitionProperty<string | undefined, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, KnowledgeChunk, Document<unknown, {}, KnowledgeChunk, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeChunk & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, KnowledgeChunk>;
