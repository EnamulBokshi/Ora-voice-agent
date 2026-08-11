'use client';

import { Bot, FileText, Upload, Plus, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface AgentHeaderProps {
  onUploadDoc?: () => void;
  onAddKnowledge?: () => void;
}

export function AgentHeader({ onUploadDoc, onAddKnowledge }: AgentHeaderProps) {
  return (
    <div className="flex flex-col gap-5 mb-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
            <Bot size={24} style={{ color: 'var(--primary)' }} />
            Knowledge Base & AI Agent
          </h1>
          <p className="text-xs text-muted-foreground">
            Give ORA the information it needs to answer customer questions accurately.
          </p>

          {/* Stat chips row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--foreground)',
              }}
            >
              <FileText size={13} style={{ color: 'var(--secondary)' }} />
              128 items
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--foreground)',
              }}
            >
              <Upload size={13} style={{ color: 'var(--primary)' }} />
              14 documents
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--foreground)',
              }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--ora-success)' }} />
              98% coverage
            </span>

            <span className="text-[11px] text-muted-foreground ml-1">Updated 2 min ago</span>
          </div>
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
            Upload document
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
            Add knowledge
          </button>
        </div>
      </div>

      {/* Health Banner */}
      <div
        className="rounded-2xl p-3.5 border flex items-center gap-3 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--secondary) 20%, transparent)' }}
        >
          <CheckCircle2 size={18} style={{ color: 'var(--secondary)' }} />
        </div>
        <span className="text-xs font-bold text-foreground" style={{ color: 'var(--secondary)' }}>
          ORA's knowledge base is healthy
        </span>
      </div>
    </div>
  );
}
