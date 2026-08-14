'use client';

import { useEffect, useState } from 'react';
import { Activity, Radio, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StateType = 'searching' | 'comparing' | 'cart' | 'checking' | 'idle';

export interface FeedSession {
  id: string;
  initial: string;
  name: string;
  message: string;
  time: string;
  actionLabel: string;
  stateLabel: string;
  stateType: StateType;
  avatarIdx: number;
  sessionId: string;
  channel: string;
  verifiedItem?: {
    name: string;
    price: string;
    inventory: string;
    status: string;
  };
}

const STATE_STYLES: Record<
  StateType,
  { borderClass: string; chipBgClass: string; chipTextClass: string; dotClass: string }
> = {
  searching: {
    borderClass: 'border-l-primary',
    chipBgClass: 'bg-primary/10',
    chipTextClass: 'text-primary',
    dotClass: 'bg-primary',
  },
  comparing: {
    borderClass: 'border-l-[color:var(--chart-3)]',
    chipBgClass: 'bg-secondary/20',
    chipTextClass: 'text-foreground',
    dotClass: 'bg-[color:var(--chart-3)]',
  },
  cart: {
    borderClass: 'border-l-[color:var(--status-online)]',
    chipBgClass: 'bg-[color:var(--status-online)]/10',
    chipTextClass: 'text-[color:var(--status-online)]',
    dotClass: 'bg-[color:var(--status-online)]',
  },
  checking: {
    borderClass: 'border-l-[color:var(--chart-4)]',
    chipBgClass: 'bg-[color:var(--chart-4)]/10',
    chipTextClass: 'text-muted-foreground',
    dotClass: 'bg-[color:var(--chart-4)]',
  },
  idle: {
    borderClass: 'border-l-border',
    chipBgClass: 'bg-surface-high',
    chipTextClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
};

const AVATAR_COLORS = [
  { bg: 'bg-primary/15 text-primary' },
  { bg: 'bg-[color:var(--status-online)]/15 text-[color:var(--status-online)]' },
  { bg: 'bg-foreground/10 text-foreground' },
  { bg: 'bg-[color:var(--chart-4)]/20 text-muted-foreground' },
];

const SEED_ITEMS: FeedSession[] = [
  {
    id: '1',
    initial: 'F',
    name: 'Fahim Rahman',
    message: '"Looking for running shoes under $100 for daily workouts"',
    time: '12 sec ago',
    actionLabel: 'Searching catalog',
    stateLabel: 'Searching',
    stateType: 'searching',
    avatarIdx: 0,
    sessionId: '#SES-8F24A',
    channel: 'Voice Channel',
    verifiedItem: {
      name: 'Nike Pegasus 41',
      price: '$99',
      inventory: 'In Stock (42 units)',
      status: 'Live Verified',
    },
  },
  {
    id: '2',
    initial: 'S',
    name: 'Sarah Chen',
    message: '"Which pour-over set works best for beginners?"',
    time: '24 sec ago',
    actionLabel: 'Comparing products',
    stateLabel: 'Comparing',
    stateType: 'comparing',
    avatarIdx: 1,
    sessionId: '#SES-7C12B',
    channel: 'Store Widget',
    verifiedItem: {
      name: 'Artisan Pour-Over Set v2',
      price: '$45',
      inventory: 'In Stock (18 units)',
      status: 'Live Verified',
    },
  },
  {
    id: '3',
    initial: 'N',
    name: 'Nabila Islam',
    message: '"Add the Merino Wool Sweater in Olive to my cart"',
    time: 'Just now',
    actionLabel: 'Adding to cart',
    stateLabel: 'Adding to cart',
    stateType: 'cart',
    avatarIdx: 2,
    sessionId: '#SES-3A99F',
    channel: 'Store Widget',
    verifiedItem: {
      name: 'Merino Wool Sweater (Olive / M)',
      price: '$120',
      inventory: 'In Stock (7 units)',
      status: 'Cart Synced',
    },
  },
  {
    id: '4',
    initial: 'R',
    name: 'Rafiq Ahmed',
    message: '"Is the Ceramic Dinner Set available for express delivery?"',
    time: '1 min ago',
    actionLabel: 'Checking live inventory',
    stateLabel: 'Checking stock',
    stateType: 'checking',
    avatarIdx: 3,
    sessionId: '#SES-2D44E',
    channel: 'Voice Channel',
    verifiedItem: {
      name: 'Ceramic Tableware Set (16pc)',
      price: '$160',
      inventory: 'In Stock (12 sets)',
      status: 'Express Eligible',
    },
  },
];

const ROTATING_ITEMS: Omit<FeedSession, 'id'>[] = [
  {
    initial: 'A',
    name: 'Arman Hossain',
    message: '"Best waterproof laptop backpack for 16-inch laptops?"',
    time: 'Just now',
    actionLabel: 'Searching products',
    stateLabel: 'Searching',
    stateType: 'searching',
    avatarIdx: 0,
    sessionId: '#SES-9F01C',
    channel: 'Store Widget',
    verifiedItem: {
      name: 'Nomad Tech Pack 24L',
      price: '$89',
      inventory: 'In Stock (29 units)',
      status: 'Live Verified',
    },
  },
  {
    initial: 'T',
    name: 'Tarika Sen',
    message: '"Do you ship to Chittagong with cash on delivery?"',
    time: 'Just now',
    actionLabel: 'Answering policy',
    stateLabel: 'Responding',
    stateType: 'idle',
    avatarIdx: 3,
    sessionId: '#SES-5B88D',
    channel: 'Store Widget',
    verifiedItem: {
      name: 'Nationwide Delivery Policy',
      price: 'Free > ৳2000',
      inventory: 'Active Rule',
      status: 'Verified',
    },
  },
  {
    initial: 'M',
    name: 'Mehdi Hassan',
    message: '"Can I return or exchange if the size does not fit?"',
    time: 'Just now',
    actionLabel: 'Policy explanation',
    stateLabel: 'Resolved',
    stateType: 'idle',
    avatarIdx: 2,
    sessionId: '#SES-6E21A',
    channel: 'Voice Channel',
    verifiedItem: {
      name: '7-Day Return Policy',
      price: 'Free Returns',
      inventory: 'Policy RAG',
      status: 'Verified',
    },
  },
];

interface ActivityFeedProps {
  paused: boolean;
  activeSessionId?: string;
  onSelectSession: (s: FeedSession) => void;
}

export function ActivityFeed({ paused, activeSessionId, onSelectSession }: ActivityFeedProps) {
  const [items, setItems] = useState<FeedSession[]>(SEED_ITEMS);

  useEffect(() => {
    if (paused) return;
    let rotIdx = 0;
    const interval = setInterval(() => {
      const next = ROTATING_ITEMS[rotIdx % ROTATING_ITEMS.length];
      rotIdx++;
      setItems((prev) => [
        { ...next, id: String(Date.now()) },
        ...prev
          .map((item, i) => ({
            ...item,
            time: i === 0 ? '25 sec ago' : item.time,
          }))
          .slice(0, 5),
      ]);
    }, 7500);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h2 className="text-[13px] font-semibold text-foreground">Live Customer Activity</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-[color:var(--status-active)]/10 text-[color:var(--status-active)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-active)] animate-pulse-ring" />
          Streaming
        </span>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-2.5">
        {items.map((item, index) => {
          const style = STATE_STYLES[item.stateType];
          const avatar = AVATAR_COLORS[item.avatarIdx % AVATAR_COLORS.length];
          const isTop = index === 0;
          const isSelected = activeSessionId === item.id || activeSessionId === item.sessionId;

          return (
            <button
              key={item.id}
              id={`feed-item-${item.id}`}
              onClick={() => onSelectSession(item)}
              className={cn(
                'w-full text-left flex gap-3.5 items-start p-3.5 rounded-md border border-border/80 bg-surface-low/60 hover:bg-surface-high/80 transition-all border-l-4 group text-foreground cursor-pointer',
                style.borderClass,
                isSelected && 'ring-1 ring-primary bg-surface-high',
              )}
            >
              {/* Avatar Initial */}
              <div
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 select-none',
                  avatar.bg,
                )}
              >
                {item.initial}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-semibold text-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      {item.channel.includes('Voice') ? (
                        <Radio size={11} className="text-primary" />
                      ) : (
                        <MessageSquareText size={11} className="text-muted-foreground" />
                      )}
                      {item.channel}
                    </span>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0 tabular-nums">
                    {isTop && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse-ring" />
                    )}
                    {item.time}
                  </span>
                </div>

                <p className="text-[12px] text-muted-foreground mb-2 line-clamp-1 group-hover:text-foreground/90 transition-colors">
                  {item.message}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Action label tag */}
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-high text-muted-foreground border border-border">
                    {item.actionLabel}
                  </span>

                  {/* State badge */}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1',
                      style.chipBgClass,
                      style.chipTextClass,
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', style.dotClass)} />
                    {item.stateLabel}
                  </span>

                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                    {item.sessionId}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
