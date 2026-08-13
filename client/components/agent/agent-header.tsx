'use client';

import { Bot, Radio } from 'lucide-react';

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

      {onOpenVoiceTest && (
        <button
          onClick={onOpenVoiceTest}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Radio size={15} className="animate-pulse" />
          <span>Test ORA Voice</span>
        </button>
      )}
    </div>
  );
}
