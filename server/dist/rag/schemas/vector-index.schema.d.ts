import { Document, Schema as MongooseSchema } from 'mongoose';
import { EntityType } from '../interfaces/vector-entry.interface';
export type VectorIndexDocument = VectorIndex & Document;
export declare class VectorIndex {
    businessId: MongooseSchema.Types.ObjectId;
    entityType: EntityType;
    entityId: string;
    text: string;
    vector: number[];
    metadata: Record<string, any>;
}
export declare const VectorIndexSchema: MongooseSchema<VectorIndex, import("mongoose").Model<VectorIndex, any, any, any, any, any, VectorIndex>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VectorIndex, Document<unknown, {}, VectorIndex, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    entityType?: import("mongoose").SchemaDefinitionProperty<EntityType, VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    entityId?: import("mongoose").SchemaDefinitionProperty<string, VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    text?: import("mongoose").SchemaDefinitionProperty<string, VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    vector?: import("mongoose").SchemaDefinitionProperty<number[], VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, VectorIndex, Document<unknown, {}, VectorIndex, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VectorIndex & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, VectorIndex>;
