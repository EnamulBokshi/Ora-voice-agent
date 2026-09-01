import { Conversation, Message } from '@/types/conversation';
import { ConversationItem, ChatMessage } from './conversation-types';
import { formatRelativeTime, formatTime } from '@/lib/format';

function formatSessionRef(sessionId: string): string {
  if (!sessionId) return '#CONV-000';
  const clean = sessionId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `#CONV-${clean.slice(-5)}`;
}

export function mapApiConversationToUi(
  conv: Conversation,
  messages: Message[] = [],
): ConversationItem {
  const channel = conv.channel === 'widget_voice' ? 'voice' : 'chat';
  const status: ConversationItem['status'] =
    conv.status === 'closed'
      ? 'completed'
      : conv.status === 'suspended'
        ? 'needs_attention'
        : 'active';

  // Only use real conversation turns (user/assistant) for the preview snippet
  const visibleMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  const lastMsg = visibleMessages[visibleMessages.length - 1];
  const previewMessage = lastMsg
    ? `"${lastMsg.content.slice(0, 80)}${lastMsg.content.length > 80 ? '...' : ''}"`
    : conv.metadata?.lastMessage
      ? `"${conv.metadata.lastMessage.slice(0, 80)}${conv.metadata.lastMessage.length > 80 ? '...' : ''}"`
      : 'No messages recorded';

  const customerName =
    conv.metadata?.customerName ||
    (conv.customerId ? `Customer #${conv.customerId.slice(-4)}` : `Shopper #${conv.sessionId ? conv.sessionId.slice(-4) : '0000'}`);

  return {
    id: conv._id,
    customerName,
    channel,
    status,
    lastMessageTime: formatRelativeTime(conv.lastActivityAt || conv.createdAt),
    previewMessage,
    sessionRef: formatSessionRef(conv.sessionId),
    transcript: mapApiMessagesToUi(messages),
  };
}

export function mapApiMessagesToUi(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m._id,
      sender: m.role === 'assistant' ? 'ora' : 'customer',
      text: m.content,
      time: m.timestamp ? formatTime(m.timestamp) : undefined,
      isTyping: false,
    }));
}
