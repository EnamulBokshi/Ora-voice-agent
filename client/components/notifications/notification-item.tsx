'use client';

import Link from 'next/link';
import {
  ShoppingBag,
  RefreshCw,
  MessageSquare,
  Shield,
  ArrowRight,
  Check,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationItemData } from './notification-types';

interface NotificationItemProps {
  item: NotificationItemData;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function CategoryIcon({ category }: { category: NotificationItemData['category'] }) {
  switch (category) {
    case 'sales':
      return <ShoppingBag size={14} className="text-foreground" />;
    case 'sync':
      return <RefreshCw size={14} className="text-muted-foreground" />;
    case 'system':
      return <Shield size={14} className="text-muted-foreground" />;
    default:
      return <MessageSquare size={14} className="text-muted-foreground" />;
  }
}

export function NotificationItem({
  item,
  onMarkAsRead,
  onDismiss,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-4 py-4 px-2 hover:bg-surface-high/30 transition-colors -mx-2 rounded-sm',
        !item.read && 'bg-surface-high/15',
      )}
    >
      {/* Category Icon */}
      <div className="w-8 h-8 rounded-full bg-surface-high border border-border flex items-center justify-center shrink-0 mt-0.5 select-none">
        <CategoryIcon category={item.category} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-[13px] font-medium text-foreground truncate">
              {item.title}
            </h4>
            {!item.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">
            {item.timestamp}
          </span>
        </div>

        <p className="text-[12px] text-muted-foreground leading-normal">
          {item.description}
        </p>

        {/* Action Link (if provided) */}
        {item.actionUrl && (
          <div className="mt-2">
            <Link
              href={item.actionUrl}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-foreground hover:underline"
            >
              <span>{item.actionLabel || 'View details'}</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* Actions on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!item.read && (
          <button
            onClick={() => onMarkAsRead(item.id)}
            title="Mark as read"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <Check size={13} />
          </button>
        )}
        <button
          onClick={() => onDismiss(item.id)}
          title="Dismiss notification"
          className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
