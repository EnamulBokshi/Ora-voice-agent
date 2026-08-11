import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdminRole } from '../enums/admin-role.enum';
export type AdminUserDocument = AdminUser & Document;
export declare class AdminUser {
    businessId: MongooseSchema.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: AdminRole;
    emailVerified: boolean;
    pendingOtpHash?: string;
    otpExpiresAt?: Date;
    otpAttemptCount: number;
}
export declare const AdminUserSchema: MongooseSchema<AdminUser, import("mongoose").Model<AdminUser, any, any, any, any, any, AdminUser>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AdminUser, Document<unknown, {}, AdminUser, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    passwordHash?: import("mongoose").SchemaDefinitionProperty<string, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<AdminRole, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailVerified?: import("mongoose").SchemaDefinitionProperty<boolean, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    pendingOtpHash?: import("mongoose").SchemaDefinitionProperty<string | undefined, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    otpExpiresAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    otpAttemptCount?: import("mongoose").SchemaDefinitionProperty<number, AdminUser, Document<unknown, {}, AdminUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AdminUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, AdminUser>;
