import Link from 'next/link';

export function CtaSection() {
  return (
    <section
      aria-labelledby="cta-headline"
      className="lp-dark-section"
      style={{
        padding: '6rem 0',
        margin: '0 1.5rem 0',
        borderRadius: 'var(--lp-radius-3xl)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle lime glow blob */}
      <div
        className="lp-glow-blob"
        style={{ width: '28rem', height: '20rem', top: '-4rem', left: '10%' }}
        aria-hidden="true"
      />

      <div className="lp-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Centered content */}
        <div style={{ textAlign: 'center', maxWidth: '38rem', margin: '0 auto' }}>

          <h2
            id="cta-headline"
            className="lp-display"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              color: '#fff',
              marginBottom: '1.25rem',
            }}
          >
            Start selling with voice AI today.
          </h2>

          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.75,
              marginBottom: '2.5rem',
            }}
          >
            Connect your store in 60 seconds. No credit card required. No lock-in.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/auth" className="lp-btn-lime" id="cta-section-start">
              Get started free
            </Link>
            <Link
              href="/pricing"
              id="cta-section-pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 'var(--lp-radius-full)',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease, color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              View pricing
            </Link>
          </div>



        </div>
      </div>
    </section>
  );
}
