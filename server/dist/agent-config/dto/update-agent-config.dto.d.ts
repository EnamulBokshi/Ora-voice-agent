export declare class UpdateAgentConfigDto {
    brandVoiceDescription?: string;
    language?: string;
    idleTimeoutSeconds?: number;
    discountFloorPercent?: number;
    alwaysOfferProductIds?: string[];
    voiceId?: string;
    upsellCategories?: Record<string, any>;
    mentionLowStockUrgency?: boolean;
}
