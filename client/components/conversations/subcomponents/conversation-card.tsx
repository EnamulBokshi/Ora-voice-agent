'use client';

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
        'w-full text-left flex flex-col gap-1 px-4 py-3 transition-colors cursor-pointer group bg-transparent',
        isSelected
          ? 'bg-surface-high/50 border-l-2 border-l-foreground pl-3.5'
          : 'hover:bg-surface-high/20',
      )}
    >
      {/* Top Row: Customer + Timestamp */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-surface-high border border-border/60 flex items-center justify-center font-bold text-[10px] text-foreground shrink-0 select-none">
            {item.customerName.charAt(0)}
          </div>
          <span className="text-[13px] font-medium text-foreground truncate">
            {item.customerName}
          </span>
        </div>

        <div className="text-[10.5px] font-mono text-muted-foreground shrink-0">
          <span className="tabular-nums">{item.lastMessageTime}</span>
        </div>
      </div>

      {/* Message Snippet */}
      <p className="text-[12px] text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors leading-snug">
        {item.previewMessage.replace(/^["']|["']$/g, '')}
      </p>
    </button>
  );
}
