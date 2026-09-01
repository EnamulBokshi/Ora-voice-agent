'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
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
      <div className="group flex items-start gap-3 self-start max-w-[80%]">
        <div className="w-6 h-6 rounded-full bg-surface-high border border-border flex items-center justify-center font-medium text-[10px] text-foreground shrink-0 mt-0.5 select-none">
          {customerName.charAt(0)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium text-foreground">{customerName}</span>
            {msg.time && (
              <span className="text-[10px] font-mono text-muted-foreground">{msg.time}</span>
            )}
          </div>
          <div className="relative rounded-md px-3.5 py-2.5 bg-surface-high/60 border border-border/50 text-[12.5px] text-foreground leading-relaxed">
            <p className="whitespace-pre-wrap">{msg.text}</p>
            <button
              onClick={handleCopy}
              className="absolute right-2 bottom-2 p-1 rounded hover:bg-surface-high text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
    <div className="group flex items-start gap-3 self-end max-w-[80%] flex-row-reverse">
      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 select-none">
        O
      </div>
      <div className="space-y-1 text-right">
        <div className="flex items-center justify-end gap-2">
          {msg.time && (
            <span className="text-[10px] font-mono text-muted-foreground">{msg.time}</span>
          )}
          <span className="text-[11.5px] font-medium text-foreground">ORA</span>
        </div>
        <div className="relative text-left rounded-md px-3.5 py-2.5 bg-surface-lowest border border-border text-[12.5px] text-foreground leading-relaxed">
          <p className="whitespace-pre-wrap">{msg.text}</p>
          <button
            onClick={handleCopy}
            className="absolute right-2 bottom-2 p-1 rounded hover:bg-surface-high text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy message"
          >
            {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
          </button>
        </div>
      </div>
    </div>
  );
}
