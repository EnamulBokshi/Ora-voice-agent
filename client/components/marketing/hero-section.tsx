import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      id="hero"
      style={{ paddingTop: '9rem', paddingBottom: '5rem', overflow: 'hidden' }}
      aria-labelledby="hero-headline"
    >
      <div className="lp-container">
        {/* Text content */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '48rem',
            margin: '0 auto 4rem',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Announcement pill */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="lp-announce-pill lp-animate-fade-up">
              <span className="lp-badge-lime">New</span>
              <span>Introducing ORA 2.0 — Smarter AI Sales Agent</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--lp-text-tertiary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h1
            id="hero-headline"
            className="lp-display lp-text-gradient lp-animate-fade-up lp-animate-fade-up-delay-1"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 4.5rem)', marginBottom: '1.25rem' }}
          >
            The AI sales brain<br />for every merchant
          </h1>

          {/* Sub-headline */}
          <p
            className="lp-animate-fade-up lp-animate-fade-up-delay-2"
            style={{
              fontSize: '1.125rem',
              color: 'var(--lp-text-secondary)',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
              maxWidth: '36rem',
              margin: '0 auto 2.5rem',
            }}
          >
            ORA automates your e-commerce sales conversations, recovers abandoned carts, and
            turns every shopper interaction into revenue — 24/7, across every channel.
          </p>

          {/* CTA row */}
          <div
            className="lp-animate-fade-up lp-animate-fade-up-delay-3"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            <Link href="/auth" className="lp-btn-primary" id="hero-cta-start" style={{ padding: '0.875rem 2rem' }}>
              Start for free
            </Link>
            <Link href="#demo" className="lp-btn-ghost" id="hero-cta-demo">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
              Watch demo
            </Link>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div style={{ position: 'relative', maxWidth: '60rem', margin: '0 auto' }}>
          {/* Lime glow behind card */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-0.5rem',
              background: 'radial-gradient(ellipse at 50% 80%, rgba(212,245,54,0.18) 0%, transparent 70%)',
              borderRadius: '3rem',
              zIndex: 0,
            }}
          />

          {/* Card */}
          <div
            className="lp-card"
            style={{
              padding: '2rem',
              position: 'relative',
              zIndex: 1,
              borderRadius: 'var(--lp-radius-2xl)',
              boxShadow: 'var(--lp-shadow-deep)',
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid var(--lp-border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    background: 'var(--lp-dark)',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14l-4-6h3V6h2v4h3l-4 6z" />
                  </svg>
                </div>
                <span className="lp-headline" style={{ fontSize: '1.0625rem' }}>Sales Command Center</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid var(--lp-border)',
                  borderRadius: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  color: 'var(--lp-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Last 7 days
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Metrics grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '2rem',
              }}
            >
              {/* Left — Chart area */}
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--lp-text-secondary)', marginBottom: '0.25rem' }}>
                  Total Revenue Recovered
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <span
                    className="lp-display"
                    style={{ fontSize: '2.75rem', color: 'var(--lp-dark)' }}
                  >
                    $48,204
                  </span>
                  <span className="lp-badge-lime" style={{ marginBottom: '0.5rem' }}>
                    +24.6% vs last week
                  </span>
                </div>

                {/* SVG chart */}
                <div style={{ position: 'relative', height: '9rem', width: '100%' }}>
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 600 140"
                    preserveAspectRatio="none"
                    aria-label="Revenue trend chart showing upward growth"
                    role="img"
                  >
                    <defs>
                      <linearGradient id="lp-chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D4F536" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#D4F536" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 115 C 60 108, 110 112, 160 96 C 210 80, 260 88, 310 66 C 360 44, 410 60, 460 36 C 510 12, 555 26, 600 8 L 600 140 L 0 140 Z"
                      fill="url(#lp-chart-grad)"
                    />
                    <path
                      d="M0 115 C 60 108, 110 112, 160 96 C 210 80, 260 88, 310 66 C 360 44, 410 60, 460 36 C 510 12, 555 26, 600 8"
                      fill="none"
                      stroke="#D4F536"
                      strokeWidth="2.5"
                    />
                    {[
                      [0, 115], [160, 96], [310, 66], [460, 36], [600, 8],
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="4" fill="white" stroke="#D4F536" strokeWidth="2" />
                    ))}
                  </svg>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.6875rem',
                      color: 'var(--lp-text-tertiary)',
                      marginTop: '0.5rem',
                    }}
                    aria-hidden="true"
                  >
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — Stats */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  borderLeft: '1px solid var(--lp-border-light)',
                  paddingLeft: '2rem',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--lp-text-primary)',
                      marginBottom: '1rem',
                    }}
                  >
                    Top Conversations
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none' }}>
                    {[
                      { label: 'Cart recovery', val: '2,840' },
                      { label: 'Product enquiry', val: '1,632' },
                      { label: 'Order tracking', val: '1,104' },
                      { label: 'Upsell flows', val: '743' },
                    ].map((item) => (
                      <li
                        key={item.label}
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}
                      >
                        <span style={{ color: 'var(--lp-text-secondary)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--lp-text-primary)' }}>{item.val}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  style={{
                    paddingTop: '1.25rem',
                    borderTop: '1px solid var(--lp-border-light)',
                    marginTop: 'auto',
                  }}
                >
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--lp-text-secondary)', marginBottom: '0.25rem' }}>
                    Conversion Rate
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      className="lp-display"
                      style={{ fontSize: '1.875rem' }}
                    >
                      34.7%
                    </span>
                    {/* Sparkline */}
                    <svg width="56" height="22" viewBox="0 0 60 24" fill="none" aria-hidden="true">
                      <path d="M2 18L14 12L24 15L38 5L58 8" stroke="#D4F536" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
