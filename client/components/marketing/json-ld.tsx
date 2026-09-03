import React from 'react';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const oraOrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ORA',
  url: 'https://tryora.live',
  logo: 'https://tryora.live/favicon.ico',
  description:
    'The AI Sales Brain for Every Merchant. Real-time voice selling, live product catalog intelligence, and automated cart recovery.',
  sameAs: [
    'https://twitter.com/tryoralive',
    'https://linkedin.com/company/tryora',
    'https://github.com/hypedev1/ora',
  ],
};

export const oraSoftwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ORA | The AI Sales Brain for Every Merchant',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Cloud, Web, Shopify, WooCommerce',
  url: 'https://tryora.live',
  description:
    'Conversational voice AI sales assistant for e-commerce storefronts that handles sales consultations, answers catalog queries, and recovers abandoned carts 24/7.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter Plan (USD)',
      price: '39.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Starter Plan (BDT)',
      price: '4500.00',
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Growth Plan (USD)',
      price: '99.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Growth Plan (BDT)',
      price: '11500.00',
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan (USD)',
      price: '249.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan (BDT)',
      price: '29000.00',
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
      url: 'https://tryora.live/pricing',
    },
  ],
  featureList: [
    'Sub-350ms Real-Time Voice Streaming',
    'Shopify & WooCommerce 1-Click Catalog Synchronization',
    'Proactive Cart Inactivity Abandonment Detection',
    'Stripe and bKash Tokenized Recurring Subscriptions',
    'Bilingual English and Bengali Multimodal Voice Interaction',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '142',
  },
};

export const oraFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is ORA and how does it increase e-commerce sales?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ORA is a real-time conversational AI sales agent that integrates onto online storefronts. Unlike passive chatbots, ORA engages shoppers with sub-350ms voice conversations, recommends catalog products based on intent, answers stock and sizing questions, and proactively recovers abandoned carts.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which storefront platforms does ORA integrate with?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ORA provides native 1-click integrations for Shopify via Theme App Embed and WooCommerce via WordPress plugins, as well as lightweight JavaScript embeds and WebSocket APIs for headless platforms like Next.js, Remix, and Hydrogen.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does ORA support regional payment methods like bKash?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. ORA supports a dual-payment architecture: Stripe for international credit card payments in USD, and native bKash Tokenized Checkout agreements for merchants in Bangladesh with automated BDT billing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does ORA speak languages other than English?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. ORA is multimodal and bilingual, natively supporting fluent sales conversations in both English and Bengali.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does ORA handle abandoned cart recovery?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ORA monitors shopper inactivity during the checkout sequence. When a visitor pauses for more than 45 seconds with items in their cart, ORA initiates a gentle voice consultation to address sizing doubts or apply 1-click promotional discounts.',
      },
    },
  ],
};
