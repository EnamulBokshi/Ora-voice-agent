'use client';

import { RefreshCw, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SystemHeaderProps {
  onSyncNow?: () => void;
  onConnectSource?: () => void;
}

export function SystemHeader({ onSyncNow, onConnectSource }: SystemHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
            <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
            System & Data Sources
          </h1>
          <p className="text-xs text-muted-foreground">
            Connect your store integrations and keep ORA's product data up to date.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSyncNow}
            className="px-4 py-2 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-2 hover:bg-[var(--surface-high)] shadow-sm hover:scale-[1.02]"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <RefreshCw size={14} style={{ color: 'var(--primary)' }} />
            Sync now
          </button>

          <button
            onClick={onConnectSource}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: 'var(--logo-gradient)',
              boxShadow: 'var(--logo-glow)',
            }}
          >
            <Plus size={15} />
            Connect source
          </button>
        </div>
      </div>

      {/* System Health Banner */}
      <div
        className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--ora-success) 8%, var(--surface-container))',
          borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 shadow-md"
            style={{
              background: 'color-mix(in srgb, var(--ora-success) 20%, transparent)',
              borderColor: 'color-mix(in srgb, var(--ora-success) 35%, transparent)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: 'var(--ora-success)' }} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              All data sources are healthy. ORA is receiving product, inventory, and store updates normally.
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last checked: Just now</p>
          </div>
        </div>

        <button className="text-xs font-semibold text-[var(--primary)] hover:underline whitespace-nowrap shrink-0">
          View sync activity
        </button>
      </div>
    </div>
  );
}
