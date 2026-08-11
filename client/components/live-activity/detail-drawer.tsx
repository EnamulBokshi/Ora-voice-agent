'use client';

import { X } from 'lucide-react';
import type { FeedSession } from './activity-feed';

interface DetailDrawerProps {
  open:    boolean;
  session: FeedSession | null;
  onClose: () => void;
}

export function DetailDrawer({ open, session, onClose }: DetailDrawerProps) {
  const s = session;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-30"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] flex flex-col z-40 transition-transform duration-300 ease-in-out"
        style={{
          transform:      open ? 'translateX(0)' : 'translateX(100%)',
          background:     'var(--surface-container)',
          borderLeft:     '1px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="Session detail drawer"
      >
        {/* Header */}
        <div
          className="flex justify-between items-center p-5 shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{
                background: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                color:      'var(--primary)',
              }}
            >
              {s?.initial ?? 'F'}
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground leading-tight">{s?.name ?? 'Fahim'}</h4>
              <span className="text-xs text-muted-foreground">
                {s?.sessionId ?? '#SES-8F24A'} · {s?.channel ?? 'Voice Channel'}
              </span>
            </div>
          </div>
          <button
            id="detail-drawer-close"
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* Live Verification */}
          <div>
            <h5 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }} aria-hidden="true">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              Live Verification
            </h5>
            <div
              className="rounded-xl p-4 space-y-3 text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <span className="font-semibold text-foreground">Nike Pegasus 41</span>
                <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Target Item</span>
              </div>
              {[
                { label: 'Price',        value: '$99',              ok: true  },
                { label: 'Inventory',    value: 'In stock',         ok: true  },
                { label: 'Availability', value: 'Available (Live)', ok: true  },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground flex items-center gap-1.5">
                    {row.value}
                    {row.ok && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--ora-success)' }}
                      />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="flex-1">
            <h5 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Transcript
            </h5>
            <div className="space-y-4">
              {/* Customer bubble */}
              <div className="flex gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1"
                  style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', color: 'var(--primary)' }}
                >
                  {s?.initial ?? 'F'}
                </div>
                <div
                  className="rounded-xl rounded-tl-none p-3 text-sm text-foreground"
                  style={{ background: 'var(--surface-high)', border: '1px solid var(--glass-border)' }}
                >
                  Hi, I'm looking for running shoes under $100. Something good for daily jogging.
                </div>
              </div>
              {/* ORA bubble */}
              <div className="flex gap-2 flex-row-reverse">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1"
                  style={{ background: 'color-mix(in srgb, var(--secondary) 20%, transparent)', color: 'var(--secondary)' }}
                >
                  O
                </div>
                <div
                  className="rounded-xl rounded-tr-none p-3 text-sm text-foreground"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                  }}
                >
                  I can help with that! The Nike Pegasus 41 is currently available for $99 and is excellent for daily jogging. Would you like me to check your size?
                </div>
              </div>
              {/* Typing indicator */}
              <div className="flex gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1"
                  style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', color: 'var(--primary)' }}
                >
                  {s?.initial ?? 'F'}
                </div>
                <div
                  className="rounded-xl rounded-tl-none p-3 text-sm text-muted-foreground flex items-center gap-2"
                  style={{ background: 'var(--surface-high)', border: '1px solid var(--glass-border)' }}
                >
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: 'var(--muted-foreground)', animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                  Typing...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="p-4 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--surface-lowest)' }}
        >
          <button
            id="drawer-take-over"
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground transition-all duration-200 hover:opacity-80"
            style={{ background: 'var(--surface-high)', border: '1px solid var(--glass-border)' }}
          >
            Take Over
          </button>
          <button
            id="drawer-view-profile"
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--logo-gradient)', boxShadow: 'var(--logo-glow)' }}
          >
            View Profile
          </button>
        </div>
      </div>
    </>
  );
}
