export function FeaturesSection() {
  const panelStyle: React.CSSProperties = {
    border: '1px solid var(--lp-border)',
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 0.875rem',
    background: 'var(--lp-bg-subtle)',
    border: '1px solid var(--lp-border)',
  };

  return (
    <section
      id="features"
      className="lp-section"
      aria-labelledby="features-headline"
    >
      <div className="lp-container">
        {/* Section label */}
        <div className="lp-section-label">
          <div className="lp-section-label-line" aria-hidden="true" />
          <span className="lp-section-label-text">Why ORA</span>
          <div className="lp-section-label-line" aria-hidden="true" />
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', maxWidth: '40rem', margin: '0 auto 4rem' }}>
          <h2
            id="features-headline"
            className="lp-headline"
            style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', marginBottom: '1rem' }}
          >
            Built for merchants that move fast
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'var(--lp-text-secondary)', lineHeight: 1.7 }}>
            From first product listing to thousands of daily conversations, ORA gives your store the
            AI backbone to sell smarter, not harder.
          </p>
        </div>

        {/* Feature grid: flat panels, no card shadows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {/* Bento item 1: Visual playbook (large, spans 2 cols) */}
          <div
            style={{
              ...panelStyle,
              gridColumn: 'span 2',
              padding: '2.5rem',
              minHeight: '26rem',
            }}
          >
            <div className="lp-icon-box" style={{ marginBottom: '1.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <h3 className="lp-headline" style={{ fontSize: '1.375rem', marginBottom: '0.625rem' }}>
              Visual Sales Playbook Builder
            </h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65, maxWidth: '28rem' }}>
              Build cart recovery sequences, upsell journeys, and FAQ handlers with zero code.
            </p>

            {/* Playbook flow rows */}
            <div
              style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
                padding: '1.25rem',
                backgroundColor: 'var(--lp-bg-subtle)',
                border: '1px solid var(--lp-border)',
              }}
            >
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--lp-text-primary)' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--lp-primary-dim)', flexShrink: 0 }} />
                  Trigger: Cart Inactivity &gt; 45s
                </div>
                <span className="lp-mono" style={{ fontSize: '0.6875rem', color: 'var(--lp-text-tertiary)' }}>Intent &gt; 80%</span>
              </div>
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--lp-text-primary)' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#38bdf8', flexShrink: 0 }} />
                  Action: ORA Voice AI Inquires on Sizing
                </div>
                <span className="lp-mono" style={{ fontSize: '0.6875rem', color: 'var(--lp-text-tertiary)' }}>Sub-350ms</span>
              </div>
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--lp-text-primary)' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  Outcome: 1-Click Discount Added to Bag
                </div>
                <span className="lp-mono" style={{ fontSize: '0.6875rem', color: '#22c55e', fontWeight: 700 }}>+92.4% Recovered</span>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Real-time Monitor */}
            <div style={{ ...panelStyle, padding: '2rem', flex: 1 }}>
              <div className="lp-icon-box" style={{ marginBottom: '1.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="lp-headline" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                Real-time Monitoring
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Track latency, conversion rate, and errors live.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 500 }}>Response Time</span>
                    <span style={{ fontWeight: 700 }}>142ms</span>
                  </div>
                  <div className="lp-progress-track">
                    <div className="lp-progress-fill-lime" style={{ width: '65%' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 500 }}>Conversion Rate</span>
                    <span style={{ fontWeight: 700 }}>34.7%</span>
                  </div>
                  <div className="lp-progress-track">
                    <div className="lp-progress-fill-dark" style={{ width: '82%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Alerts */}
            <div style={{ ...panelStyle, padding: '2rem', flex: 1 }}>
              <div className="lp-icon-box" style={{ marginBottom: '1.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="lp-headline" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                Smart Alerts
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--lp-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Get notified instantly when ORA needs your attention.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="lp-avatar-stack" aria-label="3 team members and 8 more">
                  {['A', 'B', 'C'].map((l) => (
                    <div
                      key={l}
                      className="lp-avatar"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: l === 'A' ? '#D4F536' : l === 'B' ? 'var(--lp-text-primary)' : 'var(--lp-border)',
                        color: l === 'B' ? 'var(--lp-bg-white)' : '#111111',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                      }}
                    >
                      {l}
                    </div>
                  ))}
                  <div className="lp-avatar-count">+8</div>
                </div>
                <button
                  style={{
                    padding: '0.375rem 0.875rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    border: '1px solid var(--lp-border)',
                    background: 'transparent',
                    color: 'var(--lp-text-primary)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                  type="button"
                  id="view-alerts-btn"
                >
                  View Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
