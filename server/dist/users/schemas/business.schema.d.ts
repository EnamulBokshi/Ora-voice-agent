import { Document } from 'mongoose';
export type BusinessDocument = Business & Document;
export declare class Business {
    name: string;
    domain?: string;
    publishableKey: string;
    apiKeyHash?: string;
    status: string;
}
export declare const BusinessSchema: import("mongoose").Schema<Business, import("mongoose").Model<Business, any, any, any, any, any, Business>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Business, Document<unknown, {}, Business, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Business, Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    domain?: import("mongoose").SchemaDefinitionProperty<string | undefined, Business, Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    publishableKey?: import("mongoose").SchemaDefinitionProperty<string, Business, Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    apiKeyHash?: import("mongoose").SchemaDefinitionProperty<string | undefined, Business, Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Business, Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Business>;
