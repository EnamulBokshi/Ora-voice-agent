'use client';

import { UserCheck, BrainCircuit, Target, TrendingUp, ShoppingCart, Sliders, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    label: 'CUSTOMER INTENT',
    desc: 'Query Detection',
    icon: UserCheck,
    badge: null,
    colorVar: 'var(--muted-foreground)',
    bgVar: 'var(--surface-container)',
    borderVar: 'var(--glass-border)',
  },
  {
    label: 'UNDERSTAND NEED',
    desc: 'Intent Analysis',
    icon: BrainCircuit,
    badge: '3',
    colorVar: 'var(--primary)',
    bgVar: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--primary) 35%, transparent)',
  },
  {
    label: 'RECOMMEND PRODUCT',
    desc: 'AI Matching',
    icon: Target,
    badge: '5',
    colorVar: 'var(--secondary)',
    bgVar: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--secondary) 35%, transparent)',
  },
  {
    label: 'UPSELL / CROSS-SELL',
    desc: 'Strategy Rule',
    icon: TrendingUp,
    badge: '7',
    colorVar: 'var(--chart-3)',
    bgVar: 'color-mix(in srgb, var(--chart-3) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--chart-3) 35%, transparent)',
  },
  {
    label: 'CART CONVERSION',
    desc: 'Checkout Ready',
    icon: ShoppingCart,
    badge: null,
    colorVar: 'var(--ora-success)',
    bgVar: 'color-mix(in srgb, var(--ora-success) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--ora-success) 35%, transparent)',
  },
];

export function SalesFlowVisualization() {
  return (
    <div
      className="rounded-2xl p-6 border flex flex-col gap-5 relative overflow-hidden backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--primary)' }}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            How ORA Sells
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              5-Step Engine
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated logic pipeline applied to every incoming customer conversation.
          </p>
        </div>

        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all hover:bg-[var(--surface-high)]"
          style={{
            background: 'var(--surface-high)',
            borderColor: 'var(--glass-border)',
            color: 'var(--primary)',
          }}
        >
          <Sliders size={13} /> Edit flow
        </button>
      </div>

      {/* Steps Flow Canvas */}
      <div className="flex items-center justify-between overflow-x-auto py-3 no-scrollbar gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.label} className="flex items-center gap-2 shrink-0">
              {/* Step Node */}
              <div className="flex flex-col items-center gap-2.5 min-w-[110px] group cursor-pointer">
                <div
                  className="w-12 h-12 rounded-2xl border flex items-center justify-center relative transition-all duration-300 group-hover:scale-110 shadow-lg"
                  style={{
                    background: step.bgVar,
                    borderColor: step.borderVar,
                    color: step.colorVar,
                    boxShadow: `0 0 16px color-mix(in srgb, ${step.colorVar} 20%, transparent)`,
                  }}
                >
                  {step.badge && (
                    <span
                      className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold border shadow-sm"
                      style={{
                        background: 'var(--surface-container)',
                        borderColor: step.borderVar,
                        color: step.colorVar,
                      }}
                    >
                      {step.badge}
                    </span>
                  )}
                  <Icon size={20} />
                </div>

                <div className="text-center">
                  <span
                    className="text-[10px] font-bold block uppercase tracking-wider"
                    style={{ color: step.colorVar }}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">{step.desc}</span>
                </div>
              </div>

              {/* Connecting Chevron Arrow */}
              {!isLast && (
                <div className="flex items-center justify-center opacity-40 shrink-0 text-muted-foreground">
                  <ChevronRight size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
