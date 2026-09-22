import type { Metadata } from 'next';
import { StartNav } from '@/components/marketing/start/start-nav';
import { StartHero } from '@/components/marketing/start/start-hero';
import { StartSplitFeature } from '@/components/marketing/start/start-split-feature';
import { StartWhyGrid } from '@/components/marketing/start/start-why-grid';
import { StartStepsBanner } from '@/components/marketing/start/start-steps-banner';
import { StartFeaturesGrid } from '@/components/marketing/start/start-features-grid';
import { StartIntegrationSection } from '@/components/marketing/start/start-integration-section';
import { StartPricing } from '@/components/marketing/start/start-pricing';
import { StartCtaBanner } from '@/components/marketing/start/start-cta-banner';
import { StartFooter } from '@/components/marketing/start/start-footer';

import './start.css';

export const metadata: Metadata = {
  title: 'ORA | Your Ultimate Solution for Website Voice AI',
  description:
    'ORA engages website visitors in natural sub-350ms voice conversations, answers questions strictly from your material, and captures leads 24/7 so you never miss an after-hours opportunity.',
  alternates: {
    canonical: 'https://tryora.live/start',
  },
};

export default function StartPage() {
  return (
    <div className="start-landing">
      {/* 1. Floating Pill Navigation */}
      <StartNav />

      {/* Main Sections */}
      <main id="main-content">
        {/* 2. Hero Headline + Centerpiece Floating Dashboard + Trust Bar */}
        <StartHero />

        {/* 3. 2-Column Split: AI Platform Copy + ORA Voice Pipeline Console */}
        <StartSplitFeature />

        {/* 4. Why ORA: Signature ORA Neural Voice Orb & Live Dialogue Console */}
        <StartWhyGrid />

        {/* 5. Wide Banner Card: Automate in 3 Steps! */}
        <StartStepsBanner />

        {/* 6. Features That Set Us Apart: 3x2 Grid with Mini UI Mockups */}
        <StartFeaturesGrid />

        {/* 7. Integration Network Constellation & Verified Quote */}
        <StartIntegrationSection />

        {/* 8. Flexible Plans for Every Business: 3-Tier Pricing Table */}
        <StartPricing />

        {/* 9. High-Impact Closing CTA Banner */}
        <StartCtaBanner />
      </main>

      {/* 10. Clean 5-Column SaaS Footer */}
      <StartFooter />
    </div>
  );
}
