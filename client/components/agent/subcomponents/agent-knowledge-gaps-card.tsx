'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';

interface AgentKnowledgeGapsCardProps {
  knowledgeGaps: string[];
}

export function AgentKnowledgeGapsCard({ knowledgeGaps }: AgentKnowledgeGapsCardProps) {
  const [resolvedGaps, setResolvedGaps] = useState<string[]>([]);

  const handleResolveGap = (gap: string) => {
    setResolvedGaps((prev) => [...prev, gap]);
  };

  return (
    <div
      className="rounded-2xl p-4 border flex flex-col gap-2"
      style={{
        background: 'color-mix(in srgb, var(--ora-error) 6%, var(--surface-container))',
        borderColor: 'color-mix(in srgb, var(--ora-error) 20%, transparent)',
      }}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--ora-error)' }}>
        <AlertCircle size={14} /> Knowledge Gaps
      </div>
      <p className="text-[11px] text-muted-foreground">
        Unanswered questions detected in customer sessions:
      </p>

      <div className="space-y-2 mt-1">
        {knowledgeGaps.map((gap, i) => {
          const isResolved = resolvedGaps.includes(gap);

          return (
            <div
              key={i}
              className="p-2.5 rounded-xl border text-[11px] text-foreground font-medium flex items-center justify-between gap-2"
              style={{
                background: 'var(--surface-container)',
                borderColor: 'color-mix(in srgb, var(--ora-error) 25%, transparent)',
                borderLeft: `3px solid ${isResolved ? 'var(--ora-success)' : 'var(--ora-error)'}`,
              }}
            >
              <span className={isResolved ? 'line-through opacity-60' : ''}>{gap}</span>

              {isResolved ? (
                <span className="text-[10px] font-bold text-[var(--ora-success)] flex items-center gap-1">
                  <CheckCircle2 size={12} /> Fixed
                </span>
              ) : (
                <button
                  onClick={() => handleResolveGap(gap)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shrink-0 flex items-center gap-1 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--logo-gradient)' }}
                >
                  <Zap size={10} /> Auto-Fill
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
