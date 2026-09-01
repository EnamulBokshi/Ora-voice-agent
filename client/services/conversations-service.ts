import { apiClient } from '@/lib/api-client';
import {
  ConversationsPaginatedResponse,
  ConversationTranscriptResponse,
  Conversation,
} from '@/types/conversation';

export type { Conversation } from '@/types/conversation';

export async function getConversationsApi(params?: {
  page?: number;
  limit?: number;
}): Promise<ConversationsPaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const queryString = query.toString();
  const url = `/conversations${queryString ? `?${queryString}` : ''}`;

  return apiClient<ConversationsPaginatedResponse>(url, {
    method: 'GET',
  });
}

export async function getConversationTranscriptApi(
  id: string,
): Promise<ConversationTranscriptResponse> {
  return apiClient<ConversationTranscriptResponse>(`/conversations/${id}`, {
    method: 'GET',
  });
}

export async function closeConversationApi(id: string): Promise<Conversation> {
  return apiClient<Conversation>(`/conversations/${id}/close`, {
    method: 'POST',
  });
}
