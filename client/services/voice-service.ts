import { apiClient } from '@/lib/api-client';

export interface VoiceSampleResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  error?: string;
}

export async function getVoiceSampleApi(input: {
  voiceId: string;
  sampleText?: string;
}): Promise<VoiceSampleResponse> {
  return apiClient<VoiceSampleResponse>('/voice/preview-sample', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * - `test`: the owner trying their own agent as an anonymous shopper.
 * - `training`: the owner teaching their own agent.
 * - `visitor`: a logged-in merchant on ORA's own platform assistant.
 */
export type VoiceTicketMode = 'test' | 'training' | 'visitor';

/**
 * A single-use, one-minute ticket for `/ws/voice`. Dashboard voice sessions pass
 * this instead of the access token, which must never go in a WebSocket URL.
 */
export async function getVoiceTicketApi(mode: VoiceTicketMode): Promise<string> {
  const res = await apiClient<{ ticket: string; expiresIn: number }>('/voice/ticket', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  return res.ticket;
}
