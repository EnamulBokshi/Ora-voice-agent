'use client';

import { Radio } from 'lucide-react';
import { ConversationItem } from '../conversation-types';
import { cn } from '@/lib/utils';

interface ConversationCardProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ConversationCard({ item, isSelected, onSelect }: ConversationCardProps) {
  const isActive = item.status === 'active';
  const isVoice = item.channel?.toLowerCase().includes('voice');

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'w-full text-left flex gap-3 items-start px-4 py-3 transition-colors cursor-pointer group',
        isSelected
          ? 'bg-surface-high/80 border-l-2 border-l-foreground pl-3.5'
          : 'hover:bg-surface-high/30',
      )}
    >
      {/* Avatar Initial */}
      <div className="w-7 h-7 rounded-full bg-surface-high border border-border flex items-center justify-center font-medium text-[11px] text-foreground shrink-0 mt-0.5 select-none">
        {item.customerName.charAt(0)}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12.5px] font-medium text-foreground truncate">
              {item.customerName}
            </span>
            {isVoice && (
              <Radio size={11} className="text-primary shrink-0" />
            )}
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] shrink-0" />
            )}
          </div>
          <span className="text-[10.5px] text-muted-foreground font-mono tabular-nums shrink-0">
            {item.lastMessageTime}
          </span>
        </div>

        {/* Message Snippet */}
        <p className="text-[11.5px] text-muted-foreground line-clamp-1 group-hover:text-foreground/90 transition-colors">
          {item.previewMessage.replace(/^["']|["']$/g, '')}
        </p>
      </div>
    </button>
  );
}
