const TESTIMONIALS = [
  {
    quote:
      'We replaced our FAQ chatbot with ORA Voice. Shoppers talk to it like an in-store assistant. Cart abandonment dropped 34% in the first two weeks.',
    author: 'Elena Rostova',
    role: 'Head of E-Commerce, Modern Goods Co.',
    metric: '−34% abandonment',
  },
  {
    quote:
      'The sub-350ms latency is surreal — it feels like a live sales call. Because it reads our actual policies, it never makes anything up.',
    author: 'Tariq Rahman',
    role: 'Founder, Artisan Heritage',
    metric: '99.8% resolution',
  },
  {
    quote:
      'Live Desk lets us watch ORA close high-ticket sales. We jump in when an enterprise buyer needs VIP handling. It paid for itself on day one.',
    author: 'Marcus Vance',
    role: 'VP Digital Growth, Lumina Gear',
    metric: '$180k+ influenced',
  },
];

export function TestimonialSection() {
  return (
    <section
      aria-labelledby="testimonial-headline"
      className="lp-section"
      style={{ borderTop: '1px solid var(--lp-border)' }}
    >
      <div className="lp-container">

        {/* Centered header */}
        <div style={{ textAlign: 'center', maxWidth: '30rem', margin: '0 auto 4rem' }}>
          <h2
            id="testimonial-headline"
            className="lp-headline"
            style={{ fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)', marginBottom: '0.75rem' }}
          >
            Trusted by growing stores.
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65 }}>
            Merchants use ORA to sell smarter, not harder.
          </p>
        </div>

        {/* 3-column testimonials */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0',
          }}
        >
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              style={{
                padding: '2.5rem',
                borderLeft: i > 0 ? '1px solid var(--lp-border)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Metric pill */}
              <span className="lp-badge-lime" style={{ alignSelf: 'flex-start' }}>
                {t.metric}
              </span>

              {/* Quote */}
              <p
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.75,
                  color: 'var(--lp-text-primary)',
                  flexGrow: 1,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div style={{ borderTop: '1px solid var(--lp-border)', paddingTop: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text-primary)' }}>
                  {t.author}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-tertiary)', marginTop: '0.25rem' }}>
                  {t.role}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
