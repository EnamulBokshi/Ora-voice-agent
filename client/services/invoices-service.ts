import { apiClient } from '@/lib/api-client';
import {
  Invoice,
  InvoicesPaginatedResponse,
  ResendInvoiceResponse,
} from '@/types/invoices';

export async function getInvoicesApi(params?: {
  page?: number;
  limit?: number;
}): Promise<InvoicesPaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const queryString = query.toString();
  const url = `/invoices${queryString ? `?${queryString}` : ''}`;

  return apiClient<InvoicesPaginatedResponse>(url, {
    method: 'GET',
  });
}

export async function getInvoiceByIdApi(id: string): Promise<Invoice> {
  return apiClient<Invoice>(`/invoices/${id}`, {
    method: 'GET',
  });
}

export async function resendInvoiceApi(
  id: string,
): Promise<ResendInvoiceResponse> {
  return apiClient<ResendInvoiceResponse>(`/invoices/${id}/resend`, {
    method: 'POST',
  });
}
