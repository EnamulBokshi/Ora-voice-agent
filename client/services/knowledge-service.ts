import { apiClient } from '@/lib/api-client';
import {
  KnowledgeDoc,
  KnowledgeChunk,
  CreateKnowledgeDocPayload,
  CreateKnowledgeDocResponseData,
  UpdateKnowledgeDocResponseData,
} from '@/types/knowledge';

export async function getKnowledgeDocsApi(params?: {
  docType?: string;
  search?: string;
}): Promise<KnowledgeDoc[]> {
  const query = new URLSearchParams();
  if (params?.docType) query.set('docType', params.docType);
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString();
  const url = `/knowledge${queryString ? `?${queryString}` : ''}`;

  return apiClient<KnowledgeDoc[]>(url, {
    method: 'GET',
  });
}

export async function getKnowledgeDocByIdApi(id: string): Promise<KnowledgeDoc> {
  return apiClient<KnowledgeDoc>(`/knowledge/${id}`, {
    method: 'GET',
  });
}

export async function getKnowledgeDocChunksApi(
  id: string,
): Promise<KnowledgeChunk[]> {
  return apiClient<KnowledgeChunk[]>(`/knowledge/${id}/chunks`, {
    method: 'GET',
  });
}

export async function createKnowledgeDocApi(
  payload: CreateKnowledgeDocPayload,
): Promise<CreateKnowledgeDocResponseData> {
  return apiClient<CreateKnowledgeDocResponseData>('/knowledge', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateKnowledgeDocApi(
  id: string,
  payload: Partial<CreateKnowledgeDocPayload>,
): Promise<UpdateKnowledgeDocResponseData> {
  return apiClient<UpdateKnowledgeDocResponseData>(`/knowledge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeDocApi(
  id: string,
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/knowledge/${id}`, {
    method: 'DELETE',
  });
}
