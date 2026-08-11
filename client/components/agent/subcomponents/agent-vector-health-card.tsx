'use client';

import { Database } from 'lucide-react';

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
        <Database size={16} style={{ color: 'var(--primary)' }} />
        <div>
          <span className="font-bold text-foreground block">Vector Embeddings</span>
          <span className="text-[11px] text-muted-foreground">1,420 chunks • text-embedding-3-small</span>
        </div>
      </div>
      <span className="font-mono font-bold text-[var(--ora-success)] text-[11px]">99.2% recall</span>
    </div>
  );
}
