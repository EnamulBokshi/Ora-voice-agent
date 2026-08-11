const SERVICES = [
  'Gateway',
  'Voice',
  'Agent',
  'RAG',
  'Ingestion',
  'Connection',
] as const;

export function OraStatusPanel() {
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
        <h3 className="text-sm font-semibold text-foreground">ORA Status</h3>
        <span
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--ora-success)' }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse-ring"
            style={{ backgroundColor: 'var(--ora-success)' }}
          />
          ONLINE
        </span>
      </div>

      {/* Service list */}
      <ul className="space-y-3">
        {SERVICES.map((svc) => (
          <li key={svc} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{svc}</span>
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--ora-success)' }}
              />
              Operational
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
