import { apiClient } from '@/lib/api-client';
import { Customer } from '@/types/customer';

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
