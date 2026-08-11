import { Document, Schema as MongooseSchema } from 'mongoose';
export type KnowledgeBaseDocument = KnowledgeBase & Document;
export declare enum DocType {
    POLICY = "policy",
    BRAND_RULE = "brand_rule",
    FAQ = "faq",
    SALES_PLAYBOOK = "sales_playbook",
    UPLOADED_DOC = "uploaded_doc",
    PRODUCT_MANUAL = "product_manual"
}
export declare class KnowledgeBase {
    businessId: MongooseSchema.Types.ObjectId;
    docType: DocType;
    title: string;
    content: string;
    sourceUrl?: string;
    metadata: Record<string, any>;
    isActive: boolean;
}
export declare const KnowledgeBaseSchema: MongooseSchema<KnowledgeBase, import("mongoose").Model<KnowledgeBase, any, any, any, any, any, KnowledgeBase>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    docType?: import("mongoose").SchemaDefinitionProperty<DocType, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    content?: import("mongoose").SchemaDefinitionProperty<string, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sourceUrl?: import("mongoose").SchemaDefinitionProperty<string | undefined, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, KnowledgeBase, Document<unknown, {}, KnowledgeBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<KnowledgeBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, KnowledgeBase>;
