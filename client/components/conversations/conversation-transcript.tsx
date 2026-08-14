'use client';

import { ConversationItem } from './conversation-types';
import { TranscriptHeader } from './subcomponents/transcript-header';
import { TranscriptBubble } from './subcomponents/transcript-bubble';
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react';

interface ConversationTranscriptProps {
  conversation: ConversationItem;
  onCloseSession?: () => void;
  isClosing?: boolean;
  isLoadingTranscript?: boolean;
}

export function ConversationTranscript({
  conversation,
  onCloseSession,
  isClosing,
  isLoadingTranscript,
}: ConversationTranscriptProps) {
  const isActive = conversation.status === 'active';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* ── Top Header ── */}
      <TranscriptHeader
        conversation={conversation}
        onCloseSession={onCloseSession}
        isClosing={isClosing}
      />

      {/* ── Message Transcript Scroll Stream ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <Loader2 className="animate-spin text-primary" size={18} />
            <span>Loading conversation messages...</span>
          </div>
        ) : conversation.transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-1.5 py-12">
            <MessageSquare size={24} className="text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground">No transcript records found</p>
            <p className="text-[11px]">Messages exchanged during this session will appear here.</p>
          </div>
        ) : (
          <>
            {/* Conversation Start Marker */}
            <div className="text-center my-2">
              <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-mono bg-surface-low border border-border text-muted-foreground">
                Session initiated · {conversation.channel.toUpperCase()}
              </span>
            </div>

            {conversation.transcript.map((msg) => (
              <TranscriptBubble
                key={msg.id}
                message={msg}
                customerName={conversation.customerName}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Bottom Session Info Banner ── */}
      <div className="px-5 py-2.5 border-t border-border bg-surface-low/80 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-primary" />
          <span>
            {isActive
              ? 'Real-time session managed by ORA Voice & Chat Gateway'
              : 'Archived session transcript'}
          </span>
        </div>
        <span className="font-mono text-[10px]">
          {conversation.transcript.length} {conversation.transcript.length === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </div>
  );
}
