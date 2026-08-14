'use client';

import { Server } from 'lucide-react';

const SERVICES = [
  { name: 'Store Chat Gateway', latency: '12ms', status: 'Operational' },
  { name: 'Voice Stream Engine', latency: '65ms', status: 'Operational' },
  { name: 'Conversation Runtime', latency: '24ms', status: 'Operational' },
  { name: 'Search & Catalog Index', latency: '18ms', status: 'Operational' },
  { name: 'Catalog Auto-Sync', latency: 'Active', status: 'Operational' },
  { name: 'Webhook & Order Relay', latency: 'Active', status: 'Operational' },
] as const;

export function OraStatusPanel() {
  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-primary" />
          <h3 className="text-[12px] font-semibold text-foreground">System Services Status</h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--status-online)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse-ring" />
          ALL ONLINE
        </span>
      </div>

      {/* Service list */}
      <ul className="p-3.5 space-y-2.5">
        {SERVICES.map((svc) => (
          <li key={svc.name} className="flex justify-between items-center text-[12px]">
            <span className="text-muted-foreground">{svc.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/80 font-mono">{svc.latency}</span>
              <span className="flex items-center gap-1 text-[11px] text-foreground font-medium">
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
