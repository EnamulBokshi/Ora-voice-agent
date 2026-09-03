import Link from 'next/link';

const docs = [
  {
    id: 'quickstart',
    label: 'Getting Started',
    title: '3-Step Storefront Quickstart',
    meta: '2 min read',
    href: '/docs#quickstart',
  },
  {
    id: 'shopify-setup',
    label: 'Platforms',
    title: 'Shopify Store Integration',
    meta: 'Theme embed',
    href: '/docs#shopify-setup',
  },
  {
    id: 'woocommerce-setup',
    label: 'Platforms',
    title: 'WooCommerce & WordPress Setup',
    meta: 'Plugin & Header',
    href: '/docs#woocommerce-setup',
  },
  {
    id: 'appearance-styling',
    label: 'Customization',
    title: 'Widget Branding, Colors & Placement',
    meta: 'Zero code',
    href: '/docs#appearance-styling',
  },
  {
    id: 'catalog-sync',
    label: 'Catalog & Stock',
    title: 'Product Catalog & FAQ Knowledge Sync',
    meta: 'Instant sync',
    href: '/docs#catalog-sync',
  },
];

export function DocsSection() {
  return (
    <section
      id="docs"
      className="lp-section"
      aria-labelledby="docs-headline"
    >
      <div className="lp-container">
        {/* Section label */}
        <div className="lp-section-label">
          <div className="lp-section-label-line" aria-hidden="true" />
          <span className="lp-section-label-text">Docs</span>
          <div className="lp-section-label-line" aria-hidden="true" />
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', maxWidth: '40rem', margin: '0 auto 4rem' }}>
          <h2
            id="docs-headline"
            className="lp-headline"
            style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', marginBottom: '1rem' }}
          >
            Launch in minutes
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'var(--lp-text-secondary)', lineHeight: 1.7 }}>
            From a single-line embed to platform syncing, effortless setup for any storefront.
          </p>
        </div>

        {/* Flat doc rows: bordered, minimalist, no cards */}
        <div
          role="list"
          aria-label="Documentation sections"
          style={{ borderTop: '1px solid var(--lp-border)' }}
        >
          {docs.map((doc) => (
            <Link
              key={doc.id}
              href={doc.href}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.75rem 0.5rem',
                borderBottom: '1px solid var(--lp-border)',
                textDecoration: 'none',
                transition: 'opacity 0.15s ease',
              }}
            >
              {/* Left: label + title */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span
                  className="lp-mono"
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--lp-text-tertiary)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    minWidth: '8.5rem',
                  }}
                >
                  {doc.label}
                </span>
                <span
                  className="lp-headline"
                  style={{ fontSize: '1.25rem', color: 'var(--lp-text-primary)' }}
                >
                  {doc.title}
                </span>
              </div>

              {/* Right: meta + arrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                <span
                  className="lp-mono"
                  style={{ fontSize: '0.75rem', color: 'var(--lp-text-tertiary)' }}
                >
                  {doc.meta}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--lp-primary-dim)' }}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Full docs link */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            href="/docs"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--lp-text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            Browse all documentation →
          </Link>
        </div>
      </div>
    </section>
  );
}
