'use client';

import { Eye } from 'lucide-react';
import { KnowledgeItem } from '../agent-types';

interface AgentContentPreviewProps {
  item: KnowledgeItem;
}

export function AgentContentPreview({ item }: AgentContentPreviewProps) {
  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Full Document Content */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2 shrink-0">
          <Eye size={13} /> Document Content
        </h3>

        <div
          className="rounded-2xl p-6 border text-xs text-muted-foreground space-y-4 leading-relaxed flex-1 flex flex-col"
          style={{
            background: 'var(--surface-container)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
            <span className="font-bold text-sm text-foreground">{item.title}</span>
            <span
              className="px-2.5 py-1 rounded text-[10px] font-semibold border uppercase tracking-wider"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              {item.docType}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-foreground/90 font-sans text-xs leading-relaxed flex-1">
            {item.content}
          </p>

          {item.sourceUrl && (
            <div className="pt-3 text-[11px] text-muted-foreground border-t shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
              Source: <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline text-[var(--primary)]">{item.sourceUrl}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
