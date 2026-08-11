import { apiClient } from '@/lib/api-client';
import {
  SearchRagDto,
  RagSearchProductsResponse,
  RagSearchKnowledgeResponse,
  RagCombinedResponse,
  ReindexTenantResponse,
} from '@/types/rag';

export async function searchRagProductsApi(
  payload: SearchRagDto,
): Promise<RagSearchProductsResponse> {
  return apiClient<RagSearchProductsResponse>('/rag/search-products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchRagKnowledgeApi(
  payload: SearchRagDto,
): Promise<RagSearchKnowledgeResponse> {
  return apiClient<RagSearchKnowledgeResponse>('/rag/search-knowledge', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchRagCombinedApi(
  payload: SearchRagDto,
): Promise<RagCombinedResponse> {
  return apiClient<RagCombinedResponse>('/rag/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reindexTenantApi(): Promise<ReindexTenantResponse> {
  return apiClient<ReindexTenantResponse>('/rag/reindex-tenant', {
    method: 'POST',
  });
}
