'use client';

import React from 'react';
import { Mic, Play } from 'lucide-react';

interface VoiceTestPreviewProps {
  onOpenTestModal: () => void;
}

export function VoiceTestPreview({ onOpenTestModal }: VoiceTestPreviewProps) {
  const bars = [30, 55, 80, 100, 70, 90, 50, 75, 40, 65, 85, 45, 60, 95, 35, 55, 70, 40, 80, 60];

  return (
    <div className="space-y-4">
      {/* Waveform row */}
      <div className="flex items-center gap-4 py-4 border-y border-border/50">
        <div className="flex items-center gap-0.5 h-8 flex-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <button
          onClick={onOpenTestModal}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0"
        >
          <Play size={11} fill="currentColor" />
          Start Voice Test
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mic size={13} />
          <span>Gemini Live · bilingual · sales-trained</span>
        </div>
        <span className="font-mono text-[12px] text-foreground font-medium tabular-nums">&lt; 300ms</span>
      </div>
    </div>
  );
}
