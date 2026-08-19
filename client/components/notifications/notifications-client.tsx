'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationItem } from './notification-item';
import { initialNotifications } from '@/lib/demo-notifications';
import { DEMO_MODE_ENABLED } from '@/lib/demo-config';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  dismissNotificationApi,
  mapNotificationToUi,
} from '@/services/notifications-service';
import type { NotificationCategory, NotificationItemData } from './notification-types';

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(
    DEMO_MODE_ENABLED ? initialNotifications : [],
  );
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsApi({ limit: 50 });
      if (res?.items && res.items.length > 0) {
        const mapped = res.items.map(mapNotificationToUi);
        setNotifications(mapped);
      } else if (DEMO_MODE_ENABLED) {
        setNotifications(initialNotifications);
      } else {
        setNotifications([]);
      }
    } catch {
      if (DEMO_MODE_ENABLED) {
        setNotifications(initialNotifications);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const salesCount = notifications.filter((n) => n.category === 'sales').length;
  const syncCount = notifications.filter((n) => n.category === 'sync').length;
  const systemCount = notifications.filter((n) => n.category === 'system').length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (!id.startsWith('demo-') && !id.startsWith('notif-')) {
      await markNotificationReadApi(id).catch(console.error);
    }
  };

  const handleDismiss = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!id.startsWith('demo-') && !id.startsWith('notif-')) {
      await dismissNotificationApi(id).catch(console.error);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsReadApi().catch(console.error);
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'sales') return n.category === 'sales';
    if (activeTab === 'sync') return n.category === 'sync';
    if (activeTab === 'system') return n.category === 'system';
    return true;
  });

  const tabs: { id: NotificationCategory; label: string; count: number }[] = [
    { id: 'all',    label: 'All',            count: notifications.length },
    { id: 'unread', label: 'Unread',         count: unreadCount },
    { id: 'sales',  label: 'Sales & Orders', count: salesCount },
    { id: 'sync',   label: 'Catalog & Sync', count: syncCount },
    { id: 'system', label: 'System & Quota', count: systemCount },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6 bg-background">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Notifications
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Storefront events, shopper conversions, catalog sync updates, and system alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck size={14} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* ── Intercom Style Underline Tabs ── */}
      <div className="flex items-center gap-6 border-b border-border text-[13px] font-medium pt-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-2.5 relative transition-colors flex items-center gap-1.5 whitespace-nowrap',
                isActive
                  ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground/70">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Notification List ── */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground space-y-2">
          <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
          <p className="text-[12px]">Loading notifications...</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-1">
              <Bell size={24} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-[13px] font-medium text-foreground">No notifications in this category</p>
              <p className="text-[12px] text-muted-foreground/60">
                New alerts and storefront activity will appear here automatically.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
