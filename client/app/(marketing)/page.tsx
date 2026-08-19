import { MarketingNavbar } from '@/components/marketing/navbar';
import { HeroSection } from '@/components/marketing/hero-section';
import { TrustBar } from '@/components/marketing/trust-bar';
import { FeaturesSection } from '@/components/marketing/features-section';
import { StatsSection } from '@/components/marketing/stats-section';
import { TestimonialSection } from '@/components/marketing/testimonial-section';
import { CtaSection } from '@/components/marketing/cta-section';
import { MarketingFooter } from '@/components/marketing/footer';

/**
 * ORA public marketing landing page — accessible at /
 * RSC: no "use client" — all interactivity delegated to sub-components
 */
export default function LandingPage() {
  return (
    <>
      <MarketingNavbar />
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <StatsSection />
      <TestimonialSection />
      <CtaSection />
      <MarketingFooter />
    </>
  );
}

