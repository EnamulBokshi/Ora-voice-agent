import { apiClient } from '@/lib/api-client';
import {
  ProductDocument,
  QueryProductsParams,
  ProductsResponseData,
  UpdateProductOverridePayload,
  BatchSyncProductsPayload,
  BatchSyncResponseData,
  VerifyLivePayload,
  VerifyLiveResponse,
} from '@/types/product';

export async function getProductsApi(
  params?: QueryProductsParams,
): Promise<ProductsResponseData> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.availability) query.set('availability', params.availability);

  const queryString = query.toString();
  const url = `/products${queryString ? `?${queryString}` : ''}`;

  return apiClient<ProductsResponseData>(url, {
    method: 'GET',
  });
}

export async function getProductByIdApi(id: string): Promise<ProductDocument> {
  return apiClient<ProductDocument>(`/products/${id}`, {
    method: 'GET',
  });
}

export async function manualOverrideProductApi(
  id: string,
  payload: UpdateProductOverridePayload,
): Promise<ProductDocument> {
  return apiClient<ProductDocument>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function batchSyncProductsApi(
  payload: BatchSyncProductsPayload,
): Promise<BatchSyncResponseData> {
  return apiClient<BatchSyncResponseData>('/products/batch-sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyLiveProductApi(
  id: string,
  liveData?: VerifyLivePayload,
): Promise<VerifyLiveResponse> {
  return apiClient<VerifyLiveResponse>(`/products/${id}/verify-live`, {
    method: 'POST',
    body: liveData ? JSON.stringify(liveData) : JSON.stringify({}),
  });
}

export async function deleteProductApi(
  id: string,
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
}
