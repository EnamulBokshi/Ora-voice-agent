export function TestimonialSection() {
  return (
    <section
      id="testimonials"
      aria-label="Customer testimonial"
      className="lp-section"
      style={{ maxWidth: '52rem', margin: '0 auto', textAlign: 'center', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
    >
      {/* Quote icon */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="var(--lp-primary-dim)"
        aria-hidden="true"
        style={{ margin: '0 auto 2rem' }}
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>

      {/* Quote */}
      <blockquote>
        <p
          className="lp-headline"
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 600,
            color: 'var(--lp-text-primary)',
            lineHeight: 1.55,
            marginBottom: '2.5rem',
          }}
        >
          "ORA became the best sales rep we never had to hire. It recovers carts at 2 AM, answers
          product questions instantly, and our revenue went up 40% in the first month."
        </p>

        {/* Attribution */}
        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div
            aria-hidden="true"
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4F536 0%, #8BA913 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--lp-font-display)',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: '#111',
              boxShadow: 'var(--lp-shadow-card)',
              flexShrink: 0,
            }}
          >
            R
          </div>
          <div style={{ textAlign: 'left' }}>
            <cite style={{ fontStyle: 'normal', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--lp-text-primary)', display: 'block' }}>
              Rania Sultana
            </cite>
            <span style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)' }}>
              Head of E-commerce, FashionBD
            </span>
          </div>
        </footer>
      </blockquote>
    </section>
  );
}
