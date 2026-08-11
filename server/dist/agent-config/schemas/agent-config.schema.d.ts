import { Document, Schema as MongooseSchema } from 'mongoose';
export type AgentConfigDocument = AgentConfig & Document;
export type VoiceSettingsDocument = VoiceSettings & Document;
export type SalesPlaybookDocument = SalesPlaybook & Document;
export declare class AgentConfig {
    businessId: MongooseSchema.Types.ObjectId;
    brandVoiceDescription: string;
    language: string;
    idleTimeoutSeconds: number;
    discountFloorPercent: number;
    alwaysOfferProductIds: string[];
    isActive: boolean;
}
export declare const AgentConfigSchema: MongooseSchema<AgentConfig, import("mongoose").Model<AgentConfig, any, any, any, any, any, AgentConfig>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AgentConfig, Document<unknown, {}, AgentConfig, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    brandVoiceDescription?: import("mongoose").SchemaDefinitionProperty<string, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    language?: import("mongoose").SchemaDefinitionProperty<string, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    idleTimeoutSeconds?: import("mongoose").SchemaDefinitionProperty<number, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    discountFloorPercent?: import("mongoose").SchemaDefinitionProperty<number, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    alwaysOfferProductIds?: import("mongoose").SchemaDefinitionProperty<string[], AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, AgentConfig, Document<unknown, {}, AgentConfig, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AgentConfig & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, AgentConfig>;
export declare class VoiceSettings {
    businessId: MongooseSchema.Types.ObjectId;
    voiceId: string;
    language: string;
    connectedPlatform: string;
}
export declare const VoiceSettingsSchema: MongooseSchema<VoiceSettings, import("mongoose").Model<VoiceSettings, any, any, any, any, any, VoiceSettings>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VoiceSettings, Document<unknown, {}, VoiceSettings, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<VoiceSettings & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, VoiceSettings, Document<unknown, {}, VoiceSettings, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VoiceSettings & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    voiceId?: import("mongoose").SchemaDefinitionProperty<string, VoiceSettings, Document<unknown, {}, VoiceSettings, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VoiceSettings & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    language?: import("mongoose").SchemaDefinitionProperty<string, VoiceSettings, Document<unknown, {}, VoiceSettings, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VoiceSettings & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    connectedPlatform?: import("mongoose").SchemaDefinitionProperty<string, VoiceSettings, Document<unknown, {}, VoiceSettings, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<VoiceSettings & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, VoiceSettings>;
export declare class SalesPlaybook {
    businessId: MongooseSchema.Types.ObjectId;
    upsellCategories: Record<string, any>;
    mentionLowStockUrgency: boolean;
}
export declare const SalesPlaybookSchema: MongooseSchema<SalesPlaybook, import("mongoose").Model<SalesPlaybook, any, any, any, any, any, SalesPlaybook>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SalesPlaybook, Document<unknown, {}, SalesPlaybook, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SalesPlaybook & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    businessId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId, SalesPlaybook, Document<unknown, {}, SalesPlaybook, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SalesPlaybook & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    upsellCategories?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, SalesPlaybook, Document<unknown, {}, SalesPlaybook, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SalesPlaybook & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mentionLowStockUrgency?: import("mongoose").SchemaDefinitionProperty<boolean, SalesPlaybook, Document<unknown, {}, SalesPlaybook, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SalesPlaybook & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, SalesPlaybook>;
