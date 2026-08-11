'use client';

import { SystemHeader } from './system-header';
import { SystemMetricsGrid } from './system-metrics-grid';
import { ConnectedSourcesCard } from './connected-sources-card';
import { AvailableIntegrations } from './available-integrations';
import { DataHealthPanel } from './data-health-panel';

export function SystemClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* System Header & Health Banner */}
      <SystemHeader />

      {/* 4 KPI Metrics Row */}
      <SystemMetricsGrid />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connected Sources & Available Integrations (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <ConnectedSourcesCard />
          <AvailableIntegrations />
        </div>

        {/* Right Column: Data Health & Sync Timeline (5 cols) */}
        <div className="lg:col-span-5">
          <DataHealthPanel />
        </div>
      </div>
    </div>
  );
}
