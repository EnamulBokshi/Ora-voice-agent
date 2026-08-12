export type ChannelType = 'voice' | 'chat';
export type ConvStatus = 'active' | 'completed' | 'needs_attention';

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'ora';
  text: string;
  time?: string;
  isTyping?: boolean;
}

export interface ConversationItem {
  id: string;
  customerName: string;
  channel: ChannelType;
  status: ConvStatus;
  lastMessageTime: string;
  previewMessage: string;
  sessionRef: string;
  transcript: ChatMessage[];
}
