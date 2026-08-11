'use client';

import { useEffect, useState } from 'react';

type StateType = 'searching' | 'comparing' | 'cart' | 'checking' | 'idle';

const STATE_COLORS: Record<StateType, { border: string; chipBg: string; chipColor: string }> = {
  searching: {
    border:    'var(--primary)',
    chipBg:    'color-mix(in srgb, var(--primary) 15%, transparent)',
    chipColor: 'var(--primary)',
  },
  comparing: {
    border:    'var(--chart-3)',
    chipBg:    'color-mix(in srgb, var(--chart-3) 15%, transparent)',
    chipColor: 'var(--chart-3)',
  },
  cart: {
    border:    'var(--ora-success)',
    chipBg:    'color-mix(in srgb, var(--ora-success) 15%, transparent)',
    chipColor: 'var(--ora-success)',
  },
  checking: {
    border:    'var(--chart-4)',
    chipBg:    'color-mix(in srgb, var(--chart-4) 15%, transparent)',
    chipColor: 'var(--chart-4)',
  },
  idle: {
    border:    'var(--glass-border)',
    chipBg:    'var(--surface-high)',
    chipColor: 'var(--muted-foreground)',
  },
};

const AVATAR_SERIES = [
  { bg: 'color-mix(in srgb, var(--primary) 20%, transparent)',    color: 'var(--primary)'     },
  { bg: 'color-mix(in srgb, var(--chart-3) 20%, transparent)',    color: 'var(--chart-3)'     },
  { bg: 'color-mix(in srgb, var(--ora-success) 20%, transparent)',color: 'var(--ora-success)' },
  { bg: 'color-mix(in srgb, var(--chart-4) 20%, transparent)',    color: 'var(--chart-4)'     },
];

export interface FeedSession {
  id:          string;
  initial:     string;
  name:        string;
  message:     string;
  time:        string;
  actionLabel: string;
  stateLabel:  string;
  stateType:   StateType;
  avatarIdx:   number;
  sessionId:   string;
  channel:     string;
}

const SEED_ITEMS: FeedSession[] = [
  { id: '1', initial: 'F', name: 'Fahim',   message: '"Looking for running shoes under $100"', time: '12 sec ago', actionLabel: 'Searching products',    stateLabel: 'Searching',         stateType: 'searching', avatarIdx: 0, sessionId: '#SES-8F24A', channel: 'Voice Channel'  },
  { id: '2', initial: 'S', name: 'Sarah',   message: '"Which iPhone has the best camera?"',    time: '24 sec ago', actionLabel: 'Comparing products',    stateLabel: 'Comparing',         stateType: 'comparing', avatarIdx: 1, sessionId: '#SES-7C12B', channel: 'Chat'           },
  { id: '3', initial: 'N', name: 'Nabila',  message: '"Add the Nike Pegasus to my cart"',      time: 'Just now',   actionLabel: 'Adding to cart',        stateLabel: 'Adding to cart',    stateType: 'cart',      avatarIdx: 2, sessionId: '#SES-3A99F', channel: 'Chat'           },
  { id: '4', initial: 'R', name: 'Rafiq',   message: '"Is the Galaxy S25 available?"',         time: '1 min ago',  actionLabel: 'Checking live inventory',stateLabel: 'Checking inventory',stateType: 'checking',  avatarIdx: 3, sessionId: '#SES-2D44E', channel: 'Voice Channel'  },
];

const ROTATING: Omit<FeedSession, 'id'>[] = [
  { initial: 'A', name: 'Arman',  message: '"Best laptop bag under $60?"',        time: 'Just now', actionLabel: 'Searching products', stateLabel: 'Searching', stateType: 'searching', avatarIdx: 0, sessionId: '#SES-9F01C', channel: 'Chat'  },
  { initial: 'T', name: 'Tarika', message: '"Do you offer gift wrapping?"',        time: 'Just now', actionLabel: 'Answering policy',  stateLabel: 'Responding',stateType: 'idle',      avatarIdx: 3, sessionId: '#SES-5B88D', channel: 'Chat'  },
  { initial: 'M', name: 'Mehdi',  message: '"Can I return if size doesn\'t fit?"',time: 'Just now', actionLabel: 'Answered policy',   stateLabel: 'Resolved',  stateType: 'idle',      avatarIdx: 2, sessionId: '#SES-6E21A', channel: 'Chat'  },
];

interface ActivityFeedProps {
  paused:          boolean;
  onSelectSession: (s: FeedSession) => void;
}

export function ActivityFeed({ paused, onSelectSession }: ActivityFeedProps) {
  const [items, setItems] = useState<FeedSession[]>(SEED_ITEMS);
  let rotIdx = 0;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const next = ROTATING[rotIdx % ROTATING.length];
      rotIdx++;
      setItems((prev) => [
        { ...next, id: String(Date.now()) },
        ...prev.map((item, i) => ({
          ...item,
          time: i === 0 ? '30 sec ago' : item.time,
        })).slice(0, 5),
      ]);
    }, 8000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }} aria-hidden="true">
          <path d="M4 6h16M4 10h16M4 14h8M4 18h8"/>
        </svg>
        Live customer activity
      </h3>

      <div className="space-y-3">
        {items.map((item) => {
          const sc    = STATE_COLORS[item.stateType];
          const av    = AVATAR_SERIES[item.avatarIdx % AVATAR_SERIES.length];
          const isTop = items.indexOf(item) === 0;

          return (
            <button
              key={item.id}
              id={`feed-item-${item.id}`}
              onClick={() => onSelectSession(item)}
              className="w-full text-left flex gap-4 items-start p-4 rounded-xl transition-all duration-200 group"
              style={{
                background:   'var(--glass-bg)',
                border:       '1px solid var(--glass-border)',
                borderLeft:   `4px solid ${sc.border}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                style={{ background: av.bg, color: av.color }}
              >
                {item.initial}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {isTop && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-ring" style={{ backgroundColor: 'var(--ora-success)' }} />
                    )}
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 truncate">{item.message}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Action label chip */}
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: 'var(--surface-high)', color: 'var(--muted-foreground)' }}
                  >
                    {item.actionLabel}
                  </span>
                  {/* Live state chip */}
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1"
                    style={{ background: sc.chipBg, color: sc.chipColor, border: `1px solid ${sc.chipBg}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-ring" style={{ backgroundColor: sc.chipColor }} />
                    {item.stateLabel}
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
