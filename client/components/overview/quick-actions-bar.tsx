'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  return (
    <div className="pt-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
          Quick Actions
        </h2>
      </div>

      {/* Subtle rounded-md Row Container (Same as Page Background) */}
      <div className="rounded-md border border-border/50 bg-transparent divide-y divide-border/40 overflow-hidden">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            id={action.id}
            className="group flex items-center justify-between gap-3 sm:gap-4 py-3.5 sm:py-4 px-4 sm:px-5 hover:bg-surface-high/30 transition-colors touch-manipulation"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                {action.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground tracking-tight leading-snug">
                  {action.label}
                </p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                  {action.description}
                </p>
              </div>
            </div>

            <ChevronRight
              size={15}
              className="flex-shrink-0 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
