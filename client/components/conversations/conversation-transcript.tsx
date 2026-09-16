'use client';

import { ConversationItem } from './conversation-types';
import { TranscriptHeader } from './subcomponents/transcript-header';
import { TranscriptBubble } from './subcomponents/transcript-bubble';
import { Loader2, MessageSquare } from 'lucide-react';

interface ConversationTranscriptProps {
  conversation: ConversationItem;
  onCloseSession?: () => void;
  isClosing?: boolean;
  isLoadingTranscript?: boolean;
  onBack?: () => void;
}

export function ConversationTranscript({
  conversation,
  onCloseSession,
  isClosing,
  isLoadingTranscript,
  onBack,
}: ConversationTranscriptProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* ── Top Header ── */}
      <TranscriptHeader
        conversation={conversation}
        onCloseSession={onCloseSession}
        isClosing={isClosing}
        onBack={onBack}
      />

      {/* ── Message Transcript Scroll Stream ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-transparent">
        {isLoadingTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <Loader2 className="animate-spin text-muted-foreground" size={16} />
            <span>Loading messages…</span>
          </div>
        ) : conversation.transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-1.5 py-12 select-none">
            <MessageSquare size={20} className="text-muted-foreground/40 mb-1" />
            <p className="font-medium text-foreground">No transcript recorded</p>
            <p className="text-[11.5px] text-muted-foreground/60">
              Messages exchanged during this session will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto flex flex-col">
            {conversation.transcript.map((msg) => (
              <TranscriptBubble
                key={msg.id}
                message={msg}
                customerName={conversation.customerName}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Session Info Bar ── */}
      <div className="px-5 py-2.5 border-t border-border/40 bg-transparent flex items-center justify-between text-[11px] text-muted-foreground shrink-0 tabular-nums">
        <span>Session ID: {conversation.sessionRef}</span>
        <span>
          {conversation.transcript.length} {conversation.transcript.length === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </div>
  );
}
