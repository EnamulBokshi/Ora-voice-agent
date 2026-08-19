'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  UserCheck,
  ArrowUpRight,
  Loader2,
  Radio,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import type { LiveFeedSession } from '@/services/live-desk-service';
import { getConversationTranscriptApi } from '@/services/conversations-service';
import type { Message } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface SessionDetailPanelProps {
  session: LiveFeedSession | null;
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center select-none">
      <MessageSquare size={24} className="text-muted-foreground/30" />
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">No session selected</p>
        <p className="text-[11.5px] text-muted-foreground/50 mt-0.5">
          Select a conversation from the feed to view the transcript.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, initial }: { message: Message; initial: string }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3 items-start', !isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center font-medium text-[10px] flex-shrink-0 mt-0.5 select-none',
          isUser
            ? 'bg-surface-high text-muted-foreground border border-border'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {isUser ? initial : 'O'}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-md px-3.5 py-2 text-[12.5px] leading-relaxed',
          isUser
            ? 'bg-surface-high/60 text-foreground border border-border/50'
            : 'bg-surface-lowest text-foreground border border-border',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function SessionDetailPanel({ session }: SessionDetailPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!session?.id) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoading(true);

    getConversationTranscriptApi(session.id)
      .then((res) => {
        if (active && res?.messages) setMessages(res.messages);
      })
      .catch(() => { if (active) setMessages([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [session?.id]);

  if (!session) return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <EmptyState />
    </div>
  );

  const fallbackMessages: Message[] = [
    { _id: 'f1', role: 'user',      content: session.message ?? 'Hi, can you help me find a product in stock?', conversationId: session.id ?? '', timestamp: '' },
    { _id: 'f2', role: 'assistant', content: 'I can help with that! Let me check product availability in our catalog.', conversationId: session.id ?? '', timestamp: '' },
  ];

  const displayMessages = messages.length > 0 ? messages : fallbackMessages;
  const isVoice = session.channel?.toLowerCase().includes('voice');

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Session Header ── */}
      <div className="h-12 px-5 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface-lowest">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 h-6 rounded-full bg-surface-high border border-border flex items-center justify-center font-medium text-[11px] text-foreground flex-shrink-0 select-none">
            {session.initial ?? 'C'}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {session.name ?? 'Customer Session'}
            </span>
            <span className="text-border">·</span>
            <span className="text-[11px] text-muted-foreground font-mono truncate">
              {session.sessionId ?? '#SES-LIVE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          {isVoice && (
            <span className="flex items-center gap-1">
              <Radio size={11} className="text-primary" />
              Voice
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
            Live
          </span>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Product context strip (clean single-line context) */}
        {session.verifiedItem && (
          <div className="px-5 py-2.5 border-b border-border text-[12px] flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Package size={13} className="text-muted-foreground flex-shrink-0" />
              <span className="text-foreground font-medium truncate">
                {session.verifiedItem.name}
              </span>
              <span className="text-border">·</span>
              <span className="font-mono text-foreground font-medium">
                {session.verifiedItem.price}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              {session.verifiedItem.inventory}
            </span>
          </div>
        )}

        {/* Transcript */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
              <span className="text-[12px]">Loading transcript…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {displayMessages.map((m) => (
                <MessageBubble
                  key={m._id}
                  message={m}
                  initial={session.initial ?? 'C'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="px-5 py-3 border-t border-border bg-surface-lowest flex items-center justify-between flex-shrink-0">
        <Link
          href="/conversations"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <UserCheck size={13} />
          Take Over Session
        </Link>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline"
        >
          Customer Profile
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
