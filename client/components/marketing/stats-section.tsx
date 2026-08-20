const STATS = [
  { value: '+38%', label: 'Checkout uplift' },
  { value: '<350ms', label: 'Voice latency' },
  { value: '24/7', label: 'Autonomous coverage' },
  { value: '60s', label: 'Setup time' },
];

export function StatsSection() {
  return (
    <section
      aria-label="Key metrics"
      style={{
        padding: '5rem 0',
        borderTop: '1px solid var(--lp-border)',
        borderBottom: '1px solid var(--lp-border)',
        textAlign: 'center',
      }}
    >
      <div className="lp-container">

        {/* Label */}
        <p
          className="lp-mono"
          style={{
            color: 'var(--lp-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.6875rem',
            marginBottom: '3rem',
          }}
        >
          By the numbers
        </p>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '0',
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: '1.5rem 4rem',
                borderLeft: i > 0 ? '1px solid var(--lp-border)' : 'none',
                flex: '1 1 160px',
              }}
            >
              <div
                className="lp-display"
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                  marginBottom: '0.5rem',
                  color: 'var(--lp-text-primary)',
                }}
              >
                {stat.value}
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--lp-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
