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
    <div className="pt-4">
      {/* Section Eyebrow Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
        <p className="text-[11.5px] font-mono uppercase tracking-widest text-muted-foreground">
          Store Capabilities & Quick Actions
        </p>
      </div>

      {/* Crisp rounded-lg row container */}
      <div className="rounded-lg border border-border/50 bg-surface-lowest/40 divide-y divide-border/40 overflow-hidden">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            id={action.id}
            className="group flex items-center justify-between gap-4 py-4 px-5 hover:bg-surface-high/30 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                {action.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground font-serif tracking-tight leading-snug">
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
