'use client';

import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
}

export function AdminHeader({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  children,
}: AdminHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border bg-surface-lowest px-6 py-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <ShieldCheck size={12} />
            SuperAdmin
          </span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Custom Header Actions */}
        {children}

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-bright transition-colors disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
