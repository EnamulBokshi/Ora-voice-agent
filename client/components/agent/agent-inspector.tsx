'use client';

import { KnowledgeItem } from './agent-types';
import { AgentInspectorHeader } from './subcomponents/agent-inspector-header';
import { AgentVectorHealthCard } from './subcomponents/agent-vector-health-card';
import { AgentContentPreview } from './subcomponents/agent-content-preview';
import { AgentGroundedSandbox } from './subcomponents/agent-grounded-sandbox';
import { AgentUsageMetricsCard } from './subcomponents/agent-usage-metrics-card';
import { AgentKnowledgeGapsCard } from './subcomponents/agent-knowledge-gaps-card';

interface AgentInspectorProps {
  item: KnowledgeItem;
}

export function AgentInspector({ item }: AgentInspectorProps) {
  return (
    <div
      className="flex-1 rounded-2xl border flex flex-col overflow-hidden backdrop-blur-xl h-full min-w-0"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Inspector Header */}
      <AgentInspectorHeader item={item} />

      {/* Grid Content Body */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 overflow-y-auto">
        {/* Left Column: Content Preview & Vector Health Card */}
        <div className="flex flex-col gap-4">
          <AgentVectorHealthCard />
          <AgentContentPreview previewContent={item.previewContent} />
        </div>

        {/* Right Column: Grounded AI Simulation & Sandbox & Metrics */}
        <div className="flex flex-col gap-5">
          <AgentGroundedSandbox item={item} />

          {/* Usage & Gaps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgentUsageMetricsCard usageStats={item.usageStats} />
            <AgentKnowledgeGapsCard knowledgeGaps={item.knowledgeGaps} />
          </div>
        </div>
      </div>
    </div>
  );
}
