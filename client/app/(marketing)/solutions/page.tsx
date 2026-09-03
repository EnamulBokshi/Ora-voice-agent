import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'E-Commerce Solutions & Storefront Integrations | ORA Voice AI',
  description:
    'Explore ORA integrations for Shopify, WooCommerce, Headless Custom APIs, Enterprise, and regional South Asia bKash tokenized checkout. Automate sales conversations 24/7.',
  keywords: [
    'Shopify voice sales assistant',
    'WooCommerce cart recovery bot',
    'conversational commerce API',
    'headless voice commerce',
    'bKash e-commerce voice checkout',
    'multimodal AI sales agent',
    'ORA solutions',
  ],
  alternates: {
    canonical: 'https://tryora.live/solutions',
  },
  openGraph: {
    title: 'E-Commerce Solutions & Integrations | ORA Voice AI',
    description: 'Turn every shopper visit into revenue on Shopify, WooCommerce, and custom storefronts.',
    url: 'https://tryora.live/solutions',
    type: 'website',
  },
};

const solutions = [
  {
    id: 'shopify',
    badge: 'E-Commerce Leader',
    title: 'Shopify Storefront Integration',
    subtitle: 'Full product sync, 1-click discount application, and abandoned cart voice recovery.',
    stats: '+34% CVR',
    statsLabel: 'Average conversion lift across 120+ Shopify merchants',
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
      'Automated coupon generation tailored to shopper intent during active voice calls',
      'Native support for Cash on Delivery (COD), Stripe, and local payment methods',
    ],
    ctaText: 'Setup WooCommerce',
    ctaHref: '/docs#woocommerce-setup',
  },
  {
    id: 'custom-api',
    badge: 'Headless Commerce',
    title: 'Custom API & Headless Frameworks',
    subtitle: 'Next.js, Remix, Hydrogen, Nuxt, and custom mobile apps powered by WebSocket streaming.',
    stats: '<250ms',
    statsLabel: 'Ultra-low voice latency over bidirectional WebSockets',
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
    badge: 'High-Scale Retailers',
    title: 'Enterprise Brand Intelligence',
    subtitle: 'Custom voice personas, dedicated private LLM fine-tuning, and SLA guarantees.',
    stats: '99.9%',
    statsLabel: 'Dedicated infrastructure uptime and 24/7 priority engineering support',
    features: [
      'Bespoke synthetic voice trained on your brand ambassadors tone and vocabulary',
      'Custom LLM guardrails tuned to prevent hallucination across 100,000+ catalog items',
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
    statsLabel: 'bKash wallet checkout completed directly inside the voice conversation',
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
              The sales brain that adapts to your store
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
                      Impact Metric
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
                        Target Latency
                      </span>
                      <span className="lp-mono" style={{ fontSize: '0.75rem', color: 'var(--lp-primary-dim)', fontWeight: 700 }}>
                        &lt; 350ms
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
              Ready to automate sales on your storefront?
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
