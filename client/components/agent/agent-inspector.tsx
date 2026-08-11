'use client';

import { KnowledgeItem } from './agent-types';
import { AgentInspectorHeader } from './subcomponents/agent-inspector-header';
import { AgentContentPreview } from './subcomponents/agent-content-preview';
import { AgentGroundedSandbox } from './subcomponents/agent-grounded-sandbox';

interface AgentInspectorProps {
  item: KnowledgeItem;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AgentInspector({ item, onEdit, onDelete }: AgentInspectorProps) {
  return (
    <div
      className="flex-1 rounded-2xl border flex flex-col backdrop-blur-xl min-w-0 min-h-[600px] overflow-hidden shadow-xl"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Inspector Header */}
      <AgentInspectorHeader item={item} onEdit={onEdit} onDelete={onDelete} />

      {/* Clean Two-Column Body: Policy Details + Live Test Box */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 overflow-y-auto">
        {/* Left Column: Full Policy Content */}
        <div className="flex flex-col gap-4">
          <AgentContentPreview previewContent={item.previewContent} />
        </div>

        {/* Right Column: Live Test Box */}
        <div className="flex flex-col gap-5">
          <AgentGroundedSandbox item={item} />
        </div>
      </div>
    </div>
  );
}
