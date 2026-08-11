'use client';

import { ConversationItem } from './conversation-types';
import { TranscriptHeader } from './subcomponents/transcript-header';
import { TranscriptBubble } from './subcomponents/transcript-bubble';

interface ConversationTranscriptProps {
  conversation: ConversationItem;
}

export function ConversationTranscript({ conversation }: ConversationTranscriptProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Detail Header */}
      <TranscriptHeader conversation={conversation} />

      {/* Transcript Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date Divider */}
        <div className="flex justify-center">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-medium border text-muted-foreground"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            Today, 10:42 AM
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
      </div>
    </div>
  );
}
