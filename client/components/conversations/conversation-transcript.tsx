'use client';

import { ConversationItem } from './conversation-types';
import { TranscriptHeader } from './subcomponents/transcript-header';
import { TranscriptBubble } from './subcomponents/transcript-bubble';
import { Loader2 } from 'lucide-react';

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
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <TranscriptHeader
        conversation={conversation}
        onCloseSession={onCloseSession}
        isClosing={isClosing}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingTranscript ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <Loader2 className="animate-spin" size={14} />
            Loading transcript...
          </div>
        ) : conversation.transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No transcript messages found for this session yet.
          </div>
        ) : (
          conversation.transcript.map((msg) => (
            <TranscriptBubble
              key={msg.id}
              message={msg}
              customerName={conversation.customerName}
            />
          ))
        )}
      </div>
    </div>
  );
}
