'use client';

import { useState } from 'react';
import { Check, Copy, PowerOff } from 'lucide-react';
import { ConversationItem } from '../conversation-types';

interface TranscriptHeaderProps {
  conversation: ConversationItem;
  onCloseSession?: () => void;
  isClosing?: boolean;
}

export function TranscriptHeader({ conversation, onCloseSession, isClosing }: TranscriptHeaderProps) {
  const conv = conversation;
  const [copied, setCopied] = useState(false);
  const isActive = conv.status === 'active';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(conv.sessionRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-14 px-5 border-b border-border/40 bg-transparent flex items-center justify-between shrink-0 gap-4">
      {/* Customer & Session Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-md bg-surface-high border border-border/60 flex items-center justify-center font-bold text-[11px] text-foreground shrink-0 select-none">
          {conv.customerName.charAt(0)}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[14.5px] font-semibold text-foreground font-serif tracking-tight truncate">
            {conv.customerName}
          </h2>
          <span className="text-border/60">·</span>
          <button
            onClick={handleCopyRef}
            title="Click to copy session reference ID"
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors truncate cursor-pointer"
          >
            <span>{conv.sessionRef}</span>
            {copied ? <Check size={10} className="text-foreground dark:text-[#C8F031]" /> : <Copy size={10} />}
          </button>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3 text-[11.5px] shrink-0 font-mono">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-[color:var(--status-online)]' : 'bg-muted-foreground'
            }`}
          />
          <span className="capitalize">{isActive ? 'Live Active' : 'Closed'}</span>
        </span>

        {isActive && onCloseSession && (
          <>
            <span className="text-border/60">·</span>
            <button
              onClick={onCloseSession}
              disabled={isClosing}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <PowerOff size={11} />
              <span>{isClosing ? 'Closing…' : 'Close Session'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
