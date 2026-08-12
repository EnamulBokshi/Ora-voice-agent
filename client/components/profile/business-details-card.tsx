'use client';

import { Store, Globe, Key } from 'lucide-react';
import { Business } from '@/types/auth';

interface BusinessDetailsCardProps {
  business: Business | null;
}

export function BusinessDetailsCard({ business }: BusinessDetailsCardProps) {
  if (!business) {
    return (
      <div className="rounded-lg border border-border bg-surface-container p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Business</h2>
        <p className="text-[13px] text-muted-foreground">No business associated with this account.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-container p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Business</h2>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <Store size={13} /> Name
          </dt>
          <dd className="text-foreground font-medium">{business.name}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <Globe size={13} /> Domain
          </dt>
          <dd className="text-foreground font-medium">{business.domain || '—'}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <Key size={13} /> Publishable key
          </dt>
          <dd className="font-mono text-[12px] text-foreground">{business.publishableKey}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">Status</dt>
          <dd className="text-foreground font-medium capitalize">{business.status || 'Active'}</dd>
        </div>
      </dl>
    </div>
  );
}
