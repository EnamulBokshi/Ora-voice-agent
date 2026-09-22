import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'Profiles & Integrations | ORA Voice AI',
  description:
    'One agent, seven business profiles. Embed ORA on any website, with catalogue connectors for Shopify and WooCommerce and bKash billing for Bangladesh.',
  keywords: [
    'voice AI for clinics',
    'voice AI for agencies',
    'website voice agent',
    'Shopify voice assistant',
    'WooCommerce voice AI',
    'bKash subscription billing',
    'ORA profiles',
  ],
  alternates: {
    canonical: 'https://tryora.live/solutions',
  },
  openGraph: {
    title: 'Profiles & Integrations | ORA Voice AI',
    description: 'One agent, seven business profiles. Embed it on any site with a single script tag.',
    url: 'https://tryora.live/solutions',
    type: 'website',
  },
};

const solutions = [
  {
    id: 'shopify',
    badge: 'Shops',
    title: 'Shopify Storefront Integration',
    subtitle: 'Full product sync, discount application, and voice answers about stock and sizing.',
    stats: 'Catalogue',
    statsLabel: 'Products, variants and stock synced into the agent automatically',
    features: [
      'Zero-code theme app embed: deploy the ORA voice orb in under 3 minutes',
      'Real-time inventory & stock status sync via Shopify Storefront Webhooks',
      'Automated checkout link creation that sends shoppers directly to Shopify Checkout',
      'Cart abandonment detection: automatically initiates conversational recovery when shoppers pause',
    ],
    ctaText: 'Deploy on Shopify',
    ctaHref: '/docs#shopify-setup',
  },
  {
    id: 'woocommerce',
    badge: 'WordPress Ecosystem',
    title: 'WooCommerce & WordPress Setup',
    subtitle: 'Native WordPress plugin support and single-script embed for high-volume stores.',
    stats: '1-Click',
    statsLabel: 'Catalog synchronization with zero performance overhead on PHP servers',
    features: [
      'Lightweight web component embed that does not slow down WordPress page load',
      'Direct REST API connector for live WooCommerce product catalogs and variable SKUs',
      'Dynamic intent detection and real-time product recommendations during voice sessions',
      'Native support for Cash on Delivery (COD), Stripe, and local payment methods',
    ],
    ctaText: 'Setup WooCommerce',
    ctaHref: '/docs#woocommerce-setup',
  },
  {
    id: 'custom-api',
    badge: 'Custom builds',
    title: 'Custom API & Headless Frameworks',
    subtitle: 'Next.js, Remix, Hydrogen, Nuxt, and custom mobile apps powered by WebSocket streaming.',
    stats: 'Streaming',
    statsLabel: 'Bidirectional WebSocket audio with interruption in both directions',
    features: [
      'Publishable widget keys (biz_live_xxxx) with granular domain-level origin whitelisting',
      'Event-driven webhook bridge for cart updates, order creation, and live inventory changes',
      'Direct audio streaming via standard Web Audio API & WebRTC audio processors',
      'Complete control over CSS design tokens and custom orb presentation',
    ],
    ctaText: 'Explore API Docs',
    ctaHref: '/docs#catalog-sync',
  },
  {
    id: 'enterprise',
    badge: 'Larger teams',
    title: 'Enterprise Brand Intelligence',
    subtitle: 'Custom voice personas and priority support for larger teams.',
    stats: 'Dedicated',
    statsLabel: 'Custom voice personas and priority support on the Scale plan',
    features: [
      'Bespoke synthetic voice trained on your brand ambassadors tone and vocabulary',
      'Retrieval restricted to your own material, so the agent cannot invent an answer',
      'Enterprise role-based access control (RBAC), audit logging, and automated compliance',
      'Dedicated account manager and custom integration engineering team',
    ],
    ctaText: 'Contact Enterprise Sales',
    ctaHref: '/pricing',
  },
  {
    id: 'regional-bkash',
    badge: 'South Asia & Emerging Markets',
    title: 'Bangladesh & Local Payment Optimization',
    subtitle: 'Native bKash tokenized checkout agreements and bilingual English & Bengali speech.',
    stats: 'Instant',
    statsLabel: 'Fast tokenized subscription payments and bilingual voice assistance',
    features: [
      'Native bKash Tokenized Checkout agreement integration with BullMQ background renewals',
      'Multimodal bilingual voice understanding: fluidly answers shoppers in Bangla and English',
      'Local currency (BDT) transparent pricing tiers with automated merchant receipt generation',
      'Support for local Cash-on-Delivery (COD) phone verification and anti-fraud checks',
    ],
    ctaText: 'View BDT Pricing & Setup',
    ctaHref: '/pricing',
  },
];

export default function SolutionsPage() {
  return (
    <>
      <MarketingNavbar />
      <main className="lp-section" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
        <div className="lp-container">
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '44rem', margin: '0 auto 4.5rem' }}>
            <div className="lp-section-label" style={{ marginBottom: '1rem' }}>
              <div className="lp-section-label-line" aria-hidden="true" />
              <span className="lp-section-label-text">Integrations & Solutions</span>
              <div className="lp-section-label-line" aria-hidden="true" />
            </div>
            <h1
              className="lp-display lp-text-gradient"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', marginBottom: '1.25rem', lineHeight: 1.15 }}
            >
              One agent that adapts to your work
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.7 }}>
              Whether you run a fast-growing Shopify boutique, a high-volume WooCommerce store, a headless custom platform, or an emerging market storefront with bKash, ORA deploys in minutes.
            </p>
          </div>

          {/* Solutions Stack Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {solutions.map((sol, index) => (
              <section
                key={sol.id}
                id={sol.id}
                className="lp-card"
                style={{
                  padding: 'clamp(2rem, 4vw, 3.5rem)',
                  borderRadius: 'var(--lp-radius-2xl)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid var(--lp-border)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2.5rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Left Column: Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <span className="lp-badge-lime">{sol.badge}</span>
                      <span className="lp-mono" style={{ fontSize: '0.75rem', color: 'var(--lp-text-tertiary)' }}>
                        0{index + 1}
                      </span>
                    </div>

                    <h2 className="lp-headline" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>
                      {sol.title}
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65, marginBottom: '2rem' }}>
                      {sol.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2.5rem' }}>
                      {sol.features.map((feat, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <span
                            style={{
                              width: '1.25rem',
                              height: '1.25rem',
                              borderRadius: '50%',
                              background: 'rgba(200,240,49,0.18)',
                              color: 'var(--lp-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: '0.15rem',
                            }}
                          >
                            ✓
                          </span>
                          <span style={{ fontSize: '0.9375rem', color: 'var(--lp-text-primary)', lineHeight: 1.5 }}>
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={sol.ctaHref}
                      className="lp-btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {sol.ctaText} →
                    </Link>
                  </div>

                  {/* Right Column: Performance Metric Card */}
                  <div
                    style={{
                      background: 'var(--lp-dark-deep)',
                      borderRadius: 'var(--lp-radius-xl)',
                      padding: '2.5rem',
                      color: 'var(--lp-text-on-dark)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.1)',
                      position: 'relative',
                    }}
                  >
                    <div className="lp-mono" style={{ fontSize: '0.8125rem', color: 'var(--lp-primary-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      What you get
                    </div>
                    <div className="lp-display" style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', color: 'var(--lp-primary-dim)', lineHeight: 1, marginBottom: '1rem' }}>
                      {sol.stats}
                    </div>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-on-dark-dim)', lineHeight: 1.6, margin: 0 }}>
                      {sol.statsLabel}
                    </p>

                    <div
                      style={{
                        marginTop: '2rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="lp-mono" style={{ fontSize: '0.75rem', color: 'var(--lp-text-on-dark-dim)' }}>
                        Streaming
                      </span>
                      <span className="lp-mono" style={{ fontSize: '0.75rem', color: 'var(--lp-primary-dim)', fontWeight: 700 }}>
                        Two-way
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Quick CTA section */}
          <div
            style={{
              marginTop: '5rem',
              textAlign: 'center',
              padding: '3rem 2rem',
              background: 'var(--lp-bg-white)',
              borderRadius: 'var(--lp-radius-2xl)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <h2 className="lp-headline" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
              Ready to put it on your site?
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', maxWidth: '32rem', margin: '0 auto 1.75rem' }}>
              Start your free tier today with 1-click catalog sync and zero credit card required.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/auth" className="lp-btn-primary" style={{ padding: '0.875rem 2rem' }}>
                Start Free Trial
              </Link>
              <Link href="/docs" className="lp-btn-ghost" style={{ padding: '0.875rem 2rem' }}>
                View Integration Guides
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
