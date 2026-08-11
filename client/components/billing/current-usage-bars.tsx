'use client';

import { MessageSquare, Mic, Search, BookOpen, ShoppingBag } from 'lucide-react';

const USAGE_ITEMS = [
  { label: 'AI Conversations', current: 6420, max: 10000, pct: 64.2, icon: MessageSquare },
  { label: 'Voice Minutes',    current: 1840, max: 3000,  pct: 61.3, icon: Mic            },
  { label: 'Product Searches', current: 18420, max: 50000, pct: 36.8, icon: Search         },
  { label: 'Knowledge Items',  current: 128,  max: 500,   pct: 25.6, icon: BookOpen       },
];

export function CurrentUsageBars() {
  return (
    <div
      className="rounded-2xl p-6 border backdrop-blur-md mb-6"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-6 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        Current Usage Quotas
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        {USAGE_ITEMS.map((u) => {
          const Icon = u.icon;

          return (
            <div key={u.label}>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Icon size={14} style={{ color: 'var(--primary)' }} />
                  {u.label}
                </div>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {u.current.toLocaleString()} / {u.max.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--surface-high)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${u.pct}%`,
                    background: 'var(--logo-gradient)',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Total Attributed Orders Banner */}
        <div className="md:col-span-2 pt-4 border-t flex items-center justify-between mt-2" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Orders Influenced</h4>
              <p className="text-[11px] text-muted-foreground">Total attributed sales conversions</p>
            </div>
          </div>

          <span className="text-2xl font-bold font-mono text-foreground">236</span>
        </div>
      </div>
    </div>
  );
}
