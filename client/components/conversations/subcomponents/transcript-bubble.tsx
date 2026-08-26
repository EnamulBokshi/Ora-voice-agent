'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ChatMessage } from '../conversation-types';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';

interface TranscriptBubbleProps {
  message: ChatMessage;
  customerName: string;
}

export function TranscriptBubble({ message: msg, customerName }: TranscriptBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isCustomer = msg.sender === 'customer';

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTime = msg.time ? formatTime(msg.time) : '';

  return (
    <div
      className={cn(
        'group flex flex-col gap-1 max-w-[80%]',
        isCustomer ? 'self-end items-end ml-auto' : 'self-start items-start',
      )}
    >
      {/* Sender Name & Timestamp */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
        <span
          className={cn(
            'font-medium',
            isCustomer ? 'text-foreground' : 'text-foreground dark:text-[#C8F031]',
          )}
        >
          {isCustomer ? customerName : 'ORA'}
        </span>
        {displayTime && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/60 tabular-nums">{displayTime}</span>
          </>
        )}
      </div>

      {/* Message Box */}
      <div
        className={cn(
          'relative p-3.5 rounded-md text-[13px] leading-relaxed border',
          isCustomer
            ? 'bg-surface-high/50 border-border/60 text-foreground'
            : 'bg-transparent border-border/50 text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap">{msg.text}</p>
        <button
          onClick={handleCopy}
          className="absolute right-2 bottom-2 p-1 rounded hover:bg-surface-high text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Copy message"
        >
          {copied ? <Check size={10} className="text-foreground dark:text-[#C8F031]" /> : <Copy size={10} />}
        </button>
      </div>
    </div>
  );
}
