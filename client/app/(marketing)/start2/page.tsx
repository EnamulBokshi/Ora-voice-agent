import type { Metadata } from 'next';
import { Start2Nav } from '@/components/marketing/start2/start2-nav';
import { Start2Hero } from '@/components/marketing/start2/start2-hero';
import { Start2Bento } from '@/components/marketing/start2/start2-bento';
import { Start2Verticals } from '@/components/marketing/start2/start2-verticals';
import { Start2Steps } from '@/components/marketing/start2/start2-steps';
import { Start2Pricing } from '@/components/marketing/start2/start2-pricing';
import { Start2Capabilities } from '@/components/marketing/start2/start2-capabilities';
import { Start2Testimonial } from '@/components/marketing/start2/start2-testimonial';
import { Start2Cta } from '@/components/marketing/start2/start2-cta';
import { Start2Footer } from '@/components/marketing/start2/start2-footer';

import './start2.css';

export const metadata: Metadata = {
  title: 'ORA | The AI Sales Brain for Every Merchant',
  description:
    'A sub-350ms conversational voice agent for online stores. Syncs your catalog, verifies live stock, and guides shoppers to checkout 24/7.',
  keywords: [
    'voice AI sales agent',
    'e-commerce voice assistant',
    'Shopify voice agent',
    'WooCommerce voice checkout',
    'real-time voice AI',
    'sub-350ms conversational agent',
    'catalog RAG sales brain',
    'ORA',
  ],
  alternates: {
    canonical: 'https://tryora.live/start2',
  },
};

export default function Start2Page() {
  return (
    <div className="start2-landing">
      {/* 1. Sticky Navigation Bar */}
      <Start2Nav />

      {/* Main Sections */}
      <main id="main-content">
        {/* 2. Hero Headline, Dual CTAs, Live Command Center Dashboard & Partner Trust Bar */}
        <Start2Hero />

        {/* 3. Bento Features Grid: 2-Top (Embed Diagram & Analytics) + 3-Bottom (Direct Actions, Grounding, Speed Meter) */}
        <Start2Bento />

        {/* 4. Store Verticals & Catalog Knowledge Orbital Map (work_connections.png) */}
        <Start2Verticals />

        {/* 5. Get Started in 3 Simple Steps with Interactive UI Mockups */}
        <Start2Steps />

        {/* 5. Simple Transparent Pricing (Monthly/Yearly Toggle, Dual Cards & Free Tier Strip) */}
        <Start2Pricing />

        {/* 6. Split Capabilities Section with 2x2 Resource Cards */}
        <Start2Capabilities />

        {/* 7. High-Impact Testimonial Section in Obsidian Container */}
        <Start2Testimonial />

        {/* 8. Closing Action CTA Banner with Trust Badges */}
        <Start2Cta />
      </main>

      {/* 9. 4-Column SaaS Footer with Newsletter Input */}
      <Start2Footer />
    </div>
  );
}
