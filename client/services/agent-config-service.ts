import { apiClient } from '@/lib/api-client';
import {
  CombinedAgentConfig,
  UpdateAgentConfigPayload,
} from '@/types/agent-config';

export async function getAgentConfigApi(): Promise<CombinedAgentConfig> {
  return apiClient<CombinedAgentConfig>('/agent-config', {
    method: 'GET',
  });
}

export async function updateAgentConfigApi(
  payload: UpdateAgentConfigPayload,
): Promise<CombinedAgentConfig> {
  return apiClient<CombinedAgentConfig>('/agent-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
