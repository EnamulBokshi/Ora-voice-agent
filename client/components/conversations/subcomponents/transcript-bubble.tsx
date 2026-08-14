'use client';

import { useState } from 'react';
import { Bot, User, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../conversation-types';

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

  if (isCustomer) {
    return (
      <div className="group flex items-start gap-3 self-start max-w-[85%] sm:max-w-[75%]">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase bg-surface-high border border-border text-foreground shrink-0 mt-0.5">
          {customerName.charAt(0)}
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground">{customerName}</span>
            {msg.time && (
              <span className="text-[10px] font-mono text-muted-foreground">{msg.time}</span>
            )}
          </div>
          <div className="relative rounded-md p-3.5 border border-border bg-surface-container text-xs text-foreground leading-relaxed shadow-xs">
            <p className="whitespace-pre-wrap">{msg.text}</p>
            <button
              onClick={handleCopy}
              className="absolute right-2 bottom-2 p-1 rounded bg-surface-high text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy message"
            >
              {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 self-end max-w-[85%] sm:max-w-[75%] flex-row-reverse">
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground shrink-0 mt-0.5">
        O
      </span>
      <div className="space-y-1 text-right">
        <div className="flex items-center justify-end gap-2">
          {msg.time && (
            <span className="text-[10px] font-mono text-muted-foreground">{msg.time}</span>
          )}
          <span className="text-[11px] font-semibold text-primary">ORA Agent</span>
        </div>
        <div className="relative text-left rounded-md p-3.5 border border-primary/20 bg-primary/10 text-xs text-foreground leading-relaxed shadow-xs">
          <p className="whitespace-pre-wrap">{msg.text}</p>
          <button
            onClick={handleCopy}
            className="absolute right-2 bottom-2 p-1 rounded bg-surface-high text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy message"
          >
            {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
}
