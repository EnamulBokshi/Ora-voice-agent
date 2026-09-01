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
    <div className="pt-6">
      {/* Section Header */}
      <div className="pb-3 border-b border-border">
        <h3 className="text-[13px] font-semibold text-foreground">
          Store & Assistant Setup
        </h3>
      </div>

      {/* Flat Intercom-style setting rows */}
      <div className="divide-y divide-border">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            id={action.id}
            className="group flex items-center justify-between gap-4 py-3.5 px-2 hover:bg-surface-high/30 -mx-2 transition-colors rounded-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                {action.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground leading-snug">
                  {action.label}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                  {action.description}
                </p>
              </div>
            </div>

            <ChevronRight
              size={14}
              className="flex-shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
