'use client';

import React from 'react';
import { Mic, Zap, Sparkles, Activity, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceTestPreviewProps {
  onOpenTestModal: () => void;
}

export function VoiceTestPreview({ onOpenTestModal }: VoiceTestPreviewProps) {
  return (
    <div className="w-full h-full min-h-[220px] rounded-xl border border-border/80 bg-surface-lowest/90 p-4 flex flex-col justify-between select-none relative overflow-hidden group">
      {/* Dynamic background pulse */}
      <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center text-primary">
            <Mic size={13} />
          </div>
          <span className="text-[12px] font-semibold text-foreground">Gemini Live Voice Engine</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
          <Activity size={10} className="animate-pulse" />
          Ultra-low Latency
        </span>
      </div>

      {/* Center Interactive Orb / Wave Visualizer */}
      <div className="my-auto py-3 flex flex-col items-center justify-center text-center relative z-10">
        {/* Animated orb circle */}
        <div className="relative mb-2.5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary/40 to-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary">
              <Mic size={18} />
            </div>
          </div>
          {/* Ripple rings */}
          <div className="absolute -inset-2 rounded-full border border-primary/30 animate-ping opacity-25 pointer-events-none" />
        </div>

        {/* Audio Wave Bars */}
        <div className="flex items-center justify-center gap-1 h-4 mb-2">
          {[40, 75, 100, 60, 90, 45, 80, 50, 70, 30].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-primary/70 rounded-full animate-pulse transition-all duration-300"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        <button
          onClick={onOpenTestModal}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-98 transition-all shadow-sm"
        >
          <Play size={12} fill="currentColor" />
          <span>Launch Voice Call</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
        <span>Bilingual & Sales-Trained</span>
        <span className="font-mono text-foreground font-medium">&lt; 300ms speech-to-speech</span>
      </div>
    </div>
  );
}
