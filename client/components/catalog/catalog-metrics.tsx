'use client';

import { CheckCircle2, AlertTriangle, CloudCheck } from 'lucide-react';

export function CatalogMetrics() {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Indexed */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Total Indexed
          </span>
          <span className="text-2xl font-bold text-foreground">1,842</span>
        </div>

        {/* Verified */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Verified
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">1,801</span>
            <CheckCircle2 size={18} style={{ color: 'var(--ora-success)' }} />
          </div>
        </div>

        {/* Needs Attention */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'color-mix(in srgb, var(--ora-warning) 8%, var(--glass-bg))',
            borderColor: 'color-mix(in srgb, var(--ora-warning) 30%, transparent)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Needs Attention
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--ora-warning)' }}>
              23
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--ora-warning)' }} />
          </div>
        </div>

        {/* Coverage */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Coverage
          </span>
          <span className="text-2xl font-bold text-foreground">98.4%</span>
        </div>
      </div>

      {/* Catalog Health Banner */}
      <div
        className="rounded-2xl p-4 border flex items-center justify-between backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--secondary) 20%, transparent)' }}
          >
            <CloudCheck size={18} style={{ color: 'var(--secondary)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--secondary)' }}>
            Product catalog is healthy
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Last synced 2 minutes ago</span>
      </div>
    </div>
  );
}
