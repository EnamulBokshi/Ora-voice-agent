import { apiClient } from '@/lib/api-client';
import { NotificationItemData } from '@/components/notifications/notification-types';

export interface NotificationDto {
  _id: string;
  businessId: string;
  title: string;
  message: string;
  category: 'sales' | 'sync' | 'system';
  severity: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  items: NotificationDto[];
  counts: {
    total: number;
    unread: number;
    sales: number;
    sync: number;
    system: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function mapNotificationToUi(doc: NotificationDto): NotificationItemData {
  let actionUrl: string | undefined;
  let actionLabel: string | undefined;

  if (doc.category === 'sales') {
    actionUrl = '/live-desk';
    actionLabel = 'View Live Desk';
  } else if (doc.category === 'sync') {
    actionUrl = '/agent?tab=products';
    actionLabel = 'View Catalog';
  } else if (doc.category === 'system') {
    actionUrl = '/billing';
    actionLabel = 'View Billing';
  }

  // Format relative timestamp
  const date = new Date(doc.createdAt);
  const diffSecs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  let timestamp = 'Just now';
  if (diffSecs >= 86400) {
    const days = Math.floor(diffSecs / 86400);
    timestamp = `${days}d ago`;
  } else if (diffSecs >= 3600) {
    const hrs = Math.floor(diffSecs / 3600);
    timestamp = `${hrs}h ago`;
  } else if (diffSecs >= 60) {
    const mins = Math.floor(diffSecs / 60);
    timestamp = `${mins}m ago`;
  }

  return {
    id: doc._id,
    title: doc.title,
    description: doc.message,
    category: doc.category,
    timestamp,
    read: doc.read,
    actionUrl,
    actionLabel,
  };
}

export async function getNotificationsApi(params?: {
  category?: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationsListResponse> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'all' && params.category !== 'unread') {
    query.set('category', params.category);
  }
  if (params?.unreadOnly || params?.category === 'unread') {
    query.set('unreadOnly', 'true');
  }
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const qs = query.toString();
  return apiClient<NotificationsListResponse>(`/notifications${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function getUnreadCountApi(): Promise<{ unreadCount: number }> {
  return apiClient<{ unreadCount: number }>('/notifications/unread-count', {
    method: 'GET',
  });
}

export async function markNotificationReadApi(id: string): Promise<NotificationDto> {
  return apiClient<NotificationDto>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsReadApi(): Promise<{ modifiedCount: number }> {
  return apiClient<{ modifiedCount: number }>('/notifications/mark-all-read', {
    method: 'PATCH',
  });
}

export async function dismissNotificationApi(id: string): Promise<{ deleted: boolean }> {
  return apiClient<{ deleted: boolean }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
}

export async function createNotificationApi(payload: {
  title: string;
  message: string;
  category?: 'sales' | 'sync' | 'system';
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}): Promise<NotificationDto> {
  return apiClient<NotificationDto>('/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
