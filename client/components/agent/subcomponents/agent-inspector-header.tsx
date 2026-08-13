'use client';

import { Edit3, Trash2 } from 'lucide-react';
import { KnowledgeItem } from '../agent-types';

interface AgentInspectorHeaderProps {
  item: KnowledgeItem;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AgentInspectorHeader({ item, onEdit, onDelete }: AgentInspectorHeaderProps) {
  return (
    <div
      className="px-6 py-4 border-b flex justify-between items-center shrink-0 flex-wrap gap-4"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-bold text-foreground">{item.title}</h2>
          {item.status === 'active' ? (
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                color: 'var(--ora-success)',
              }}
            >
              Active & Published
            </span>
          ) : (
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--ora-warning) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ora-warning) 25%, transparent)',
                color: 'var(--ora-warning)',
              }}
            >
              Needs Review
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Last edited by {item.lastEdited}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-xl text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--surface-high)] border transition-colors"
          style={{ borderColor: 'var(--glass-border)' }}
          title="Edit Item"
        >
          <Edit3 size={15} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-xl text-muted-foreground hover:text-[var(--ora-error)] hover:bg-[var(--surface-high)] border transition-colors"
          style={{ borderColor: 'var(--glass-border)' }}
          title="Delete Item"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
