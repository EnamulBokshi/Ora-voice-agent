'use client';

import React from 'react';
import { Radio, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceTestPreviewProps {
  onOpenTestModal: () => void;
}

export function VoiceTestPreview({ onOpenTestModal }: VoiceTestPreviewProps) {
  const bars = [25, 45, 65, 90, 100, 75, 85, 60, 40, 70, 95, 80, 50, 65, 85, 40, 30, 55, 75, 90, 60, 45, 70, 35];

  const sampleQuestions = [
    '“Do you have high-cushion running shoes under $200?”',
    '“What is your return policy for international orders?”',
    '“Can I apply a student or first-time discount code?”',
  ];

  return (
    <div className="space-y-8">
      {/* Visual Audio Waveform Frame */}
      <div className="p-6 rounded-2xl border border-border/60 bg-surface-lowest flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-foreground dark:bg-[#C8F031] animate-pulse shadow-[0_0_8px_rgba(200,240,49,0.5)]" />
              <span className="text-[12px] font-mono font-semibold text-foreground uppercase tracking-wider">
                Ultra-Low Latency Speech Engine
              </span>
            </div>
            <span className="text-[11.5px] font-mono text-foreground dark:text-[#C8F031] tabular-nums font-semibold">
              RTT &lt; 85ms · ORA Neural Voice
            </span>
          </div>

          {/* Equalizer Oscilloscope */}
          <div className="h-12 flex items-center gap-1 p-2 rounded-xl bg-surface-high/40 border border-border/40 overflow-hidden">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-foreground/70 dark:bg-[#C8F031]/80 rounded-full transition-all duration-300 hover:bg-foreground dark:hover:bg-[#C8F031]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex-shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onOpenTestModal}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-xl bg-foreground text-background font-semibold text-[13.5px] hover:opacity-90 transition-all shadow-sm cursor-pointer"
          >
            <Radio size={15} />
            <span>Test ORA Live</span>
          </button>
        </div>
      </div>

      {/* ── Section Divider ── */}
      <div className="h-px bg-border/40 my-7" />

      {/* Suggested Voice Test Scenarios */}
      <div className="p-5 rounded-2xl border border-border/50 bg-surface-container/30">
        <div className="flex items-center gap-2.5 mb-3.5">
          <MessageSquare size={15} className="text-foreground" />
          <p className="text-[13.5px] font-semibold text-foreground">Suggested questions to ask when testing ORA live:</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sampleQuestions.map((q, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-surface-lowest/70 border border-border/40 text-[12.5px] text-muted-foreground leading-snug font-mono"
            >
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specs Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="p-3.5 rounded-xl border border-border/40 bg-surface-lowest/40">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">Speech-to-Speech</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">Bi-directional</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/40 bg-surface-lowest/40">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">Natural Timing</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">Human Interruption</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/40 bg-surface-lowest/40">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">Bilingual AI</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">EN + Global Accents</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/40 bg-surface-lowest/40">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">Cart Tools</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">Direct Checkout API</p>
        </div>
      </div>
    </div>
  );
}
