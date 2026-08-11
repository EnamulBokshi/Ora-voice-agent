import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { HeroStatusCard } from '@/components/overview/hero-status-card';
import { KpiCard, type KpiCardProps } from '@/components/overview/kpi-card';
import { RevenueChart } from '@/components/overview/revenue-chart';
import { LiveActivityFeed } from '@/components/overview/live-activity-feed';
import { SalesFunnel } from '@/components/overview/sales-funnel';

export const metadata: Metadata = {
  title: 'Overview — ORA Command Center',
  description:
    'Real-time overview of your ORA AI sales agent. Monitor active conversations, revenue, conversion rates, and live customer activity.',
};

const kpiMetrics: KpiCardProps[] = [
  { label: 'Conversations',   value: '1,284',  trend: 18.4, icon: 'conversations' },
  { label: 'Revenue',         value: '$24,820', trend: 12.1, icon: 'revenue'       },
  { label: 'Conv Rate',       value: '18.4%',  trend: 2.3,  icon: 'conversion'    },
  { label: 'AOV',             value: '$86.40',  trend: -1.2, icon: 'aov'           },
  { label: 'Orders',          value: '236',    trend: 8.7,  icon: 'orders'        },
];

export default function OverviewPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <Sidebar activePage="command" />

      {/* Main content — offset by sidebar width */}
      <div className="flex-1 ml-[280px] flex flex-col">
        {/* Fixed Top Nav */}
        <TopNav greeting="Good morning, Ahmed 👋" activeTab="overview" />

        {/* Scrollable content */}
        <main
          className="flex-1 pt-24 pb-12 px-10 flex flex-col gap-6 max-w-[1600px] w-full mx-auto"
          id="overview-main"
        >

          {/* ── ROW 1: KPI cards ── */}
          <section
            className="grid grid-cols-2 lg:grid-cols-5 gap-4"
            aria-label="Key performance indicators"
          >
            {kpiMetrics.map((metric) => (
              <KpiCard key={metric.label} {...metric} />
            ))}
          </section>

          {/* ── ROW 2: Hero + Live Interactions ── */}
          <section
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            aria-label="ORA status and live interactions"
          >
            {/* Hero — 2/3 width */}
            <div className="lg:col-span-2">
              <HeroStatusCard />
            </div>

            {/* Live interactions — 1/3 width */}
            <div className="lg:col-span-1 min-h-[380px]">
              <LiveActivityFeed />
            </div>
          </section>

          {/* ── ROW 3: Revenue chart + Sales Funnel ── */}
          <section
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            aria-label="Revenue analytics and sales funnel"
          >
            {/* Revenue chart — 2/3 width */}
            <div className="lg:col-span-2 min-h-[380px]">
              <RevenueChart />
            </div>

            {/* Sales funnel — 1/3 width */}
            <div className="lg:col-span-1 min-h-[380px]">
              <SalesFunnel />
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
