'use client';

import { Bot, Sparkles } from 'lucide-react';

interface AgentHeaderProps {
  onOpenVoiceTest?: () => void;
}

export function AgentHeader({ onOpenVoiceTest }: AgentHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <Bot size={24} className="text-primary" />
          ORA Agent
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Feed ORA your business info, product details, and documents — by voice, file upload, or text.
        </p>
      </div>

      <button
        onClick={onOpenVoiceTest}
        className="px-3.5 py-2 rounded-xl text-xs font-bold border text-emerald-300 transition-all flex items-center gap-1.5 hover:bg-emerald-500/20 shadow-md bg-emerald-950/40 border-emerald-500/30 shrink-0"
      >
        <Sparkles size={14} className="text-emerald-400 animate-pulse" />
        Test Voice Agent
      </button>
    </div>
  );
}
