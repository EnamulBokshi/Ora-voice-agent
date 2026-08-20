'use client';

import { useState } from 'react';
import { Radio, MessageSquare, Check, Copy, PowerOff } from 'lucide-react';
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
  const isVoice = conv.channel?.toLowerCase().includes('voice');

  const handleCopyRef = () => {
    navigator.clipboard.writeText(conv.sessionRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-12 px-5 border-b border-border bg-surface-lowest flex items-center justify-between shrink-0 gap-4">
      {/* Customer & Session Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-6 h-6 rounded-full bg-surface-high border border-border flex items-center justify-center font-medium text-[11px] text-foreground shrink-0 select-none">
          {conv.customerName.charAt(0)}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground truncate">
            {conv.customerName}
          </h2>
          <span className="text-border">·</span>
          <button
            onClick={handleCopyRef}
            title="Click to copy session reference ID"
            className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors truncate"
          >
            <span>{conv.sessionRef}</span>
            {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
          </button>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-4 text-[12px] shrink-0">
        <div className="flex items-center gap-2 text-muted-foreground">
          {isVoice ? (
            <span className="flex items-center gap-1">
              <Radio size={11} className="text-primary" />
              Voice
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <MessageSquare size={11} className="text-muted-foreground" />
              Chat
            </span>
          )}
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[color:var(--status-online)]' : 'bg-muted-foreground'
              }`}
            />
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>

        {isActive && onCloseSession && (
          <button
            onClick={onCloseSession}
            disabled={isClosing}
            className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <PowerOff size={11} />
            <span>{isClosing ? 'Closing…' : 'Close'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
