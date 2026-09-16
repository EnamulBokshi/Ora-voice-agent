import type { BusinessArchetype } from '@/lib/archetypes';

export type QuickSetupStepId =
  | 'store_name'
  | 'business_type'
  | 'store_domain'
  | 'business_overview'
  | 'system_prompt';

export interface QuickSetupStepsState {
  store_name: boolean;
  business_type: boolean;
  store_domain: boolean;
  business_overview: boolean;
  system_prompt: boolean;
}

export interface QuickSetupFormData {
  storeName: string;
  businessType: BusinessArchetype;
  storeDomain: string;
  businessSummary: string;
  brandVoiceDescription: string;
  systemPrompt: string;
  tonePresetId: string;
}

export interface PersonalityPreset {
  id: string;
  label: string;
  tagline: string;
  brandVoiceDescription: string;
  systemPrompt: string;
  greetingSample: string;
}

export const PERSONALITY_PRESETS: readonly PersonalityPreset[] = [
  {
    id: 'high_conversion',
    label: 'Sales-focused',
    tagline: 'Proactive, persuasive, drives toward checkout',
    brandVoiceDescription: 'Energetic, persuasive, and knowledgeable sales specialist.',
    systemPrompt:
      'You are a sales specialist for this store. Guide shoppers to relevant products, handle purchasing questions confidently, and move conversations toward checkout.',
    greetingSample:
      'Hey! Welcome to {store}. Can I show you what\'s popular right now?',
  },
  {
    id: 'warm_consultative',
    label: 'Consultative',
    tagline: 'Friendly, patient, listens before recommending',
    brandVoiceDescription: 'Warm, empathetic, and attentive personal shopper.',
    systemPrompt:
      'You are a consultative shopping advisor. Ask clarifying questions, listen carefully, and recommend thoughtful options.',
    greetingSample:
      'Welcome to {store}! What can I help you find today?',
  },
  {
    id: 'luxury_concierge',
    label: 'Concierge',
    tagline: 'Polished, concise, high-touch',
    brandVoiceDescription: 'Sophisticated, respectful, and premium concierge.',
    systemPrompt:
      'You are a brand concierge. Keep responses elegant and concise, highlight craftsmanship and quality, and provide attentive assistance.',
    greetingSample:
      'Welcome to {store}. How may I assist you today?',
  },
  {
    id: 'direct_support',
    label: 'Support & FAQs',
    tagline: 'Fast, accurate answers on policies and specs',
    brandVoiceDescription: 'Crisp, accurate, and helpful support specialist.',
    systemPrompt:
      'You are a support specialist. Answer questions about products, orders, shipping, and store policies clearly and without unnecessary filler.',
    greetingSample:
      'Hi! Ask me anything about {store} — products, shipping, or policies.',
  },
] as const;

export const QUICK_SETUP_STEPS: readonly {
  id: QuickSetupStepId;
  number: number;
  title: string;
  eyebrow: string;
  description: string;
}[] = [
  {
    id: 'store_name',
    number: 1,
    title: 'Store name',
    eyebrow: 'Step 1 of 5',
    description: 'The name used in customer conversations.',
  },
  {
    id: 'business_type',
    number: 2,
    title: 'Business type',
    eyebrow: 'Step 2 of 5',
    description: 'Determines the default conversation workflow.',
  },
  {
    id: 'store_domain',
    number: 3,
    title: 'Website domain',
    eyebrow: 'Step 3 of 5',
    description: 'Where the ORA widget is deployed.',
  },
  {
    id: 'business_overview',
    number: 4,
    title: 'Business overview',
    eyebrow: 'Step 4 of 5',
    description: 'A short description ORA uses during conversations.',
  },
  {
    id: 'system_prompt',
    number: 5,
    title: 'Conversation tone',
    eyebrow: 'Step 5 of 5',
    description: 'How ORA communicates with customers.',
  },
] as const;
