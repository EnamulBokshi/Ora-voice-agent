export type NotificationCategory = 'all' | 'unread' | 'sales' | 'sync' | 'system';

export interface NotificationItemData {
  id: string;
  title: string;
  description: string;
  category: 'sales' | 'sync' | 'system';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}
