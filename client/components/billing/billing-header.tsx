'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BillingHeader() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const isUsageTab = tab === 'usage';

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Manage your plan, quotas, payment methods, and invoice history.
          </p>
        </div>
      </div>

      {/* Intercom Style Underline Tabs */}
      <div className="flex items-center gap-6 border-b border-border text-[13px] font-medium pt-1">
        <Link
          href="/billing"
          className={cn(
            'pb-2.5 relative transition-colors',
            !isUsageTab
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Subscription & Plans
        </Link>
        <Link
          href="/billing?tab=usage"
          className={cn(
            'pb-2.5 relative transition-colors',
            isUsageTab
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Usage & Quotas
        </Link>
      </div>
    </div>
  );
}
