'use client';

import { Users, Eye, Download, UserPlus, UserCheck, DollarSign, Percent } from 'lucide-react';

interface CustomersHeaderProps {
  onViewConversations?: () => void;
  onExport?: () => void;
}

export function CustomersHeader({ onViewConversations, onExport }: CustomersHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <Users size={24} style={{ color: 'var(--primary)' }} />
          Customers & CRM
        </h1>
        <p className="text-xs text-muted-foreground">
          Understand the customers ORA is helping, nurturing, and converting.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onViewConversations}
          className="px-3.5 py-2 rounded-xl text-xs font-medium border text-foreground flex items-center gap-2 transition-all hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Eye size={14} style={{ color: 'var(--secondary)' }} />
          View conversations
        </button>

        <button
          onClick={onExport}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <Download size={14} />
          Export customers
        </button>
      </div>
    </div>
  );
}

export function CustomersMetrics() {
  const metrics = [
    { label: 'Customers Assisted', val: '1,012', colorVar: 'var(--primary)',   icon: Users },
    { label: 'New Customers',     val: '284',   colorVar: 'var(--secondary)', icon: UserPlus },
    { label: 'Returning',         val: '728',   colorVar: 'var(--chart-3)',   icon: UserCheck },
    { label: 'Avg Value',         val: '$426',  colorVar: 'var(--foreground)',icon: DollarSign },
    { label: 'Conversion Rate',   val: '18.4%', colorVar: 'var(--ora-success)',icon: Percent },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
              <Icon size={15} style={{ color: m.colorVar }} />
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
