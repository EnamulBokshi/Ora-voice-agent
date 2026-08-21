import Link from 'next/link';

const platforms = [
  { id: 'shopify',      name: 'Shopify',      metric: '+34%', suffix: 'CVR',    status: 'online'  },
  { id: 'woocommerce',  name: 'WooCommerce',  metric: '1-click', suffix: '',   status: 'online'  },
  { id: 'custom-api',   name: 'Custom API',   metric: '<250', suffix: 'ms',    status: 'active'  },
  { id: 'enterprise',   name: 'Enterprise',   metric: '99.9', suffix: '%',     status: 'active'  },
];

const STATUS: Record<string, string> = {
  online: 'var(--lp-primary-dim)',
  active: '#38bdf8',
};

export function SolutionsSection() {
  return (
    <section
      id="solutions"
      aria-labelledby="solutions-headline"
      style={{ paddingTop: '2rem', paddingBottom: '2rem' }}
    >
      <div className="lp-container">
        {/* Dark strip — same as StatsSection */}
        <div
          className="lp-dark-section"
          style={{ padding: 'clamp(3rem, 5vw, 5rem) clamp(2rem, 5vw, 4rem)' }}
        >
          {/* Section label (on dark) */}
          <div className="lp-section-label" style={{ marginBottom: '1rem' }}>
            <div className="lp-section-label-line" aria-hidden="true" />
            <span className="lp-section-label-text" style={{ color: 'var(--lp-primary-dim)' }}>Solutions</span>
            <div className="lp-section-label-line" aria-hidden="true" />
          </div>

          {/* Headline on dark */}
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              id="solutions-headline"
              className="lp-headline"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', color: 'var(--lp-text-on-dark)' }}
            >
              Works with your stack
            </h2>
          </div>

          {/* Platform strip — same flex pattern as stats */}
          <div
            role="list"
            aria-label="Supported platforms"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
            }}
          >
            {platforms.map((p, i) => (
              <div key={p.id} role="listitem" style={{ display: 'flex', alignItems: 'center' }}>
                <Link
                  href={'/solutions#' + p.id}
                  style={{
                    textAlign: 'center',
                    padding: '0 clamp(2rem, 4vw, 3.5rem)',
                    textDecoration: 'none',
                  }}
                >
                  {/* Status + name */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: STATUS[p.status], flexShrink: 0 }} aria-hidden="true" />
                    <span className="lp-mono" style={{ fontSize: '0.75rem', color: 'var(--lp-text-on-dark-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {p.name}
                    </span>
                  </div>
                  {/* Metric */}
                  <div className="lp-display" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--lp-text-on-dark)', lineHeight: 1 }}>
                    {p.metric}
                    <span style={{ color: 'var(--lp-primary-dim)', fontSize: '0.65em' }}>{p.suffix}</span>
                  </div>
                </Link>
                {i < platforms.length - 1 && (
                  <div className="lp-stat-divider" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {/* Footer link */}
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link
              href="/solutions"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--lp-primary-dim)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              View all integrations →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
