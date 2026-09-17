import { apiClient } from '@/lib/api-client';
import {
  AdminBillingStatsResponse,
  AdminPlanItem,
  CreatePlanPayload,
  AdminSubscriptionsResponse,
  AdminSubscriptionItem,
  UpdateSubscriptionAdminPayload,
  AdminCouponsResponse,
  AdminCouponItem,
  CreateCouponPayload,
  AdminCouponRedemptionsResponse,
} from '@/types/admin-billing';

// ==========================================
// 1. STATS & OVERVIEW
// ==========================================

export async function fetchAdminBillingStats(): Promise<AdminBillingStatsResponse> {
  return apiClient<AdminBillingStatsResponse>('/admin/billing/stats', {
    method: 'GET',
  });
}

// ==========================================
// 2. PLANS MANAGEMENT
// ==========================================

export async function fetchAdminPlans(includeInactive = true): Promise<AdminPlanItem[]> {
  return apiClient<AdminPlanItem[]>(
    `/admin/billing/plans?includeInactive=${includeInactive}`,
    {
      method: 'GET',
    },
  );
}

export async function createAdminPlan(
  payload: CreatePlanPayload,
): Promise<AdminPlanItem> {
  return apiClient<AdminPlanItem>('/admin/billing/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminPlanById(id: string): Promise<AdminPlanItem> {
  return apiClient<AdminPlanItem>(`/admin/billing/plans/${id}`, {
    method: 'GET',
  });
}

export async function updateAdminPlan(
  id: string,
  payload: Partial<CreatePlanPayload>,
): Promise<AdminPlanItem> {
  return apiClient<AdminPlanItem>(`/admin/billing/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminPlan(
  id: string,
): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
  return apiClient<{ deleted: boolean; deactivated: boolean; message: string }>(
    `/admin/billing/plans/${id}`,
    {
      method: 'DELETE',
    },
  );
}

// ==========================================
// 3. RECENT SUBSCRIPTIONS
// ==========================================

export async function fetchAdminSubscriptions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  planId?: string;
  billingProvider?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AdminSubscriptionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.planId && params.planId !== 'all') searchParams.set('planId', params.planId);
  if (params?.billingProvider && params.billingProvider !== 'all')
    searchParams.set('billingProvider', params.billingProvider);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const queryStr = searchParams.toString();
  return apiClient<AdminSubscriptionsResponse>(
    `/admin/billing/subscriptions${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchAdminSubscriptionById(id: string): Promise<{
  subscription: AdminSubscriptionItem;
  business: any;
  plan: AdminPlanItem;
  owner: { email: string; name: string } | null;
  recentTransactions: any[];
  recentInvoices: any[];
}> {
  return apiClient<any>(`/admin/billing/subscriptions/${id}`, {
    method: 'GET',
  });
}

export async function updateAdminSubscription(
  id: string,
  payload: UpdateSubscriptionAdminPayload,
): Promise<AdminSubscriptionItem> {
  return apiClient<AdminSubscriptionItem>(`/admin/billing/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelAdminSubscription(
  id: string,
  immediate = false,
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/admin/billing/subscriptions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ immediate }),
  });
}

// ==========================================
// 4. COUPONS MANAGEMENT
// ==========================================

export async function fetchAdminCoupons(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  discountType?: string;
  currency?: string;
}): Promise<AdminCouponsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.discountType && params.discountType !== 'all')
    searchParams.set('discountType', params.discountType);
  if (params?.currency && params.currency !== 'all') searchParams.set('currency', params.currency);

  const queryStr = searchParams.toString();
  return apiClient<AdminCouponsResponse>(
    `/admin/billing/coupons${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function createAdminCoupon(
  payload: CreateCouponPayload,
): Promise<AdminCouponItem> {
  return apiClient<AdminCouponItem>('/admin/billing/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminCouponById(id: string): Promise<AdminCouponItem> {
  return apiClient<AdminCouponItem>(`/admin/billing/coupons/${id}`, {
    method: 'GET',
  });
}

export async function updateAdminCoupon(
  id: string,
  payload: Partial<CreateCouponPayload>,
): Promise<AdminCouponItem> {
  return apiClient<AdminCouponItem>(`/admin/billing/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCoupon(
  id: string,
): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
  return apiClient<{ deleted: boolean; deactivated: boolean; message: string }>(
    `/admin/billing/coupons/${id}`,
    {
      method: 'DELETE',
    },
  );
}

export async function fetchAdminCouponRedemptions(
  couponId: string,
  params?: { page?: number; limit?: number },
): Promise<AdminCouponRedemptionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryStr = searchParams.toString();
  return apiClient<AdminCouponRedemptionsResponse>(
    `/admin/billing/coupons/${couponId}/redemptions${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}
