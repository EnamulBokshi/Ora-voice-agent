import { apiClient } from '@/lib/api-client';
import type { BusinessArchetype } from '@/lib/archetypes';

export interface AgentConfigData {
  _id?: string;
  businessId?: string;
  brandVoiceDescription: string;
  /** The profile this config belongs to. Read-only: switch profiles to change it. */
  archetype?: BusinessArchetype;
  businessSummary?: string;
  customDirectives?: string;
  systemPrompt?: string;
  greetingMessage?: string;
  avoidances?: string;
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
  /** The profile currently serving traffic. */
  activeArchetype: BusinessArchetype;
  config: AgentConfigData;
  voice: VoiceSettingsData;
  playbook: SalesPlaybookData;
}

/**
 * Attributes of the live profile. The archetype is absent on purpose: it
 * identifies the profile rather than describing it, so it is changed with
 * `switchArchetypeApi`, which swaps profiles instead of editing this one.
 */
export interface UpdateAgentConfigInput {
  brandVoiceDescription?: string;
  businessSummary?: string;
  customDirectives?: string;
  systemPrompt?: string;
  greetingMessage?: string;
  avoidances?: string;
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

export interface AgentProfileSummary {
  archetype: BusinessArchetype;
  /** Whether the merchant has already put anything into this profile. */
  isConfigured: boolean;
  updatedAt?: string;
}

export interface AgentProfilesResponse {
  activeArchetype: BusinessArchetype;
  profiles: AgentProfileSummary[];
}

export async function getAgentProfilesApi(): Promise<AgentProfilesResponse> {
  return apiClient<AgentProfilesResponse>('/agent-config/profiles', {
    method: 'GET',
  });
}

/**
 * Makes a different profile live. The profile being left is kept as it is and
 * comes back intact when the merchant switches back — nothing is cleared.
 */
export async function switchArchetypeApi(
  archetype: BusinessArchetype,
): Promise<FullAgentConfigResponse> {
  return apiClient<FullAgentConfigResponse>('/agent-config/archetype', {
    method: 'POST',
    body: JSON.stringify({ archetype }),
  });
}
