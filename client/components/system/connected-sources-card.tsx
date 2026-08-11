'use client';

import { RefreshCw, CheckCircle2, Sliders, ExternalLink } from 'lucide-react';

export function ConnectedSourcesCard() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-foreground">Connected Sources</h3>

      <div
        className="rounded-2xl p-5 border flex flex-col gap-4 relative overflow-hidden backdrop-blur-md transition-all group"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Hover ambient glow */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none"
          style={{ background: 'var(--primary)' }}
        />

        {/* Card Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border font-bold text-lg text-foreground shrink-0 shadow-md"
              style={{
                background: 'var(--surface-high)',
                borderColor: 'var(--glass-border)',
              }}
            >
              🛍️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-bold text-sm text-foreground">Shopify</h4>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  <CheckCircle2 size={10} /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Store: UrbanStore</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Last sync</p>
            <p className="text-xs font-semibold text-foreground flex items-center gap-1 justify-end mt-0.5">
              <RefreshCw size={12} style={{ color: 'var(--secondary)' }} /> 2 min ago
            </p>
          </div>
        </div>

        {/* Integration Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
          <div className="p-2.5 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Products</span>
            <span className="font-bold text-foreground text-sm">1,842</span>
          </div>

          <div className="p-2.5 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Inventory</span>
            <span className="font-bold text-sm" style={{ color: 'var(--secondary)' }}>Live</span>
          </div>

          <div className="p-2.5 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Orders</span>
            <span className="font-bold text-foreground text-sm">Connected</span>
          </div>

          <div className="p-2.5 rounded-xl border" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Webhooks</span>
            <span className="font-bold text-sm" style={{ color: 'var(--ora-success)' }}>Healthy</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <button
            className="flex-1 py-2 rounded-xl text-xs font-medium text-foreground border hover:bg-[var(--surface-high)] transition-all flex items-center justify-center gap-1.5"
            style={{
              background: 'var(--surface-high)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <Sliders size={13} /> Manage
          </button>
          <button
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-foreground border hover:bg-[var(--surface-high)] transition-all flex items-center justify-center gap-1.5"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <RefreshCw size={13} style={{ color: 'var(--primary)' }} /> Sync now
          </button>
        </div>
      </div>
    </div>
  );
}
