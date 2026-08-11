'use client';

import { AnalyticsHeader } from './analytics-header';
import { AnalyticsTopKpis } from './analytics-top-kpis';
import { RevenuePerformanceChart } from './revenue-performance-chart';
import { ConversionFunnel } from './conversion-funnel';
import { ConversionByIntent } from './conversion-by-intent';
import { RevenueByChannelDonut } from './revenue-by-channel-donut';
import { OraSalesActions } from './ora-sales-actions';
import { TopProductsTable } from './top-products-table';
import { OraInsightsCards } from './ora-insights-cards';

export function AnalyticsClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header & Export CTA */}
      <AnalyticsHeader />

      {/* 5 KPI Cards Row */}
      <AnalyticsTopKpis />

      {/* Large Revenue Performance Chart */}
      <RevenuePerformanceChart />

      {/* Row 2: Funnel & Intent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ConversionFunnel />
        <ConversionByIntent />
      </div>

      {/* Row 3: Revenue by Channel Donut & ORA Sales Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <RevenueByChannelDonut />
        </div>
        <div className="lg:col-span-8 flex">
          <OraSalesActions />
        </div>
      </div>

      {/* Row 4: Top Products & ORA AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-7">
          <TopProductsTable />
        </div>
        <div className="lg:col-span-5">
          <OraInsightsCards />
        </div>
      </div>
    </div>
  );
}
