'use client';

import { ArrowRight, TrendingUp, MessageSquare, ShoppingBag, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { AppLink } from '@/components/navigation/app-link';

interface OraAttributionPanelProps {
  totalRevenue: number;
  orderTotal: number;
  conversationTotal: number;
  productTotal: number;
  revenueTrend: string;
  ordersTrend: string;
  conversationsTrend: string;
}

interface AttributionRow {
  label: string;
  value: string | number;
  meta: string;
  trend?: string;
  positive?: boolean;
  href: string;
  icon: React.ReactNode;
}

export function OraAttributionPanel({
  totalRevenue,
  orderTotal,
  conversationTotal,
  productTotal,
  revenueTrend,
  ordersTrend,
  conversationsTrend,
}: OraAttributionPanelProps) {
  const rows: AttributionRow[] = [
    {
      label: 'Revenue Attributed to ORA',
      value: formatCurrency(totalRevenue),
      meta: 'Total store revenue via ORA-assisted conversations',
      trend: revenueTrend,
      positive: !revenueTrend.startsWith('-'),
      href: '/orders',
      icon: <TrendingUp size={14} className="text-muted-foreground" />,
    },
    {
      label: 'Orders Influenced',
      value: orderTotal,
      meta: 'Purchase orders where ORA participated in the buyer journey',
      trend: ordersTrend,
      positive: !ordersTrend.startsWith('-'),
      href: '/orders',
      icon: <ShoppingBag size={14} className="text-muted-foreground" />,
    },
    {
      label: 'Shopper Conversations',
      value: conversationTotal,
      meta: 'Total chat and voice sessions handled by ORA',
      trend: conversationsTrend,
      positive: !conversationsTrend.startsWith('-'),
      href: '/conversations',
      icon: <MessageSquare size={14} className="text-muted-foreground" />,
    },
    {
      label: 'Products in Agent Catalog',
      value: productTotal,
      meta: 'Synced products ORA can recommend and verify in real time',
      href: '/agent?role=products',
      icon: <Users size={14} className="text-muted-foreground" />,
    },
  ];

  return (
    <div className="rounded-md border border-border/50 bg-transparent overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[14px] font-semibold text-foreground font-serif tracking-tight">
            ORA Revenue Attribution
          </h3>
        </div>
        <AppLink
          href="/conversations"
          className="text-[12px] font-medium text-foreground hover:underline underline-offset-4 transition-colors inline-flex items-center gap-1"
        >
          <span>View conversations</span>
          <ArrowRight size={11} className="text-muted-foreground" />
        </AppLink>
      </div>

      {/* Attribution rows */}
      <div className="divide-y divide-border/30">
        {rows.map((row) => (
          <AppLink
            key={row.label}
            href={row.href}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-high/20 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {row.icon}
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-foreground truncate">{row.label}</p>
                <p className="text-[11px] text-muted-foreground/80 truncate">{row.meta}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 pl-4">
              <span className="font-mono font-semibold text-[14px] text-foreground tabular-nums">
                {typeof row.value === 'number' && row.label !== 'Products in Agent Catalog'
                  ? row.value.toLocaleString()
                  : row.value}
              </span>
              {row.trend && (
                <span
                  className={`font-mono text-[11px] font-medium ${
                    row.positive
                      ? 'text-foreground dark:text-[#C8F031]'
                      : 'text-[color:var(--status-error)]'
                  }`}
                >
                  {row.trend}
                </span>
              )}
              <ArrowRight
                size={12}
                className="text-muted-foreground/40 group-hover:text-foreground/60 transition-colors"
              />
            </div>
          </AppLink>
        ))}
      </div>
    </div>
  );
}
