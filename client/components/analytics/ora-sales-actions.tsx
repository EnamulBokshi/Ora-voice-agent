'use client';

import { ShoppingCart, PlusSquare, ArrowUpRight, Target, BarChart2 } from 'lucide-react';

const ACTIONS = [
  {
    title: 'Cart assistance',
    desc: 'Abandoned cart recovery & checkout help',
    conv: '31.8%',
    icon: ShoppingCart,
    colorVar: 'var(--secondary)',
  },
  {
    title: 'Upsell suggestions',
    desc: 'Premium tier recommendations',
    conv: '24.2%',
    icon: PlusSquare,
    colorVar: 'var(--primary)',
  },
  {
    title: 'Cross-sell',
    desc: 'Accessory and bundle pairings',
    conv: '21.4%',
    icon: ArrowUpRight,
    colorVar: 'var(--chart-3)',
  },
];

export function OraSalesActions() {
  return (
    <div
      className="rounded-2xl p-5 border flex flex-col gap-4 backdrop-blur-md flex-1"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        ORA Sales Actions
      </h3>

      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {ACTIONS.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.title}
              className="p-3 rounded-xl border flex items-center justify-between transition-colors hover:bg-[var(--surface-high)]"
              style={{
                background: 'var(--surface-container)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                  style={{
                    background: 'var(--surface-high)',
                    borderColor: 'var(--glass-border)',
                    color: act.colorVar,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{act.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{act.desc}</p>
                </div>
              </div>

              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {act.conv} conv
              </span>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
          <div className="p-3 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Product Recs</span>
            <span className="font-bold text-foreground">18.4% <span className="text-[10px] text-muted-foreground font-normal">conv</span></span>
          </div>

          <div className="p-3 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Comparisons</span>
            <span className="font-bold text-foreground">16.7% <span className="text-[10px] text-muted-foreground font-normal">conv</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
