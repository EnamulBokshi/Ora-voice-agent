// Waveform animation class applied from globals.css
// Colors: .waveform (primary), .waveform-secondary (secondary), .waveform-success (ora-success)

const VOICE_SESSIONS = [
  { initial: 'F', name: 'Fahim',  status: 'Searching',  waveformClass: 'waveform',           avatarBg: 'color-mix(in srgb, var(--primary) 20%, transparent)',     avatarColor: 'var(--primary)'     },
  { initial: 'S', name: 'Sarah',  status: 'Comparing',  waveformClass: 'waveform waveform-secondary', avatarBg: 'color-mix(in srgb, var(--secondary) 20%, transparent)',   avatarColor: 'var(--secondary)'   },
  { initial: 'N', name: 'Nabila', status: 'Checkout',   waveformClass: 'waveform waveform-success',   avatarBg: 'color-mix(in srgb, var(--ora-success) 20%, transparent)', avatarColor: 'var(--ora-success)' },
];

export function VoiceSessionsPanel() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center pb-3"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {/* Waveform icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--secondary)' }} aria-hidden="true">
            <path d="M2 10v3M6 6v11M10 3v18M14 6v11M18 10v3"/>
          </svg>
          Voice Sessions
        </h3>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: 'var(--surface-high)', color: 'var(--muted-foreground)' }}
        >
          3 ACTIVE
        </span>
      </div>

      {/* Session list */}
      <ul className="space-y-4">
        {VOICE_SESSIONS.map((s) => (
          <li key={s.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: s.avatarBg, color: s.avatarColor }}
              >
                {s.initial}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.status}</p>
              </div>
            </div>
            {/* Animated waveform */}
            <div className={s.waveformClass} aria-label={`${s.name} speaking`}>
              <span /><span /><span /><span /><span /><span /><span />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
