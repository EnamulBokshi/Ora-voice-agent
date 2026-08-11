'use client';

import { KnowledgeItem } from './agent-types';
import { AgentInspectorHeader } from './subcomponents/agent-inspector-header';
import { AgentContentPreview } from './subcomponents/agent-content-preview';

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

      {/* Clean Single-Column Body: Document Content Only */}
      <div className="p-6 flex-1 overflow-y-auto flex flex-col">
        <AgentContentPreview item={item} />
      </div>
    </div>
  );
}
