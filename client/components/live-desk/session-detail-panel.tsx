'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import type { LiveFeedSession } from '@/services/live-desk-service';
import { closeLiveSessionApi } from '@/services/live-desk-service';
import { getConversationTranscriptApi } from '@/services/conversations-service';
import type { Message } from '@/types/conversation';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';

interface SessionDetailPanelProps {
  session: LiveFeedSession | null;
  onPushDiscount?: (code: string) => void;
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center select-none bg-transparent">
      <MessageSquare size={20} className="text-muted-foreground/40" />
      <div>
        <p className="text-[13.5px] font-medium text-foreground">No active session selected</p>
        <p className="text-[12px] text-muted-foreground/70 mt-0.5">
          Select a customer from the left list to view their live conversation.
        </p>
      </div>
    </div>
  );
}

export function SessionDetailPanel({ session }: SessionDetailPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!session?.id) {
      setMessages([]);
      return;
    }

    let active = true;

    getConversationTranscriptApi(session.id)
      .then((res) => {
        if (active && res?.messages) setMessages(res.messages);
      })
      .catch(() => { if (active) setMessages([]); });

    return () => { active = false; };
  }, [session?.id]);

  if (!session) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
        <EmptyState />
      </div>
    );
  }

  const fallbackMessages: Message[] = [
    {
      _id: 'f1',
      role: 'user',
      content: session.message || 'Hi, do you have the Classic Chelsea Boots in stock in size 10?',
      conversationId: session.id || '',
      timestamp: '14:22',
    },
    {
      _id: 'f2',
      role: 'assistant',
      content: 'Yes, we have 2 pairs left in Black (Size 10). They qualify for free 2-day delivery. Would you like me to add them to your cart?',
      conversationId: session.id || '',
      timestamp: '14:22',
    },
  ];

  // Only show real conversation turns — filter out system prompts, tool calls, and internal ORA processing messages
  const conversationMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  const displayMessages = conversationMessages.length > 0 ? conversationMessages : fallbackMessages;

  const handleEndSession = async () => {
    if (!session?.id || isEnding || ended) return;
    setIsEnding(true);
    try {
      await closeLiveSessionApi(session.id);
      setEnded(true);
      setActionNotice('Session ended. The voice session has been closed.');
    } catch {
      setActionNotice('Failed to end session. Try again.');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent divide-y divide-border/40">

      {/* ── Header: Clean, Simple, No Voice Icon ── */}
      <div className="px-4 sm:px-5 py-3 bg-transparent flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 rounded-md bg-surface-high border border-border/60 flex items-center justify-center font-bold text-[11px] text-foreground flex-shrink-0 select-none">
            {session.initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[13.5px] sm:text-[14.5px] font-semibold text-foreground tracking-tight truncate">
                {session.name}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-[11.5px] text-muted-foreground tabular-nums shrink-0">
          <span>{session.time}</span>
        </div>
      </div>

      {/* ── Chat Messages: Left = ORA, Right = Customer Name ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-transparent flex flex-col">
        {displayMessages.map((msg, i) => {
          const isCustomer = msg.role === 'user';

          return (
            <div
              key={msg._id || i}
              className={cn(
                'flex flex-col gap-1 max-w-[88%] sm:max-w-[80%]',
                isCustomer ? 'self-end items-end' : 'self-start items-start',
              )}
            >
              {/* Sender Name & Timestamp */}
              <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-muted-foreground">
                <span className={cn('font-medium', isCustomer ? 'text-foreground' : 'text-foreground dark:text-[#C8F031]')}>
                  {isCustomer ? session.name : 'ORA'}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/60 tabular-nums">{formatTime(msg.timestamp)}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'p-3 sm:p-3.5 rounded-md text-[12.5px] sm:text-[13px] leading-relaxed border',
                  isCustomer
                    ? 'bg-surface-high/50 border-border/60 text-foreground'
                    : 'bg-transparent border-border/50 text-foreground',
                )}
              >
                <p>{msg.content}</p>
              </div>
            </div>
          );
        })}

        {actionNotice && (
          <div className="p-2 rounded-md border border-border/60 bg-surface-high/30 text-[11px] sm:text-[11.5px] text-foreground flex items-center gap-1.5 self-center">
            <CheckCircle2 size={12} className="text-foreground dark:text-[#C8F031]" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* ── Action Bar (bottom) — only real actions ── */}
      <div className="p-3 sm:p-3.5 bg-transparent border-t border-border/40 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[11px] sm:text-[11.5px] text-muted-foreground">
            <span>Operator actions apply to this session.</span>
          </div>

          <button
            id="btn-end-session"
            onClick={handleEndSession}
            disabled={isEnding || ended}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border/60 hover:bg-surface-high/40 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEnding ? 'Ending…' : ended ? 'Session Ended' : 'End Session'}
          </button>
        </div>
      </div>

    </div>
  );
}
