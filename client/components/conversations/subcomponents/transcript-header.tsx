'use client';

import { Mic, MessageSquare } from 'lucide-react';
import { ConversationItem } from '../conversation-types';
import { cn } from '@/lib/utils';

interface TranscriptHeaderProps {
  conversation: ConversationItem;
  onCloseSession?: () => void;
  isClosing?: boolean;
}

export function TranscriptHeader({ conversation, onCloseSession, isClosing }: TranscriptHeaderProps) {
  const conv = conversation;

  return (
    <div className="px-6 py-4 border-b border-border bg-surface-container flex items-center justify-between shrink-0 gap-4 flex-wrap">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-surface-high text-foreground shrink-0">
          {conv.customerName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
            <span className="truncate">{conv.customerName}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-normal border border-border bg-surface-high text-muted-foreground flex items-center gap-1 shrink-0">
              {conv.channel === 'voice' ? <Mic size={11} /> : <MessageSquare size={11} />}
              {conv.channel === 'voice' ? 'Voice' : 'Chat'}
            </span>
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span
              className={cn(
                'flex items-center gap-1 font-medium',
                conv.status === 'active'
                  ? 'text-primary'
                  : conv.status === 'needs_attention'
                    ? 'text-error'
                    : 'text-muted-foreground'
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    conv.status === 'active'
                      ? 'var(--primary)'
                      : conv.status === 'needs_attention'
                        ? 'var(--error)'
                        : 'var(--muted-foreground)',
                }}
              />
              {conv.status === 'active'
                ? 'Active'
                : conv.status === 'needs_attention'
                  ? 'Needs attention'
                  : 'Completed'}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] opacity-80">{conv.sessionRef}</span>
          </div>
        </div>
      </div>

      {conv.status !== 'completed' && onCloseSession && (
        <button
          onClick={onCloseSession}
          disabled={isClosing}
          className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-high text-foreground hover:bg-surface-highest disabled:opacity-50 transition-colors"
        >
          {isClosing ? 'Closing...' : 'Close session'}
        </button>
      )}
    </div>
  );
}
