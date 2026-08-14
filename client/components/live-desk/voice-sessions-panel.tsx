'use client';

import { Mic } from 'lucide-react';

interface VoiceSession {
  initial: string;
  name: string;
  status: string;
  waveformClass: string;
  avatarBgClass: string;
  duration: string;
}

const VOICE_SESSIONS: VoiceSession[] = [
  {
    initial: 'F',
    name: 'Fahim Rahman',
    status: 'Inquiring Catalog',
    waveformClass: 'waveform',
    avatarBgClass: 'bg-primary/20 text-primary',
    duration: '01:42',
  },
  {
    initial: 'R',
    name: 'Rafiq Ahmed',
    status: 'Checking Delivery',
    waveformClass: 'waveform waveform-secondary',
    avatarBgClass: 'bg-[color:var(--chart-2)]/20 text-[color:var(--chart-2)]',
    duration: '00:38',
  },
  {
    initial: 'M',
    name: 'Mehdi Hassan',
    status: 'Resolving Policy',
    waveformClass: 'waveform waveform-success',
    avatarBgClass: 'bg-[color:var(--status-online)]/20 text-[color:var(--status-online)]',
    duration: '02:15',
  },
];

export function VoiceSessionsPanel() {
  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic size={14} className="text-[color:var(--chart-2)]" />
          <h3 className="text-[12px] font-semibold text-foreground">Active Voice Calls</h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-high text-muted-foreground border border-border">
          3 ACTIVE
        </span>
      </div>

      {/* Sessions list */}
      <ul className="p-3.5 space-y-3">
        {VOICE_SESSIONS.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0 select-none ${s.avatarBgClass}`}
              >
                {s.initial}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground truncate leading-tight">
                  {s.name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {s.status} · {s.duration}
                </p>
              </div>
            </div>

            {/* 7-bar audio waveform equalizer */}
            <div className="flex-shrink-0" aria-label={`${s.name} voice stream active`}>
              <div className={s.waveformClass}>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
