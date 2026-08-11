import Link from 'next/link';

interface LiveStat {
  value: string;
  label: string;
  pulseVar: string;
}

const liveStats: LiveStat[] = [
  { value: '12',    label: 'Active Convs',       pulseVar: 'var(--primary)'   },
  { value: '4',     label: 'Voice Sessions',     pulseVar: 'var(--secondary)' },
  { value: '1,012', label: 'Customers Assisted', pulseVar: ''                 },
];

export function HeroStatusCard() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl flex flex-col md:flex-row"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
        minHeight:      '380px',
      }}
      aria-label="ORA live status"
    >
      {/* ── LEFT: AI Orb Visual Panel ────────────────── */}
      <div
        className="w-full md:w-2/5 p-6 flex flex-col items-center justify-center relative"
        style={{
          borderRight: '1px solid var(--glass-border)',
          background:  'rgba(0,0,0,0.12)',
        }}
      >
        {/* Ambient blobs — use primary / secondary glow */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <div
            className="absolute w-48 h-48 rounded-full blur-3xl"
            style={{
              top: '-20%', left: '10%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 35%, transparent) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute w-40 h-40 rounded-full blur-2xl"
            style={{
              bottom: '0%', right: '0%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--secondary) 30%, transparent) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute w-32 h-32 rounded-full blur-xl"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Orb */}
        <div className="relative z-10 text-center">
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 relative"
            style={{
              background:     'linear-gradient(135deg, color-mix(in srgb, var(--primary) 30%, transparent) 0%, color-mix(in srgb, var(--secondary) 30%, transparent) 100%)',
              border:         '1px solid var(--glass-border)',
              backdropFilter: 'blur(8px)',
              boxShadow:      'var(--logo-glow)',
            }}
          >
            <div
              className="absolute w-24 h-24 rounded-full animate-pulse"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)' }}
            />
            <span
              className="text-3xl font-bold relative z-10 select-none"
              style={{ color: 'var(--primary-foreground)', textShadow: '0 0 20px rgba(255,255,255,0.6)' }}
            >
              O
            </span>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-1 tracking-tight">ORA Intelligence</h2>
          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--ora-success)' }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--ora-success)', boxShadow: '0 0 0 0 var(--ora-success)', animation: 'pulse 2s infinite' }}
            />
            System Online
          </div>
        </div>
      </div>

      {/* ── RIGHT: Copy + stats + CTA ─────────────────── */}
      <div
        className="w-full md:w-3/5 p-8 flex flex-col justify-center"
        style={{ background: 'linear-gradient(135deg, transparent 0%, color-mix(in srgb, var(--primary) 4%, transparent) 100%)' }}
      >
        <h2
          className="text-3xl font-bold text-foreground mb-3 leading-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          ORA is actively selling<br />for your store right now.
        </h2>
        <p className="text-sm mb-8 text-muted-foreground">
          Your AI agent is currently engaging with customers, resolving queries, and driving conversions across multiple channels.
        </p>

        {/* Live stat chips */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {liveStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 p-3 rounded-xl"
              style={{
                background: 'var(--glass-bg)',
                border:     '1px solid var(--glass-border)',
              }}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-2xl font-bold text-foreground flex items-center gap-2">
                {stat.value}
                {stat.pulseVar && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: stat.pulseVar }}
                  />
                )}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div>
          <Link
            href="/live"
            id="hero-view-live-activity"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200"
            style={{
              background: 'var(--logo-gradient)',
              boxShadow:  'var(--logo-glow)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            View live activity
          </Link>
        </div>
      </div>
    </section>
  );
}
