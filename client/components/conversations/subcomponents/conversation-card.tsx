'use client';

import { Mic, MessageSquare } from 'lucide-react';
import { ConversationItem } from '../conversation-types';
import { cn } from '@/lib/utils';

interface ConversationCardProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ConversationCard({ item, isSelected, onSelect }: ConversationCardProps) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'w-full text-left p-3.5 rounded-md border cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-surface-container border-border hover:bg-surface-high'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: 'var(--surface-high)', color: 'var(--foreground)' }}
          >
            {item.customerName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-medium text-foreground leading-tight truncate">
              {item.customerName}
            </h4>
            <p
              className={cn(
                'text-[11px] font-medium flex items-center gap-1 mt-0.5',
                item.status === 'active'
                  ? 'text-primary'
                  : item.status === 'needs_attention'
                    ? 'text-error'
                    : 'text-muted-foreground'
              )}
            >
              {item.channel === 'voice' ? <Mic size={10} /> : <MessageSquare size={10} />}
              {item.status === 'active'
                ? 'Active'
                : item.status === 'needs_attention'
                  ? 'Needs attention'
                  : 'Completed'}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{item.lastMessageTime}</span>
      </div>

      {/* Preview */}
      <p className="text-[12px] text-muted-foreground line-clamp-1">{item.previewMessage}</p>
    </button>
  );
}
