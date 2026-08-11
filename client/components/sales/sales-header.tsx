'use client';

import { FlaskConical, Plus, CheckCircle2, Sparkles, BookOpenCheck } from 'lucide-react';

interface SalesHeaderProps {
  onTestPlaybook?: () => void;
  onCreateRule?: () => void;
}

export function SalesHeader({ onTestPlaybook, onCreateRule }: SalesHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
            <BookOpenCheck size={24} style={{ color: 'var(--primary)' }} />
            Sales Playbook
          </h1>
          <p className="text-xs text-muted-foreground">
            Define the strategies ORA uses to turn conversations into sales.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Last updated 4 min ago</span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border shadow-sm"
              style={{
                background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                color: 'var(--ora-success)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ora-success)' }} />
              Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onTestPlaybook}
              className="px-4 py-2 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-2 hover:bg-[var(--surface-high)] shadow-sm hover:scale-[1.02]"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <FlaskConical size={14} style={{ color: 'var(--primary)' }} />
              Test playbook
            </button>

            <button
              onClick={onCreateRule}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'var(--logo-gradient)',
                boxShadow: 'var(--logo-glow)',
              }}
            >
              <Plus size={15} />
              Create rule
            </button>
          </div>
        </div>
      </div>

      {/* Active Playbook Health Banner */}
      <div
        className="rounded-2xl p-4 border flex items-center justify-between backdrop-blur-md relative overflow-hidden shadow-sm"
        style={{
          background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-container))',
          borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-3.5 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-md"
            style={{
              background: 'color-mix(in srgb, var(--primary) 20%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 35%, transparent)',
            }}
          >
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Sales playbook is active
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              ORA currently has 12 active sales rules. All rules are ready to be used in customer conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
