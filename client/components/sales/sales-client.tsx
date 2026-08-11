'use client';

import { useState } from 'react';
import { SalesHeader } from './sales-header';
import { SalesPlaybookTabs, PlaybookTab } from './sales-playbook-tabs';
import { SalesMetricsGrid } from './sales-metrics-grid';
import { SalesFlowVisualization } from './sales-flow-visualization';
import { SalesRulesList } from './sales-rules-list';
import { PlaybookSimulator } from './playbook-simulator';
import { AiPrioritizationWeighting } from './ai-prioritization-weighting';

export function SalesClient() {
  const [activeTab, setActiveTab] = useState<PlaybookTab>('overview');

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Sales Header & Health Banner */}
      <SalesHeader />

      {/* Tabs Bar */}
      <SalesPlaybookTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <SalesMetricsGrid />
          <SalesFlowVisualization />
          <SalesRulesList />
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <PlaybookSimulator />
          <AiPrioritizationWeighting />
        </div>
      </div>
    </div>
  );
}
