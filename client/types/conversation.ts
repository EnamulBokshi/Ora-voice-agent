export interface Message {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Conversation {
  _id: string;
  businessId: string;
  sessionId: string;
  customerId?: string;
  channel: 'widget_chat' | 'widget_voice' | 'api';
  status: 'active' | 'suspended' | 'closed';
  lastActivityAt: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationTranscriptResponse {
  conversation: Conversation;
  messages: Message[];
}

export interface ConversationsPaginatedResponse {
  items: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
