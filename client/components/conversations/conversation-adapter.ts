import { Conversation, Message } from '@/types/conversation';
import { ConversationItem, ChatMessage } from './conversation-types';

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

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

  const lastMsg = messages[messages.length - 1];
  const previewMessage = lastMsg
    ? `"${lastMsg.content.slice(0, 80)}${lastMsg.content.length > 80 ? '...' : ''}"`
    : 'No messages yet';

  const customerName =
    conv.metadata?.customerName ||
    (conv.customerId ? `Customer #${conv.customerId.slice(-4)}` : `Shopper #${conv.sessionId.slice(-4)}`);

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
  return messages.map((m) => {
    const isOra = m.role === 'assistant' || m.role === 'system';
    return {
      id: m._id,
      sender: isOra ? 'ora' : 'customer',
      text: m.content,
      time: m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      isTyping: false,
    };
  });
}
