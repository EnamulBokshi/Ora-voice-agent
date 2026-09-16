'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { KpiStrip, type KpiCardDef } from './kpi-strip';
import { RevenueChart, type RevenueChartProps } from './revenue-chart';
import { SalesFunnel, type SalesFunnelProps } from './sales-funnel';
import { TrendingUp, Filter } from 'lucide-react';

type AnalyticsTab = 'revenue' | 'funnel';

interface AnalyticsPanelProps {
  kpiCards: KpiCardDef[];
  revenueProps: RevenueChartProps;
  funnelProps: SalesFunnelProps;
}

const TABS: { id: AnalyticsTab; label: string; icon: React.ElementType }[] = [
  { id: 'revenue', label: 'Revenue Analytics', icon: TrendingUp },
  { id: 'funnel', label: 'Sales Funnel', icon: Filter },
];

export function AnalyticsPanel({
  kpiCards,
  revenueProps,
  funnelProps,
}: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('revenue');

  return (
    <div className="flex flex-col space-y-5">
      {/* ── 1. KPI Metric Strip ── */}
      <KpiStrip cards={kpiCards} />

      {/* ── 2. Performance Analytics Section ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-4 sm:p-5">
        {/* Section Header with Clean Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
              Performance Analytics
            </h2>
          </div>

          {/* Highly Visible Tab Buttons */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1 p-0.5 rounded-md bg-surface-high border border-border/60 w-full sm:w-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-[4px] text-[12px] sm:text-[12.5px] font-medium transition-all cursor-pointer touch-manipulation',
                    isActive
                      ? 'bg-surface-lowest text-foreground font-semibold shadow-xs border border-border/60 dark:text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={13} className={isActive ? 'text-foreground dark:text-primary' : 'text-muted-foreground'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Canvas Content */}
        <div>
          {activeTab === 'revenue' ? (
            <RevenueChart {...revenueProps} />
          ) : (
            <SalesFunnel {...funnelProps} />
          )}
        </div>
      </div>
    </div>
  );
}
