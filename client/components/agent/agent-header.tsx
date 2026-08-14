'use client';

import { Bot, Radio } from 'lucide-react';

interface AgentHeaderProps {
  onOpenVoiceTest?: () => void;
}

export function AgentHeader({ onOpenVoiceTest }: AgentHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <Bot size={22} className="text-primary" />
          Store Knowledge & Context
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage product details, store policies, and voice notes used during customer interactions.
        </p>
      </div>

      {onOpenVoiceTest && (
        <button
          onClick={onOpenVoiceTest}
          className="px-4 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <Radio size={14} className="animate-pulse" />
          <span>Test Voice Call</span>
        </button>
      )}
    </div>
  );
}
