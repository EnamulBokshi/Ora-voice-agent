'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { KpiStrip, type KpiCardDef } from './kpi-strip';
import { RevenueChart, type RevenueChartProps } from './revenue-chart';
import { SalesFunnel, type SalesFunnelProps } from './sales-funnel';

type AnalyticsTab = 'revenue' | 'funnel';

interface AnalyticsPanelProps {
  kpiCards: KpiCardDef[];
  revenueProps: RevenueChartProps;
  funnelProps: SalesFunnelProps;
}

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'funnel',  label: 'Conversion Funnel' },
];

export function AnalyticsPanel({
  kpiCards,
  revenueProps,
  funnelProps,
}: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('revenue');

  return (
    <div className="flex flex-col space-y-0">
      {/* ── Intercom Style Underline Tabs Bar ── */}
      <div className="flex items-center gap-6 border-b border-border/80 text-[13px] font-medium pb-0 mb-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-2.5 relative transition-colors',
                isActive
                  ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── KPI Strip (Flat border-b divide-x) ── */}
      <KpiStrip cards={kpiCards} />

      {/* ── Chart Canvas directly on canvas ── */}
      <div className="pt-2">
        {activeTab === 'revenue' ? (
          <RevenueChart {...revenueProps} />
        ) : (
          <SalesFunnel {...funnelProps} />
        )}
      </div>
    </div>
  );
}
