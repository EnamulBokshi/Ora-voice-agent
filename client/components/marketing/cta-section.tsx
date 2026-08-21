import Link from 'next/link';

export function CtaSection() {
  return (
    <section
      id="cta"
      aria-labelledby="cta-headline"
      style={{ paddingTop: '2rem', paddingBottom: '6rem' }}
    >
      <div className="lp-container">
        <div
          className="lp-dark-section"
          style={{
            padding: 'clamp(4rem, 7vw, 7rem) clamp(2rem, 5vw, 4rem)',
            textAlign: 'center',
          }}
        >
          {/* Large glow blob */}
          <div
            className="lp-glow-blob"
            aria-hidden="true"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '30rem',
              height: '30rem',
              opacity: 0.18,
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '40rem', margin: '0 auto' }}>
            <h2
              id="cta-headline"
              className="lp-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                color: 'var(--lp-text-on-dark)',
                marginBottom: '1.25rem',
                lineHeight: 1.15,
              }}
            >
              Stop losing sales.<br />
              Start recovering revenue.
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--lp-text-on-dark-dim)',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
              }}
            >
              Join thousands of merchants already using ORA to automate their sales conversations
              and grow their revenue on autopilot.
            </p>

            <Link href="/auth" className="lp-btn-lime" id="cta-get-started-btn" style={{ fontSize: '1.0625rem' }}>
              Get Started Free
            </Link>

            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--lp-text-on-dark-dim)',
                opacity: 0.6,
              }}
            >
              No credit card required &nbsp;·&nbsp; Free plan available
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
