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
    <div className="w-full space-y-6">
      {/* Visual Audio Waveform Frame Card */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Ultra-Low Latency Speech Engine
            </h2>
          </div>
          <span className="text-[11px] font-mono text-foreground dark:text-[#C8F031] tabular-nums font-medium">
            Gemini Live
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-1">
          <div className="flex-1 w-full">
            {/* Equalizer Oscilloscope */}
            <div className="h-10 flex items-center gap-1 p-2 rounded-md bg-surface-high/30 border border-border/40 overflow-hidden">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-foreground/70 dark:bg-[#C8F031]/80 rounded-[1px] transition-all duration-300 hover:bg-foreground dark:hover:bg-[#C8F031]"
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
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-8 px-4 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <Radio size={13} />
              <span>Test ORA Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Voice Test Scenarios Card */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-foreground" />
          <h3 className="text-[13.5px] font-semibold text-foreground font-serif">Suggested questions to ask when testing ORA live:</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sampleQuestions.map((q, i) => (
            <div
              key={i}
              className="p-3 rounded-md bg-surface-high/20 border border-border/50 text-[12px] text-muted-foreground leading-relaxed font-mono"
            >
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specs Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-md border border-border/50 bg-transparent">
          <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">Speech-to-Speech</p>
          <p className="text-[13px] font-semibold text-foreground font-serif mt-0.5">Bi-directional</p>
        </div>
        <div className="p-3 rounded-md border border-border/50 bg-transparent">
          <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">Natural Timing</p>
          <p className="text-[13px] font-semibold text-foreground font-serif mt-0.5">Human Interruption</p>
        </div>
        <div className="p-3 rounded-md border border-border/50 bg-transparent">
          <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">Bilingual AI</p>
          <p className="text-[13px] font-semibold text-foreground font-serif mt-0.5">EN + Global Accents</p>
        </div>
        <div className="p-3 rounded-md border border-border/50 bg-transparent">
          <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">Cart Tools</p>
          <p className="text-[13px] font-semibold text-foreground font-serif mt-0.5">Direct Checkout API</p>
        </div>
      </div>
    </div>
  );
}
