import { apiClient } from '@/lib/api-client';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Order {
  _id: string;
  businessId: string;
  orderNumber: string;
  customerId?: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'canceled';
  shippingAddress?: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  customerId?: string;
  items: OrderItem[];
  totalAmount: number;
  currency?: string;
  shippingAddress?: ShippingAddress;
  metadata?: Record<string, any>;
}

export interface OrdersPaginatedResponse {
  items: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getOrdersApi(params?: {
  page?: number;
  limit?: number;
}): Promise<OrdersPaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const queryString = query.toString();
  const url = `/orders${queryString ? `?${queryString}` : ''}`;

  return apiClient<OrdersPaginatedResponse>(url, {
    method: 'GET',
  });
}

export async function getOrderByIdApi(id: string): Promise<Order> {
  return apiClient<Order>(`/orders/${id}`, {
    method: 'GET',
  });
}

export async function createOrderApi(payload: CreateOrderPayload): Promise<Order> {
  return apiClient<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOrderStatusApi(
  id: string,
  status: Order['status'],
): Promise<Order> {
  return apiClient<Order>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
