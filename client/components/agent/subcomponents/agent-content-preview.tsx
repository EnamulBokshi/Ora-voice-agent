'use client';

import { Eye } from 'lucide-react';
import { KnowledgeItem } from '../agent-types';

interface AgentContentPreviewProps {
  previewContent: KnowledgeItem['previewContent'];
}

export function AgentContentPreview({ previewContent }: AgentContentPreviewProps) {
  return (
    <div className="flex flex-col gap-3 flex-1">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Eye size={13} /> Content Preview
      </h3>

      <div
        className="rounded-2xl p-5 border text-xs text-muted-foreground space-y-4 leading-relaxed flex-1"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <p className="text-sm font-bold text-foreground">{previewContent.heading}</p>
        <p>{previewContent.description}</p>

        {previewContent.sections.map((sec, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3.5 border space-y-2"
            style={{
              background: 'var(--surface-high)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <strong className="text-xs font-bold text-foreground block">{sec.title}</strong>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              {sec.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        ))}

        {previewContent.footerNote && (
          <p className="text-[11px] italic opacity-80 pt-2">{previewContent.footerNote}</p>
        )}
      </div>
    </div>
  );
}
