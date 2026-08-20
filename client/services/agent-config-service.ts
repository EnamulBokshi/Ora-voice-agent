import { apiClient } from '@/lib/api-client';

export interface AgentConfigData {
  _id?: string;
  businessId?: string;
  brandVoiceDescription: string;
  businessArchetype?: string;
  businessSummary?: string;
  customDirectives?: string;
  language: string;
  idleTimeoutSeconds: number;
  discountFloorPercent: number;
  alwaysOfferProductIds: string[];
  isActive: boolean;
}

export interface VoiceSettingsData {
  _id?: string;
  businessId?: string;
  voiceId: string;
  language: string;
  connectedPlatform: string;
}

export interface SalesPlaybookData {
  _id?: string;
  businessId?: string;
  upsellCategories: Record<string, any>;
  mentionLowStockUrgency: boolean;
}

export interface FullAgentConfigResponse {
  config: AgentConfigData;
  voice: VoiceSettingsData;
  playbook: SalesPlaybookData;
}

export interface UpdateAgentConfigInput {
  brandVoiceDescription?: string;
  businessArchetype?: string;
  businessSummary?: string;
  customDirectives?: string;
  language?: string;
  idleTimeoutSeconds?: number;
  discountFloorPercent?: number;
  alwaysOfferProductIds?: string[];
  voiceId?: string;
  upsellCategories?: Record<string, any>;
  mentionLowStockUrgency?: boolean;
}

export async function getAgentConfigApi(): Promise<FullAgentConfigResponse> {
  return apiClient<FullAgentConfigResponse>('/agent-config', {
    method: 'GET',
  });
}

export async function updateAgentConfigApi(
  data: UpdateAgentConfigInput,
): Promise<FullAgentConfigResponse> {
  return apiClient<FullAgentConfigResponse>('/agent-config', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
