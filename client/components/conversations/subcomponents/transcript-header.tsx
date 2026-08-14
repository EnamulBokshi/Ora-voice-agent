'use client';

import { useState } from 'react';
import { Mic, MessageSquare, Check, Copy, PowerOff } from 'lucide-react';
import { ConversationItem } from '../conversation-types';
import { cn } from '@/lib/utils';

interface TranscriptHeaderProps {
  conversation: ConversationItem;
  onCloseSession?: () => void;
  isClosing?: boolean;
}

export function TranscriptHeader({ conversation, onCloseSession, isClosing }: TranscriptHeaderProps) {
  const conv = conversation;
  const [copied, setCopied] = useState(false);
  const isActive = conv.status === 'active';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(conv.sessionRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-5 py-3.5 border-b border-border bg-surface-container flex items-center justify-between shrink-0 gap-4 flex-wrap">
      {/* Customer & Session Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase bg-surface-high border border-border text-foreground">
            {conv.customerName.charAt(0)}
          </span>
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {conv.customerName}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-surface-low text-muted-foreground flex items-center gap-1 shrink-0">
              {conv.channel === 'voice' ? <Mic size={11} /> : <MessageSquare size={11} />}
              <span className="capitalize">{conv.channel} Session</span>
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span
              className={cn(
                'flex items-center gap-1 font-medium text-[11px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground',
                )}
              />
              {isActive ? 'Session Active' : 'Session Concluded'}
            </span>
            <span>·</span>
            <button
              onClick={handleCopyRef}
              title="Click to copy session reference ID"
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>{conv.sessionRef}</span>
              {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isActive && onCloseSession && (
          <button
            onClick={onCloseSession}
            disabled={isClosing}
            className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-surface-low text-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PowerOff size={12} />
            <span>{isClosing ? 'Closing...' : 'Close Session'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
