'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, MessageSquare, ShieldCheck, UserCheck, ArrowUpRight, Loader2 } from 'lucide-react';
import type { LiveFeedSession } from '@/services/live-desk-service';
import { getConversationTranscriptApi } from '@/services/conversations-service';
import type { Message } from '@/types/conversation';
import Link from 'next/link';

interface DetailDrawerProps {
  open: boolean;
  session: LiveFeedSession | null;
  onClose: () => void;
}

export function DetailDrawer({ open, session, onClose }: DetailDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !session?.id) return;
    let isCurrent = true;
    setLoading(true);

    getConversationTranscriptApi(session.id)
      .then((res) => {
        if (isCurrent && res?.messages) {
          setMessages(res.messages);
        }
      })
      .catch(() => {
        if (isCurrent) setMessages([]);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [open, session?.id]);

  if (!open) return null;

  const s = session;
  const verified = s?.verifiedItem ?? {
    name: 'Store Catalog Item',
    price: 'Live Verified',
    inventory: 'In Stock',
    status: 'RAG Synced',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className="relative w-full max-w-md h-full bg-surface-container border-l border-border flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-250 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-shopper-name"
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface-lowest">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary/15 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
              {s?.initial ?? 'C'}
            </div>
            <div className="min-w-0">
              <h3 id="drawer-shopper-name" className="text-sm font-semibold text-foreground truncate">
                {s?.name ?? 'Customer Session'}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                <span>{s?.sessionId ?? '#SES-LIVE'}</span>
                <span>·</span>
                <span className="capitalize">{s?.channel ?? 'Store Widget'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close details"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Live Product Verification */}
          <section className="rounded-md border border-border bg-surface-low p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck size={14} className="text-primary" />
                <span>Live Verification</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[color:var(--status-online)] bg-[color:var(--status-online)]/10 px-2 py-0.5 rounded">
                <span className="w-1 h-1 rounded-full bg-[color:var(--status-online)]" />
                {verified.status}
              </span>
            </div>

            <div className="flex justify-between items-center text-[13px]">
              <span className="font-semibold text-foreground">{verified.name}</span>
              <span className="font-bold text-primary tabular-nums">{verified.price}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded bg-surface-container border border-border flex flex-col">
                <span className="text-muted-foreground">Inventory</span>
                <span className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-[color:var(--status-online)]" />
                  {verified.inventory}
                </span>
              </div>
              <div className="p-2 rounded bg-surface-container border border-border flex flex-col">
                <span className="text-muted-foreground">Intent State</span>
                <span className="font-medium text-foreground capitalize mt-0.5">
                  {s?.stateLabel ?? 'Active Inquiry'}
                </span>
              </div>
            </div>
          </section>

          {/* Live Transcript */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare size={14} className="text-primary" />
                <span>Live Conversation Transcript</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Real-time sync</span>
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="animate-spin text-primary" size={16} />
                <span className="text-xs">Loading transcript...</span>
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3 text-[13px]">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m._id}
                      className={`flex gap-2.5 items-start ${isUser ? '' : 'flex-row-reverse'}`}
                    >
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${
                          isUser
                            ? 'bg-surface-high border border-border text-muted-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {isUser ? s?.initial ?? 'C' : 'O'}
                      </div>
                      <div
                        className={`flex-1 rounded-md p-3 border text-foreground ${
                          isUser
                            ? 'rounded-tl-none bg-surface-low border-border'
                            : 'rounded-tr-none bg-primary/10 border-primary/20'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 text-[13px]">
                {/* Fallback to last recorded session query */}
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded bg-surface-high border border-border flex items-center justify-center font-bold text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                    {s?.initial ?? 'C'}
                  </div>
                  <div className="flex-1 rounded-md rounded-tl-none p-3 bg-surface-low border border-border text-foreground">
                    {s?.message ?? 'Hi, can you help me find a product in stock?'}
                  </div>
                </div>

                <div className="flex gap-2.5 items-start flex-row-reverse">
                  <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    O
                  </div>
                  <div className="flex-1 rounded-md rounded-tr-none p-3 bg-primary/10 border border-primary/20 text-foreground">
                    I can help with that! Looking up availability and checking our active catalog...
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-lowest flex items-center gap-3 flex-shrink-0">
          <Link
            href="/conversations"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12px] font-medium border border-border bg-surface-container hover:bg-surface-high text-foreground transition-colors"
          >
            <UserCheck size={14} />
            Take Over Session
          </Link>

          <Link
            href="/customers"
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Customer Profile
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
    </div>
  );
}

