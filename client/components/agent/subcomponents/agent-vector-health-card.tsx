'use client';

import { CheckCircle2 } from 'lucide-react';

export function AgentVectorHealthCard() {
  return (
    <div
      className="p-3.5 rounded-2xl border flex items-center justify-between text-xs"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--ora-success) 15%, transparent)' }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--ora-success)' }} />
        </div>
        <div>
          <span className="font-bold text-foreground block">AI Assistant Sync</span>
          <span className="text-[11px] text-muted-foreground">Store information active & ready for customers</span>
        </div>
      </div>
      <span className="font-bold text-[var(--ora-success)] text-[11px] px-2.5 py-1 rounded-full border" style={{ background: 'color-mix(in srgb, var(--ora-success) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--ora-success) 20%, transparent)' }}>
        100% Synced
      </span>
    </div>
  );
}
