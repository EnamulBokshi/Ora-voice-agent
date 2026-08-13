'use client';

import {
  Users,
  MessagesSquare,
  HelpCircle,
  CreditCard,
  Search,
  Bell,
  ChevronRight,
  ArrowRight,
  Settings2,
  ShoppingBag,
  Plug,
  Mic,
  Brain,
  Webhook,
} from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatCard } from '@/components/live-desk/stat-card';
import { ConversationRow, ConversationRowData } from '@/components/live-desk/conversation-row';
import { ChannelStatusItem, ChannelStatusItemData } from '@/components/live-desk/channel-status-item';

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockConversations: ConversationRowData[] = [
  {
    id: 'c1',
    customerName: 'Nadia Rahman',
    customerInitials: 'NR',
    sessionStart: 'Started 4m ago',
    channel: 'voice',
    intent: '"Does the leather tote come in tan?"',
    waitTime: '0:12',
    status: 'active',
  },
  {
    id: 'c2',
    customerName: 'Sarah Chen',
    customerInitials: 'SC',
    sessionStart: 'Started 11m ago',
    channel: 'widget',
    intent: '"Compare the pour-over set vs the French press"',
    waitTime: '0:38',
    status: 'active',
  },
  {
    id: 'c3',
    customerName: 'Omar Faruq',
    customerInitials: 'OF',
    sessionStart: 'Started 23m ago',
    channel: 'voice',
    intent: '"Is the Wool Throw available for preorder?"',
    waitTime: '2:04',
    status: 'idle',
  },
  {
    id: 'c4',
    customerName: 'Priya Mehta',
    customerInitials: 'PM',
    sessionStart: 'Started 31m ago',
    channel: 'widget',
    intent: '"Refund status for order ORD-2026-000088"',
    waitTime: '—',
    status: 'awaiting_verify',
  },
  {
    id: 'c5',
    customerName: 'James Okafor',
    customerInitials: 'JO',
    sessionStart: 'Started 1h ago',
    channel: 'chat',
    intent: '"Couldn\'t complete checkout — payment failed"',
    waitTime: '—',
    status: 'escalated',
  },
  {
    id: 'c6',
    customerName: 'Lin Xia',
    customerInitials: 'LX',
    sessionStart: 'Started 1h 14m ago',
    channel: 'voice',
    intent: '"Do you ship to Hong Kong?"',
    waitTime: '0:05',
    status: 'active',
  },
  {
    id: 'c7',
    customerName: 'Tariq Hossain',
    customerInitials: 'TH',
    sessionStart: 'Started 2h ago',
    channel: 'widget',
    intent: '"What\'s included in the ceramic set?"',
    waitTime: '4:51',
    status: 'idle',
  },
];

const mockChannels: ChannelStatusItemData[] = [
  {
    id: 'ch1',
    name: 'Shopify Store',
    icon: <ShoppingBag size={15} />,
    detail: 'Last synced 3 min ago · 412 products indexed',
    status: 'active',
  },
  {
    id: 'ch2',
    name: 'WooCommerce Feed',
    icon: <Plug size={15} />,
    detail: 'Feed parser running · next poll in 7 min',
    status: 'available',
  },
  {
    id: 'ch3',
    name: 'Voice Gateway',
    icon: <Mic size={15} />,
    detail: 'Gemini 2.0 Live · 3 active streams',
    status: 'active',
  },
  {
    id: 'ch4',
    name: 'Knowledge Base',
    icon: <Brain size={15} />,
    detail: 'Re-indexing now · ETA ~4 min',
    status: 'degraded',
  },
  {
    id: 'ch5',
    name: 'Webhook Relay',
    icon: <Webhook size={15} />,
    detail: 'Order events · last fired 22s ago',
    status: 'available',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const activeCount = mockConversations.filter((c) => c.status === 'active').length;
const allChannelsOk = mockChannels.every(
  (c) => c.status === 'active' || c.status === 'available',
);

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveDeskClient() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="h-12 flex items-center px-6 border-b border-border bg-surface-lowest flex-shrink-0 gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>My Store</span>
          <ChevronRight size={12} />
          <span className="text-foreground font-medium">Live Desk</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm relative ml-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Go to..."
            aria-label="Global search"
            className="w-full h-7 pl-7 pr-14 rounded-md border border-border bg-surface-low text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono bg-surface-high px-1 py-0.5 rounded border border-border">
            ⌘K
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            id="notification-bell-btn"
            aria-label="Notifications — 3 unread"
            className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[color:var(--status-warning)] border border-surface-lowest text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none select-none">
              3
            </span>
          </button>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────── */}
      <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              ORA — Live
            </p>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight">
              Your agent is working right now
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Real-time view of every shopper ORA is talking to across your store.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/conversations"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 text-[12px]' })}
            >
              View all conversations
              <ArrowRight size={13} />
            </Link>
            <Link
              href="/agent"
              className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5 text-[12px]' })}
            >
              <Settings2 size={13} />
              Configure ORA
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={16} />}
            label="Shoppers Being Helped"
            value="9"
            meta="ORA is live across 3 channels"
          />
          <StatCard
            icon={<MessagesSquare size={16} />}
            label="Conversations Today"
            value="143"
            meta="+18 vs. yesterday"
          />
          <StatCard
            icon={<HelpCircle size={16} />}
            label="Unanswered Questions"
            value="4"
            meta="ORA couldn't find an answer · train it"
          />
          <StatCard
            icon={<CreditCard size={16} />}
            label="ORA Plan"
            value="Growth"
            meta="Renews Aug 28 · 2 invoices open"
          />
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

          {/* Left: Live Conversations table */}
          <div className="rounded-md border border-border bg-surface-container overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Live Conversations</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeCount} shopper{activeCount !== 1 ? 's' : ''} ORA is actively talking to
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[color:var(--status-active)]/10 text-[color:var(--status-active)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-active)]" />
                Live
              </span>
            </div>

            {/* Table — scrollable on small screens */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Shopper
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Channel
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      What they asked
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Wait
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockConversations.map((row) => (
                    <ConversationRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-border">
              <Link
                href="/conversations"
                className="text-[12px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                See full conversation history
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right: Your Store Connections */}
          <div className="rounded-md border border-border bg-surface-container overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-[13px] font-semibold text-foreground">Your Store Connections</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Integrations ORA uses to serve your shoppers
              </p>
            </div>
            <div className="px-5">
              {mockChannels.map((item) => (
                <ChannelStatusItem key={item.id} item={item} />
              ))}
            </div>

            <div className="px-5 py-3 border-t border-border bg-surface-low">
              {allChannelsOk ? (
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-[color:var(--status-online)] font-medium">
                    Your store is connected
                  </span>
                  {' · ORA is selling'}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-[color:var(--status-warning)] font-medium">
                    1 connection needs attention
                  </span>
                  {' · '}
                  <Link href="/agent" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    feed ORA more info
                  </Link>
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
