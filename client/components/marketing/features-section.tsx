const CAPABILITIES = [
  {
    number: '01',
    title: 'Sub-second voice conversations',
    description:
      'Under 350ms bidirectional voice latency. Natural interruptions, human cadence — no scripted menus.',
    stat: '<350ms',
    statLabel: 'Voice latency',
  },
  {
    number: '02',
    title: 'Autonomous store knowledge',
    description:
      'ORA indexes your catalog, policies, and FAQs automatically. Zero hallucinations — every answer grounded in your store data.',
    stat: '100%',
    statLabel: 'Policy-grounded',
  },
  {
    number: '03',
    title: 'Live desk & cart recovery',
    description:
      'Watch active conversations in real time. Alert on high-intent shoppers and take over with one click.',
    stat: '+38%',
    statLabel: 'Checkout lift',
  },
  {
    number: '04',
    title: 'Built for global commerce',
    description:
      'Stripe USD and bKash BDT. AES-256 encrypted tenant isolation. Ready for any market.',
    stat: '60s',
    statLabel: 'Setup time',
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-headline"
      className="lp-section"
      style={{ borderTop: '1px solid var(--lp-border)' }}
    >
      <div id="solutions" style={{ position: 'relative', top: '-6rem' }} aria-hidden="true" />

      <div className="lp-container">

        {/* Centered header */}
        <div style={{ textAlign: 'center', maxWidth: '38rem', margin: '0 auto 5rem' }}>
          <h2
            id="features-headline"
            className="lp-headline"
            style={{ fontSize: 'clamp(1.875rem, 4vw, 2.75rem)', marginBottom: '1rem' }}
          >
            Everything you need to sell around the clock.
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', lineHeight: 1.7 }}>
            ORA handles the full conversation — from first question to completed checkout — without a human in the loop.
          </p>
        </div>

        {/* 2×2 grid — visual stat + text, no cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0',
          }}
        >
          {CAPABILITIES.map((cap, i) => {
            const isRightCol = i % 2 === 1;
            const isBottomRow = i >= 2;
            return (
              <div
                key={cap.number}
                style={{
                  padding: '3rem',
                  borderLeft: isRightCol ? '1px solid var(--lp-border)' : 'none',
                  borderTop: isBottomRow ? '1px solid var(--lp-border)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Large visual stat */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span
                    className="lp-display"
                    style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', color: 'var(--lp-stat-highlight)' }}
                  >
                    {cap.stat}
                  </span>
                  <span
                    className="lp-mono"
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--lp-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 600,
                    }}
                  >
                    {cap.statLabel}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="lp-headline"
                  style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3 }}
                >
                  {cap.title}
                </h3>

                {/* Description */}
                <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65 }}>
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
