'use client';

import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; text: string };
  className?: string;
}

export function StatCard({ icon, label, value, meta, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface-container p-5 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <button
          aria-label="More options"
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">{meta}</p>
      </div>
    </div>
  );
}
