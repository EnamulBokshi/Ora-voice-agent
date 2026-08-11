'use client';

import { Zap, Sparkles, ArrowUpRight, CheckCircle2, ChevronRight } from 'lucide-react';

const RULES = [
  {
    id: 'rule-1',
    title: 'Value-Add Premium Upsell',
    type: 'upsell',
    icon: Zap,
    colorVar: 'var(--secondary)',
    bgVar: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
    conditions: [
      { label: 'WHEN CUSTOMER IS VIEWING', val: 'Product < $100', highlight: false },
      { label: 'RECOMMEND', val: 'Products up to 20% more', highlight: true },
      { label: 'CONDITION', val: 'Higher-rated available', highlight: false },
    ],
  },
  {
    id: 'rule-2',
    title: 'Quality Request Upsell',
    type: 'quality',
    icon: Sparkles,
    colorVar: 'var(--primary)',
    bgVar: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    borderVar: 'color-mix(in srgb, var(--primary) 30%, transparent)',
    conditions: [
      { label: 'WHEN CUSTOMER ASKS FOR', val: '"Premium quality", "Best"', highlight: false },
      { label: 'RECOMMEND', val: 'Top tier / Premium category', highlight: true },
      { label: 'CONDITION', val: 'In-stock verified', highlight: false },
    ],
  },
];

export function SalesRulesList() {
  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex justify-between items-end border-b pb-2.5" style={{ borderColor: 'var(--glass-border)' }}>
        <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
          Active Sales Rules
          <span className="text-xs font-normal text-muted-foreground">(2 displayed)</span>
        </h3>
        <button className="text-xs text-[var(--primary)] hover:underline font-semibold flex items-center gap-0.5">
          View all <ChevronRight size={13} />
        </button>
      </div>

      {/* Rules Grid */}
      <div className="space-y-3.5">
        {RULES.map((rule) => {
          const Icon = rule.icon;

          return (
            <div
              key={rule.id}
              className="rounded-2xl p-5 border flex flex-col gap-4 transition-all duration-300 hover:scale-[1.005] group relative overflow-hidden backdrop-blur-md"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              {/* Card Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background: rule.bgVar,
                      borderColor: rule.borderVar,
                      color: rule.colorVar,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{rule.title}</h4>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight size={10} style={{ color: rule.colorVar }} /> Triggered 142 times this week
                    </span>
                  </div>
                </div>

                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1.5 shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                    color: 'var(--ora-success)',
                  }}
                >
                  <CheckCircle2 size={11} /> Active
                </span>
              </div>

              {/* Conditions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                {rule.conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                      {cond.label}
                    </span>
                    <span
                      className="px-2.5 py-1.5 rounded-xl border font-medium text-xs w-fit"
                      style={
                        cond.highlight
                          ? {
                              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                              color: 'var(--primary)',
                            }
                          : {
                              background: 'var(--surface-high)',
                              borderColor: 'var(--glass-border)',
                              color: 'var(--foreground)',
                            }
                      }
                    >
                      {cond.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
