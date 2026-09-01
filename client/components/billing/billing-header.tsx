'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BillingHeader() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const isUsageTab = tab === 'usage';

  return (
    <div className="border-b border-border/40 pb-0">
      {/* Intercom Style Underline Tabs */}
      <div className="flex items-center gap-6 text-[13px] font-medium -mb-px">
        <Link
          href="/billing"
          className={cn(
            'pb-3 relative transition-colors cursor-pointer',
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
            'pb-3 relative transition-colors cursor-pointer',
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
