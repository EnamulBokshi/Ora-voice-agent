'use client';

import { Activity, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

const COVERAGE_ITEMS = [
  { label: 'Products', val: '1,842 / 1,842', pct: 100 },
  { label: 'Inventory', val: '1,801 / 1,801', pct: 100 },
  { label: 'Orders', val: '2,941 / 2,941', pct: 100 },
  { label: 'Knowledge', val: '128 / 128', pct: 100 },
];

const SYNC_ACTIVITIES = [
  { action: 'Inventory updated', details: '(42 products)', time: 'Just now', type: 'tertiary' },
  { action: 'Product updated', details: '(Nike Pegasus 41)', time: '2 min ago', type: 'primary' },
  { action: 'Product created', details: '(Adidas Ultraboost 2026)', time: '5 min ago', type: 'primary' },
  { action: 'Order data synchronized', details: '(12 new orders)', time: '1 hour ago', type: 'secondary' },
];

export function DataHealthPanel() {
  return (
    <div className="flex flex-col gap-6">
      {/* Data Health Segmented Bar */}
      <div
        className="rounded-2xl p-5 border flex flex-col gap-3 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Health</h3>
          <span className="text-2xl font-bold font-mono" style={{ color: 'var(--secondary)' }}>
            98.4%
          </span>
        </div>

        {/* Segmented Bar */}
        <div className="w-full h-2.5 rounded-full flex overflow-hidden bg-[var(--surface-high)]">
          <div className="h-full" style={{ width: '25%', background: 'var(--primary)' }} title="Catalog 25%" />
          <div className="h-full border-l" style={{ width: '25%', background: 'var(--secondary)', borderColor: 'var(--glass-border)' }} title="Inventory 25%" />
          <div className="h-full border-l" style={{ width: '25%', background: 'var(--chart-3)', borderColor: 'var(--glass-border)' }} title="Orders 25%" />
          <div className="h-full border-l" style={{ width: '23.4%', background: 'var(--ora-success)', borderColor: 'var(--glass-border)' }} title="Knowledge 23.4%" />
          <div className="h-full border-l" style={{ width: '1.6%', background: 'var(--ora-warning)', borderColor: 'var(--glass-border)' }} title="Issues 1.6%" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} /> Catalog
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--secondary)' }} /> Inventory
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--chart-3)' }} /> Orders
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ora-success)' }} /> Knowledge
          </div>
        </div>
      </div>

      {/* ORA Data Coverage Progress Bars */}
      <div
        className="rounded-2xl p-5 border flex flex-col gap-4 backdrop-blur-md"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ORA Data Coverage</h3>

        <div className="space-y-3.5 text-xs">
          {COVERAGE_ITEMS.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1 font-medium">
                <span className="text-foreground">{item.label}</span>
                <span className="text-muted-foreground font-mono text-[11px]">{item.val}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--surface-high)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%`, background: 'var(--secondary)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sync Activity Timeline */}
      <div
        className="rounded-2xl p-5 border flex flex-col gap-4 backdrop-blur-md"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex justify-between items-center border-b pb-2.5" style={{ borderColor: 'var(--glass-border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Sync Activity</h3>
          <button className="text-xs text-[var(--primary)] hover:underline font-semibold flex items-center gap-0.5">
            View all <ChevronRight size={13} />
          </button>
        </div>

        <div className="space-y-4 border-l-2 ml-2 pl-3" style={{ borderColor: 'var(--glass-border)' }}>
          {SYNC_ACTIVITIES.map((act, idx) => (
            <div key={idx} className="relative text-xs">
              <div
                className="absolute -left-[17px] top-1 w-2 h-2 rounded-full shadow-sm"
                style={{
                  backgroundColor:
                    act.type === 'primary'
                      ? 'var(--primary)'
                      : act.type === 'tertiary'
                      ? 'var(--secondary)'
                      : 'var(--chart-3)',
                }}
              />
              <p className="text-foreground font-medium">
                {act.action} <span className="text-muted-foreground font-normal">{act.details}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{act.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
