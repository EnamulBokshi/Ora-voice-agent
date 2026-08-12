export interface AgentConfig {
  _id?: string;
  businessId?: string;
  brandVoiceDescription: string;
  language: string;
  idleTimeoutSeconds: number;
  discountFloorPercent: number;
  alwaysOfferProductIds: string[];
  isActive: boolean;
}

export interface VoiceSettings {
  voiceId: string;
  language: string;
  connectedPlatform: string;
}

export interface SalesPlaybook {
  upsellCategories: Record<string, any>;
  mentionLowStockUrgency: boolean;
}

export interface CombinedAgentConfig {
  config: AgentConfig;
  voiceSettings?: VoiceSettings;
  playbook?: SalesPlaybook;
}

export interface UpdateAgentConfigPayload {
  brandVoiceDescription?: string;
  language?: string;
  idleTimeoutSeconds?: number;
  discountFloorPercent?: number;
  alwaysOfferProductIds?: string[];
  isActive?: boolean;
  voiceSettings?: Partial<VoiceSettings>;
  playbook?: Partial<SalesPlaybook>;
}
