'use client';

import { ConversationItem } from './conversation-types';
import { TranscriptHeader } from './subcomponents/transcript-header';
import { TranscriptBubble } from './subcomponents/transcript-bubble';

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
      {/* Detail Header */}
      <TranscriptHeader
        conversation={conversation}
        onCloseSession={onCloseSession}
        isClosing={isClosing}
      />

      {/* Transcript Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoadingTranscript ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
            Loading transcript...
          </div>
        ) : conversation.transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground space-y-2">
            <span>No transcript messages found for this session yet.</span>
          </div>
        ) : (
          <>
            {/* Date Divider */}
            <div className="flex justify-center">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-medium border text-muted-foreground"
                style={{
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              >
                Session Activity Log
              </span>
            </div>

            {/* Message items */}
            {conversation.transcript.map((msg) => (
              <TranscriptBubble
                key={msg.id}
                message={msg}
                customerAvatar={conversation.avatar}
                customerName={conversation.customerName}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

