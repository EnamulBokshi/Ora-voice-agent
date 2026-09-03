import type { Metadata } from 'next';
import './marketing.css';

export const metadata: Metadata = {
  title: 'ORA | The AI Sales Brain for Every Merchant',
  description:
    'ORA automates your e-commerce sales conversations, recovers abandoned carts, and turns every shopper interaction into revenue 24/7. Start free.',
  keywords: [
    'AI sales agent',
    'voice commerce',
    'cart recovery',
    'e-commerce automation',
    'Shopify voice assistant',
    'WooCommerce sales bot',
    'bKash automated checkout',
    'conversational commerce',
    'real-time voice AI',
    'abandoned cart recovery',
    'multimodal e-commerce AI',
    'ORA',
  ],
  alternates: {
    canonical: 'https://tryora.live',
  },
  openGraph: {
    title: 'ORA | The AI Sales Brain for Every Merchant',
    description: 'Automate sales conversations, recover carts, and grow revenue 24/7 with ORA.',
    url: 'https://tryora.live',
    siteName: 'ORA',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ORA | The AI Sales Brain for Every Merchant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ORA | The AI Sales Brain for Every Merchant',
    description: 'Automate sales conversations, recover carts, and turn shopper interactions into revenue 24/7.',
    images: ['/opengraph-image'],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lp-root scopes all Stitch/Lumina CSS tokens, does not affect the dashboard theme
    <div className="lp-root relative min-h-screen">
      {children}
    </div>
  );
}
