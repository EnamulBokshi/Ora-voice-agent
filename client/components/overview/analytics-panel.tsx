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
  { id: 'revenue', label: 'Revenue Performance', icon: TrendingUp },
  { id: 'funnel', label: 'Conversion Funnel', icon: Filter },
];

export function AnalyticsPanel({
  kpiCards,
  revenueProps,
  funnelProps,
}: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('revenue');

  return (
    <div className="flex flex-col space-y-6">
      {/* ── 1. KPI Metric Strip ── */}
      <KpiStrip cards={kpiCards} />

      {/* ── 2. Performance Analytics Section (Crisp, Less Rounded Border) ── */}
      <div className="rounded-lg border border-border/50 bg-surface-lowest/40 p-6">
        {/* Section Header with Distinct, Visible Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border/40 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <p className="text-[11.5px] font-mono uppercase tracking-widest text-muted-foreground">
              Store Performance & Funnel Telemetry
            </p>
          </div>

          {/* Highly Visible Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-md bg-surface-high border border-border/60">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] text-[12.5px] font-medium transition-all cursor-pointer',
                    isActive
                      ? 'bg-surface-lowest text-foreground font-semibold shadow-xs border border-border/60 dark:text-[#C8F031]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={13} className={isActive ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground'} />
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
