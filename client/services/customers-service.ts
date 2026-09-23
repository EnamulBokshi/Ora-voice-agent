import { apiClient } from '@/lib/api-client';
import {
  Customer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '@/types/customer';

export async function getCustomersApi(search?: string): Promise<Customer[]> {
  const query = new URLSearchParams();
  if (search) query.set('search', search);

  const queryString = query.toString();
  const url = `/customers${queryString ? `?${queryString}` : ''}`;

  return apiClient<Customer[]>(url, {
    method: 'GET',
  });
}

export async function getCustomerByIdApi(id: string): Promise<Customer> {
  return apiClient<Customer>(`/customers/${id}`, {
    method: 'GET',
  });
}

export async function createCustomerApi(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  return apiClient<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomerApi(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  return apiClient<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function shopperErasureApi(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/customers/${id}/erasure`, {
    method: 'POST',
  });
}

