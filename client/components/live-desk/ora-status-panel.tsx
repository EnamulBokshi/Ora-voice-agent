'use client';

import type { SystemHealthResponse, SystemServiceStatus } from '@/services/live-desk-service';

const DEFAULT_SERVICES: SystemServiceStatus[] = [
  { name: 'Voice WebSocket Gateway', latency: '4ms', status: 'Operational' },
  { name: 'Voice Stream Engine', latency: '4ms', status: 'Operational' },
  { name: 'Conversation Runtime', latency: '8ms', status: 'Operational' },
  { name: 'Search & Catalog Index', latency: '8ms', status: 'Operational' },
];

interface OraStatusPanelProps {
  health?: SystemHealthResponse | null;
}

export function OraStatusPanel({ health }: OraStatusPanelProps) {
  const services = health?.services && health.services.length > 0 ? health.services : DEFAULT_SERVICES;
  const isAllOnline = health ? health.allOnline : true;

  return (
    <div className="overflow-hidden bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-foreground">
            Service Health
          </h3>
        </div>
        <span className="text-[10.5px] font-mono text-muted-foreground">
          {isAllOnline ? 'OPERATIONAL' : 'DEGRADED'}
        </span>
      </div>

      {/* Service list */}
      <ul className="p-4 space-y-2.5 bg-transparent">
        {services.slice(0, 4).map((svc) => (
          <li key={svc.name} className="flex justify-between items-center text-[12px]">
            <span className="text-muted-foreground">{svc.name}</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[10.5px] text-muted-foreground/80">{svc.latency}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-foreground font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                {svc.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
