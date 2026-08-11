'use client';

import { ShoppingBag, Download, BarChart3, TrendingUp, DollarSign, RefreshCw, Percent } from 'lucide-react';

interface OrdersHeaderProps {
  onExport?: () => void;
  onViewAnalytics?: () => void;
}

export function OrdersHeader({ onExport, onViewAnalytics }: OrdersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <ShoppingBag size={24} style={{ color: 'var(--primary)' }} />
          Orders & Sales History
        </h1>
        <p className="text-xs text-muted-foreground">
          Track orders influenced and generated through ORA AI Sales Assistant.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onExport}
          className="px-3.5 py-2 rounded-xl text-xs font-medium border text-foreground flex items-center gap-2 transition-all hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Download size={14} style={{ color: 'var(--secondary)' }} />
          Export orders
        </button>

        <button
          onClick={onViewAnalytics}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <BarChart3 size={15} />
          View analytics
        </button>
      </div>
    </div>
  );
}

export function OrdersMetrics() {
  const metrics = [
    {
      label: 'ORA-Attributed Revenue',
      val: '$24,820',
      colorVar: 'var(--primary)',
      icon: DollarSign,
    },
    {
      label: 'Orders Influenced',
      val: '236',
      colorVar: 'var(--foreground)',
      icon: ShoppingBag,
    },
    {
      label: 'Average Order Value',
      val: '$105.17',
      colorVar: 'var(--secondary)',
      icon: TrendingUp,
    },
    {
      label: 'Conversion Rate',
      val: '18.4%',
      colorVar: 'var(--ora-success)',
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((m) => {
        const Icon = m.icon;

        return (
          <div
            key={m.label}
            className="rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] backdrop-blur-md relative overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {m.label}
              </span>
              <Icon size={16} style={{ color: m.colorVar }} />
            </div>

            <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: m.colorVar }}>
              {m.val}
            </span>
          </div>
        );
      })}
    </div>
  );
}
