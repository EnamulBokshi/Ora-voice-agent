'use client';

import { Mic, MessageSquare, FileText } from 'lucide-react';
import { ConversationItem } from '../conversation-types';

interface TranscriptHeaderProps {
  conversation: ConversationItem;
}

export function TranscriptHeader({ conversation }: TranscriptHeaderProps) {
  const conv = conversation;

  return (
    <div
      className="px-6 py-4 border-b flex items-center justify-between backdrop-blur-md shrink-0 gap-4 flex-wrap"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <img
          src={conv.avatar}
          alt={conv.customerName}
          className="w-11 h-11 rounded-full object-cover border-2 shadow-md shrink-0"
          style={{
            borderColor: 'var(--primary)',
            boxShadow: '0 0 12px color-mix(in srgb, var(--primary) 30%, transparent)',
          }}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
            <span className="truncate">{conv.customerName}</span>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-normal border flex items-center gap-1 shrink-0"
              style={{
                background: 'var(--surface-high)',
                borderColor: 'var(--glass-border)',
                color: 'var(--muted-foreground)',
              }}
            >
              {conv.channel === 'voice' ? <Mic size={11} /> : <MessageSquare size={11} />}
              {conv.channel === 'voice' ? 'Voice' : 'Chat'}
            </span>
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--ora-success)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ora-success)' }} />
              {conv.status === 'active' ? 'Active' : conv.status === 'needs_attention' ? 'Needs Attention' : 'Completed'}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] opacity-80">{conv.sessionRef}</span>
            <span>•</span>
            <span>{conv.duration}</span>
          </div>
        </div>
      </div>

      <button
        className="px-3.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 text-foreground hover:bg-[var(--surface-high)] transition-all shrink-0 ml-auto"
        style={{
          background: 'var(--surface-high)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <FileText size={13} />
        Generate Summary
      </button>
    </div>
  );
}
