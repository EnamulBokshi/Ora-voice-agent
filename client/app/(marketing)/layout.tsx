import type { Metadata } from 'next';
import './marketing.css';

export const metadata: Metadata = {
  title: 'ORA — The AI Sales Brain for Every Merchant',
  description:
    'ORA automates your e-commerce sales conversations, recovers abandoned carts, and turns every shopper interaction into revenue — 24/7. Start free.',
  keywords: ['AI sales agent', 'cart recovery', 'e-commerce automation', 'conversational AI', 'ORA'],
  openGraph: {
    title: 'ORA — The AI Sales Brain for Every Merchant',
    description: 'Automate sales conversations, recover carts, and grow revenue 24/7 with ORA.',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lp-root scopes all Stitch/Lumina CSS tokens — does not affect the dashboard theme
    <div className="lp-root relative min-h-screen">
      {children}
    </div>
  );
}
