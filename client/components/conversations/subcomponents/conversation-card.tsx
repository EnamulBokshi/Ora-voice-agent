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
  const isActive = item.status === 'active';
  const isNeedsAttention = item.status === 'needs_attention';

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'group relative w-full text-left p-3 rounded-md border cursor-pointer transition-all duration-150',
        isSelected
          ? 'bg-primary/10 border-primary/40 shadow-xs'
          : 'bg-surface-low border-border hover:bg-surface-high hover:border-border/80',
      )}
    >
      {/* Active Left Indicator Bar */}
      {isSelected && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-primary" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <span
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold uppercase',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-surface-high text-foreground',
              )}
            >
              {item.customerName.charAt(0)}
            </span>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <h4
              className={cn(
                'text-xs font-semibold truncate leading-tight transition-colors',
                isSelected ? 'text-primary' : 'text-foreground group-hover:text-foreground',
              )}
            >
              {item.customerName}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                {item.channel === 'voice' ? <Mic size={10} /> : <MessageSquare size={10} />}
                <span className="capitalize">{item.channel}</span>
              </span>
              <span>·</span>
              <span
                className={cn(
                  'font-medium',
                  isActive
                    ? 'text-primary'
                    : isNeedsAttention
                    ? 'text-[color:var(--status-warning)]'
                    : 'text-muted-foreground',
                )}
              >
                {isActive ? 'Live' : isNeedsAttention ? 'Attention' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
          {item.lastMessageTime}
        </span>
      </div>

      {/* Preview Snippet */}
      <p className="text-[11px] text-muted-foreground line-clamp-1 pl-9 mt-1 leading-normal">
        {item.previewMessage}
      </p>
    </button>
  );
}
