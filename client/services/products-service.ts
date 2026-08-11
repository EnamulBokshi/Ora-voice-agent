import { apiClient } from '@/lib/api-client';
import {
  ProductDocument,
  ProductsResponseData,
  QueryProductsParams,
  CreateProductPayload,
  BatchSyncProductsPayload,
  BatchSyncResponseData,
  ProductAvailability,
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

export async function createProductApi(
  payload: CreateProductPayload,
): Promise<ProductDocument> {
  return apiClient<ProductDocument>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProductApi(
  id: string,
  payload: Partial<CreateProductPayload>,
): Promise<ProductDocument> {
  return apiClient<ProductDocument>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProductApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
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
  liveData: {
    price?: number;
    stockQuantity?: number;
    availability?: ProductAvailability;
  },
): Promise<ProductDocument> {
  return apiClient<ProductDocument>(`/products/${id}/verify-live`, {
    method: 'POST',
    body: JSON.stringify(liveData),
  });
}
