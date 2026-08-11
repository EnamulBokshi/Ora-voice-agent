'use client';

import { CheckCircle2, ShieldCheck, Sliders, Settings } from 'lucide-react';

export function CurrentPlanCard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Active Plan Card (8 cols) */}
      <div
        className="lg:col-span-8 rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden backdrop-blur-md transition-all group"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl font-bold text-foreground">PRO Plan</h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                  color: 'var(--ora-success)',
                }}
              >
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Billed monthly. Auto-renews on Sep 10, 2026.</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-bold font-mono text-foreground leading-none mb-1">
              $199<span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Billing period: Aug 10 - Sep 10</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 relative z-10">
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground border hover:bg-[var(--surface-high)] transition-all"
            style={{
              background: 'var(--surface-high)',
              borderColor: 'var(--glass-border)',
            }}
          >
            Change plan
          </button>

          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground border hover:bg-[var(--surface-high)] transition-all"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            Manage subscription
          </button>
        </div>
      </div>

      {/* System Health Card (4 cols) */}
      <div
        className="lg:col-span-4 rounded-2xl p-6 border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--ora-success) 8%, var(--surface-container))',
          borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3 border shadow-md"
          style={{
            background: 'color-mix(in srgb, var(--ora-success) 20%, transparent)',
            borderColor: 'color-mix(in srgb, var(--ora-success) 35%, transparent)',
          }}
        >
          <CheckCircle2 size={26} style={{ color: 'var(--ora-success)' }} />
        </div>

        <h3 className="text-sm font-bold text-foreground mb-1">System Healthy</h3>
        <p className="text-xs text-muted-foreground">Usage is safely within your plan limits.</p>
      </div>
    </div>
  );
}
