'use client';

import { cn } from '@/lib/utils';
import { ChatMessage } from '../conversation-types';

interface TranscriptBubbleProps {
  message: ChatMessage;
  customerName: string;
}

export function TranscriptBubble({ message: msg, customerName }: TranscriptBubbleProps) {
  if (msg.sender === 'customer') {
    return (
      <div className="flex items-end gap-2.5 self-start max-w-[80%]">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold bg-surface-high text-foreground shrink-0">
          {customerName.charAt(0).toUpperCase()}
        </span>
        <div className="rounded-lg rounded-bl-sm p-3 border border-border bg-surface-high text-sm text-foreground leading-relaxed">
          <p>{msg.text}</p>
          {msg.time && (
            <p className="text-[10px] text-muted-foreground mt-1.5">{msg.time}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 self-end max-w-[85%] flex-row-reverse">
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold bg-primary text-primary-foreground shrink-0">
        O
      </span>
      <div
        className={cn(
          'rounded-lg rounded-br-sm p-3 text-sm leading-relaxed',
          'bg-primary/10 border border-primary/25 text-foreground'
        )}
      >
        <p>{msg.text}</p>
        {msg.time && <p className="text-[10px] text-muted-foreground mt-1.5">{msg.time}</p>}
      </div>
    </div>
  );
}
