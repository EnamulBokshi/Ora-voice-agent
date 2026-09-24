import { MarketingNavbar } from '@/components/marketing/navbar';
import { HeroSection } from '@/components/marketing/hero-section';
import { TrustBar } from '@/components/marketing/trust-bar';
import { FeaturesSection } from '@/components/marketing/features-section';
import { SolutionsSection } from '@/components/marketing/solutions-section';
import { DocsSection } from '@/components/marketing/docs-section';
import { StatsSection } from '@/components/marketing/stats-section';
import { TestimonialSection } from '@/components/marketing/testimonial-section';
import { CtaSection } from '@/components/marketing/cta-section';
import { MarketingFooter } from '@/components/marketing/footer';


import type { Metadata } from 'next';
import { League_Gothic } from 'next/font/google';
import { Start2Nav } from '@/components/marketing/start2/start2-nav';
import { Start2Hero } from '@/components/marketing/start2/start2-hero';
import { Start2Bento } from '@/components/marketing/start2/start2-bento';
import { Start2Verticals } from '@/components/marketing/start2/start2-verticals';
import { Start2Steps } from '@/components/marketing/start2/start2-steps';
import { Start2Pricing } from '@/components/marketing/start2/start2-pricing';
import { Start2Capabilities } from '@/components/marketing/start2/start2-capabilities';
import { Start2Testimonial } from '@/components/marketing/start2/start2-testimonial';
import { Start2Footer } from '@/components/marketing/start2/start2-footer';
import { Start2Platforms } from '@/components/marketing/start2/start2-platforms';

import {
  JsonLd,
  oraOrganizationSchema,
  oraSoftwareSchema,
  oraFaqSchema,
} from '@/components/marketing/json-ld';

/**
 * ORA public marketing landing page — accessible at /
 * RSC: no "use client" — all interactivity delegated to sub-components
 */


import './start2.css';

/**
 * The hero heading's ultra-condensed display face. League Gothic is the
 * closest free match to the reference type; a licensed face (e.g. Druk
 * XCondensed via `next/font/local`) can replace it here without touching the
 * CSS, which only reads `--font-hero`.
 */
const heroFont = League_Gothic({
  subsets: ['latin'],
  variable: '--font-hero',
  display: 'swap',
});

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

export default function LandingPage() {
  return (
    <>
      <JsonLd data={oraOrganizationSchema} />
      <JsonLd data={oraSoftwareSchema} />
      <JsonLd data={oraFaqSchema} />
      {/* <MarketingNavbar />
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <SolutionsSection />
      <DocsSection />
      <StatsSection />
      <TestimonialSection />
      <CtaSection />
      <MarketingFooter /> */}
      <div className={`start2-landing ${heroFont.variable}`}>
        {/* 1. Sticky Navigation Bar */}
        <Start2Nav />

        {/* Main Sections */}
        <main id="main-content">
          {/* 2. Hero Headline, Dual CTAs, Live Command Center Dashboard & Partner Trust Bar */}
          <Start2Hero />

          {/* 3. Sliding Platform Logo Ticker */}
          <Start2Platforms />

          {/* 4. Bento Features Grid: 2-Top (Embed Diagram & Analytics) + 3-Bottom (Direct Actions, Grounding, Speed Meter) */}
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

          {/* 8. Closing CTA — same section as the main landing page (/) */}
          <CtaSection />
        </main>

        {/* 9. 4-Column SaaS Footer with Newsletter Input */}
        <Start2Footer />
      </div>
    </>
  );
}


