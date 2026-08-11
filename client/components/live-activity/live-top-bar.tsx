'use client';

import { useState } from 'react';
import { Pause, Play, Bell, Store } from 'lucide-react';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';

interface LiveTopBarProps {
  paused: boolean;
  onTogglePause: () => void;
}

export function LiveTopBar({ paused, onTogglePause }: LiveTopBarProps) {
  return (
    <header
      className="flex justify-between items-center px-10 h-20 z-40 backdrop-blur-xl shrink-0"
      style={{
        background:   'var(--topnav-bg)',
        borderBottom: '1px solid var(--topnav-border)',
      }}
    >
      {/* Title + LIVE badge + subtitle */}
      <div>
        <h1
          className="text-xl font-bold text-foreground flex items-center gap-3"
          style={{ letterSpacing: '-0.01em' }}
        >
          Live Activity
          {/* LIVE badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase"
            style={{
              background: 'color-mix(in srgb, var(--ora-error) 12%, transparent)',
              border:     '1px solid color-mix(in srgb, var(--ora-error) 30%, transparent)',
              color:      'var(--ora-error)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse-ring"
              style={{ backgroundColor: 'var(--ora-error)' }}
            />
            LIVE
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor what ORA is doing across your store in real time.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Pause / Resume */}
        <button
          id="live-activity-pause-toggle"
          onClick={onTogglePause}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-foreground transition-all duration-200"
          style={{
            background: 'var(--glass-bg)',
            border:     '1px solid var(--glass-border)',
          }}
        >
          {paused
            ? <><Play size={15} style={{ color: 'var(--ora-success)' }} /> Resume</>
            : <><Pause size={15} style={{ color: 'var(--muted-foreground)' }} /> Pause live updates</>
          }
        </button>

        <ThemeToggle />

        <button
          id="live-top-notifications"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[var(--surface-high)] transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          id="live-top-storefront"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[var(--surface-high)] transition-all duration-200"
          aria-label="Storefront"
        >
          <Store size={18} />
        </button>
      </div>
    </header>
  );
}
