'use client';

import { Bot, Upload, Plus, Sparkles, RefreshCw, Database } from 'lucide-react';

interface AgentHeaderProps {
  onUploadDoc?: () => void;
  onAddKnowledge?: () => void;
  onOpenRagPlayground?: () => void;
  onOpenReindex?: () => void;
  onOpenVoiceTest?: () => void;
  itemsCount?: number;
  docsCount?: number;
}

export function AgentHeader({
  onUploadDoc,
  onAddKnowledge,
  onOpenRagPlayground,
  onOpenReindex,
  onOpenVoiceTest,
}: AgentHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Bot size={24} style={{ color: 'var(--primary)' }} />
            Knowledge Base & AI Assistant
          </h1>
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border text-[var(--primary)] flex items-center gap-1"
            style={{
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
            }}
          >
            <Database size={11} /> AI Search Active
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Provide store policies, rules, and catalog info so ORA AI can answer customer queries accurately in real-time.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenVoiceTest}
          className="px-3.5 py-2 rounded-xl text-xs font-bold border text-emerald-300 transition-all flex items-center gap-1.5 hover:bg-emerald-500/20 shadow-md bg-emerald-950/40 border-emerald-500/30"
        >
          <Sparkles size={14} className="text-emerald-400 animate-pulse" />
          Test Voice Agent
        </button>

        <button
          onClick={onOpenRagPlayground}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border text-purple-300 transition-all flex items-center gap-1.5 hover:bg-purple-500/10 shadow-sm"
          style={{
            background: 'color-mix(in srgb, var(--secondary) 10%, var(--glass-bg))',
            borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
          }}
        >
          <Sparkles size={14} className="text-[var(--secondary)]" />
          Test AI Search
        </button>

        <button
          onClick={onOpenReindex}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-1.5 hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <RefreshCw size={14} className="text-[var(--primary)]" />
          Sync AI Knowledge
        </button>

        <button
          onClick={onUploadDoc}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-1.5 hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Upload size={14} style={{ color: 'var(--primary)' }} />
          Upload Doc
        </button>

        <button
          onClick={onAddKnowledge}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-1.5 hover:opacity-90"
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
