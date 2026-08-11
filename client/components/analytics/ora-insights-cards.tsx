'use client';

import { Lightbulb, MessageSquare, CheckCircle2, AlertTriangle, PackageCheck } from 'lucide-react';

export function OraInsightsCards() {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Insights Box */}
      <div
        className="rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md flex-1 flex flex-col gap-3"
        style={{
          background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-container))',
          borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <Lightbulb size={16} style={{ color: 'var(--secondary)' }} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">ORA AI Insights</h3>
        </div>

        <div className="space-y-2.5 text-xs">
          <div
            className="p-3 rounded-xl border space-y-1"
            style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--secondary)' }}>
              Revenue Opp
            </span>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Running shoe conversations convert 22% higher when intent is checked early.
            </p>
          </div>

          <div
            className="p-3 rounded-xl border space-y-1"
            style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--chart-3)' }}>
              Knowledge Gap
            </span>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Shipping policy questions are up 18% this week.
            </p>
          </div>

          <div
            className="p-3 rounded-xl border space-y-1"
            style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--primary)' }}>
              Customer Behavior
            </span>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Returning customers generate 31% more revenue per session.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom 4 Micro-Health Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl border flex items-center gap-3 backdrop-blur-md" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
            <MessageSquare size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground leading-tight text-sm font-mono">3,842</p>
            <p className="text-[10px] text-muted-foreground">Assisted answers</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl border flex items-center gap-3 backdrop-blur-md" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--ora-success) 15%, transparent)', color: 'var(--ora-success)' }}>
            <CheckCircle2 size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground leading-tight text-sm font-mono">94.2%</p>
            <p className="text-[10px] text-muted-foreground">Success rate</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl border flex items-center gap-3 backdrop-blur-md" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--ora-warning) 15%, transparent)', color: 'var(--ora-warning)' }}>
            <AlertTriangle size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground leading-tight text-sm font-mono">86</p>
            <p className="text-[10px] text-muted-foreground">Gaps detected</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl border flex items-center gap-3 backdrop-blur-md" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--secondary) 15%, transparent)', color: 'var(--secondary)' }}>
            <PackageCheck size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground leading-tight text-sm font-mono">99.4%</p>
            <p className="text-[10px] text-muted-foreground">Inventory verif.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
