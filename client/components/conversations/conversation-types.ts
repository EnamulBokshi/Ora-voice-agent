export type ChannelType = 'voice' | 'chat';
export type ConvStatus = 'active' | 'completed' | 'needs_attention';

export interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
  inStock: boolean;
  liveVerified: boolean;
  image: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'ora';
  text: string;
  time?: string;
  product?: ProductItem;
  isTyping?: boolean;
}

export type TranscriptMessage = ChatMessage;


export interface ConversationIntelligence {
  intent: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  extractedBudget: string;
  productsDiscussed: ProductItem[];
  salesOutcome?: {
    status: string;
    ref: string;
  };
}

export interface ConversationItem {
  id: string;
  customerName: string;
  avatar: string;
  channel: ChannelType;
  status: ConvStatus;
  lastMessageTime: string;
  previewMessage: string;
  tags: { label: string; type: 'intent' | 'outcome' | 'support' | 'escalation' }[];
  duration: string;
  sessionRef: string;
  intelligence: ConversationIntelligence;
  transcript: ChatMessage[];
}
