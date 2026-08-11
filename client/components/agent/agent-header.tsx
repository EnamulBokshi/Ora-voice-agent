'use client';

import { Bot, Upload, Plus } from 'lucide-react';

interface AgentHeaderProps {
  onUploadDoc?: () => void;
  onAddKnowledge?: () => void;
  itemsCount?: number;
  docsCount?: number;
}

export function AgentHeader({
  onUploadDoc,
  onAddKnowledge,
}: AgentHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <Bot size={24} style={{ color: 'var(--primary)' }} />
          Knowledge Base & AI Agent
        </h1>
        <p className="text-xs text-muted-foreground">
          Provide your store policies and information so ORA AI can answer customer queries accurately.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onUploadDoc}
          className="px-4 py-2 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-2 hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Upload size={14} style={{ color: 'var(--primary)' }} />
          Upload Document
        </button>

        <button
          onClick={onAddKnowledge}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <Plus size={15} />
          Add Policy Info
        </button>
      </div>
    </div>
  );
}
