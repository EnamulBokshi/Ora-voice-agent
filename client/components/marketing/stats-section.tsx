const stats = [
  { value: '8K+', label: 'Merchants Onboarded' },
  { value: '1.2M+', label: 'Conversations Handled' },
  { value: '92.4%', label: 'Cart Recovery Rate' },
  { value: '$6.8M', label: 'Revenue Recovered' },
];

export function StatsSection() {
  return (
    <section
      id="stats"
      aria-labelledby="stats-headline"
      style={{ paddingTop: '2rem', paddingBottom: '2rem' }}
    >
      <div className="lp-container">
        <div
          className="lp-dark-section"
          style={{ padding: 'clamp(3rem, 5vw, 5rem) clamp(2rem, 5vw, 4rem)' }}
        >
          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0',
              position: 'relative',
              zIndex: 1,
            }}
            role="list"
            aria-label="ORA platform statistics"
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    padding: '0 clamp(2rem, 4vw, 3.5rem)',
                  }}
                >
                  <h3
                    className="lp-display"
                    style={{
                      fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                      color: 'var(--lp-text-on-dark)',
                      marginBottom: '0.375rem',
                    }}
                  >
                    {stat.value.replace(/[K+M%$]/g, '')}
                    <span style={{ color: 'var(--lp-primary-dim)' }}>
                      {stat.value.match(/[K+M%$]+/)?.[0] ?? ''}
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--lp-text-on-dark-dim)' }}>
                    {stat.label}
                  </p>
                </div>
                {i < stats.length - 1 && (
                  <div className="lp-stat-divider" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
