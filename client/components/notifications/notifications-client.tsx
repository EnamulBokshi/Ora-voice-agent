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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (!id.startsWith('demo-') && !id.startsWith('notif-')) {
      await markNotificationReadApi(id).catch(console.error);
    }
  };

  const handleDismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!id.startsWith('demo-') && !id.startsWith('notif-')) {
      await dismissNotificationApi(id).catch(console.error);
    }
  };

  const handleMarkAllRead = async () => {
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
    { id: 'all',    label: 'All Activity',   count: notifications.length },
    { id: 'unread', label: 'Unread',         count: unreadCount },
    { id: 'sales',  label: 'Sales & Orders', count: salesCount },
    { id: 'sync',   label: 'Catalog & Sync', count: syncCount },
    { id: 'system', label: 'System & Quota', count: systemCount },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full bg-background">
      <div className="w-full px-4 sm:px-6 py-5 space-y-6">

        {/* ── Editorial Header (Matching Universal ORA Standard) ── */}
        <div className="border-b border-border/40 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
                  <Bell size={14} className="text-foreground" />
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground font-serif tracking-tight leading-[1.2] mb-1.5">
                Notifications & Alerts
              </h1>

              <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
                Storefront events, shopper conversions, catalog sync updates, and system alerts.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-border/60 bg-surface-high/40 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Intercom Style Underline Tabs ── */}
        <div className="border-b border-border/40 pb-0">
          <div className="flex items-center gap-6 text-[13px] font-medium -mb-px overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'pb-3 relative transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10.5px] font-mono text-muted-foreground/70 tabular-nums">
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Notification List in Global Border Card ── */}
        <div className="rounded-md border border-border/50 bg-transparent overflow-hidden">
          {/* Section Sub-Header */}
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
                Activity Feed
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Loader2 size={18} className="mx-auto animate-spin text-muted-foreground" />
              <p className="text-[12.5px]">Loading notifications…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-1 p-6">
              <Bell size={22} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-[13.5px] font-semibold text-foreground font-serif">No notifications in this category</p>
              <p className="text-[12px] text-muted-foreground/70 max-w-sm mx-auto">
                New storefront conversions, catalog sync notices, and system alerts will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filtered.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  onMarkAsRead={handleMarkAsRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
