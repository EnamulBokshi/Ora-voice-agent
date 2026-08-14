import { apiClient } from '@/lib/api-client';
import {
  KnowledgeDoc,
  KnowledgeChunk,
  CreateKnowledgeDocPayload,
  CreateKnowledgeDocResponseData,
  UpdateKnowledgeDocResponseData,
} from '@/types/knowledge';

export interface KnowledgeDocsPaginatedResponse {
  items: KnowledgeDoc[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getKnowledgeDocsApi(params?: {
  docType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<KnowledgeDoc[]> {
  const query = new URLSearchParams();
  if (params?.docType) query.set('docType', params.docType);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const queryString = query.toString();
  const url = `/knowledge${queryString ? `?${queryString}` : ''}`;

  const res = await apiClient<KnowledgeDoc[] | KnowledgeDocsPaginatedResponse>(url, {
    method: 'GET',
  });

  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray((res as KnowledgeDocsPaginatedResponse).items)) {
    return (res as KnowledgeDocsPaginatedResponse).items;
  }
  return [];
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

export async function uploadKnowledgeFileApi(
  file: File,
  docType?: string,
  title?: string,
): Promise<CreateKnowledgeDocResponseData> {
  const formData = new FormData();
  formData.append('file', file);
  if (docType) formData.append('docType', docType);
  if (title) formData.append('title', title);

  return apiClient<CreateKnowledgeDocResponseData>('/knowledge/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteKnowledgeDocApi(
  id: string,
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/knowledge/${id}`, {
    method: 'DELETE',
  });
}
