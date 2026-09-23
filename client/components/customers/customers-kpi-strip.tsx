'use client';

import { useMemo } from 'react';
import { Users, UserCheck, SlidersHorizontal, Smartphone } from 'lucide-react';
import { Customer } from '@/types/customer';

interface CustomersKpiStripProps {
  customers: Customer[];
}

export function CustomersKpiStrip({ customers }: CustomersKpiStripProps) {
  const stats = useMemo(() => {
    const total = customers.length;
    const identified = customers.filter(
      (c) => Boolean(c.email && c.email.trim()) || Boolean(c.phone && c.phone.trim()),
    ).length;
    const profiled = customers.filter(
      (c) => c.extractedPreferences && Object.keys(c.extractedPreferences).length > 0,
    ).length;
    const totalDevices = customers.reduce(
      (acc, c) => acc + (c.deviceIds?.length ?? 1),
      0,
    );

    const identifiedPct = total > 0 ? Math.round((identified / total) * 100) : 0;
    const profiledPct = total > 0 ? Math.round((profiled / total) * 100) : 0;

    return {
      total,
      identified,
      identifiedPct,
      profiled,
      profiledPct,
      totalDevices,
    };
  }, [customers]);

  const cards = [
    {
      id: 'total',
      label: 'Total Shoppers',
      value: String(stats.total),
      subtext: 'Tracked across storefront',
      highlight: null,
      icon: <Users size={14} />,
    },
    {
      id: 'identified',
      label: 'Verified Contacts',
      value: String(stats.identified),
      subtext: 'of total profiles',
      highlight: `${stats.identifiedPct}%`,
      icon: <UserCheck size={14} />,
    },
    {
      id: 'profiled',
      label: 'Saved Preferences',
      value: String(stats.profiled),
      subtext: 'with noted styles or sizing',
      highlight: `${stats.profiledPct}%`,
      icon: <SlidersHorizontal size={14} />,
    },
    {
      id: 'devices',
      label: 'Connected Devices',
      value: String(stats.totalDevices),
      subtext: 'Omnichannel sessions',
      highlight: null,
      icon: <Smartphone size={14} />,
    },
  ];

  return (
    <div
      className="w-full rounded-md border border-border/50 bg-border/50 gap-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden"
      role="region"
      aria-label="Customer summary metrics"
    >
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-background px-4 sm:px-5 py-3.5 sm:py-4.5 hover:bg-surface-high/30 transition-colors flex flex-col justify-between min-w-0 relative group"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {card.label}
            </span>
            <div className="shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors">{card.icon}</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-[28px] font-semibold text-foreground tabular-nums leading-none tracking-tight">
              {card.value}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-2 flex items-center gap-1.5 tabular-nums">
              {card.highlight && (
                <span className="text-foreground dark:text-primary font-semibold tabular-nums">{card.highlight}</span>
              )}
              <span>{card.subtext}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
