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
