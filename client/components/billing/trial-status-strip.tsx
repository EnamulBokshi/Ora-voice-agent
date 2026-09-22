'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Clock, X } from 'lucide-react';
import { getSubscriptionApi } from '@/services/billing-service';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'ora.trialStrip.dismissedOn';

/** Local YYYY-MM-DD, so a dismissal lasts for the rest of the day only. */
function today(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Slim one-line trial countdown rendered on every dashboard page.
 *
 * The detailed card on /billing stays the place to compare tiers; this strip only
 * answers "how much trial is left" and links there, so it is deliberately the height
 * of a single row and spans the content column without adding its own width.
 */
export function TrialStatusStrip() {
  const pathname = usePathname();
  const [subscription, setSubscription] = useState<SubscriptionDetailsResponse | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionApi()
      .then((res) => {
        if (!cancelled) setSubscription(res);
      })
      .catch(() => {
        // A failed billing read must never block the dashboard; the strip just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === today());
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, today());
    } catch {
      // Private mode — dismissal just does not persist.
    }
  }, []);

  const sub = subscription?.subscription;
  if (!sub) return null;

  const endMs = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : 0;
  const diffMs = endMs - Date.now();
  const isTrialing = sub.status === 'trialing';
  const isExpired = isTrialing && endMs > 0 && diffMs <= 0;

  // Paid and healthy subscriptions get no strip at all.
  if (!isTrialing) return null;

  const daysRemaining =
    subscription?.trialDaysRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining =
    subscription?.trialHoursRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const totalDays = sub.trialDays ?? 14;
  const isEndingSoon = daysRemaining <= 3;

  // Urgent states are not dismissible; a quiet mid-trial reminder is.
  if (dismissed && !isEndingSoon && !isExpired) return null;

  const remainingPercent = isExpired
    ? 0
    : Math.max(3, Math.min(100, Math.round((daysRemaining / totalDays) * 100)));

  const label = isExpired
    ? 'Free trial ended — access paused'
    : daysRemaining === 0
      ? `Trial ends today · ${hoursRemaining}h left`
      : `${daysRemaining} of ${totalDays} trial days left`;

  const tone = isExpired
    ? { text: 'text-destructive', bar: 'bg-destructive', dot: 'bg-destructive' }
    : isEndingSoon
      ? { text: 'text-amber-400', bar: 'bg-amber-400', dot: 'bg-amber-400' }
      : { text: 'text-foreground', bar: 'bg-primary', dot: 'bg-primary' };

  const onBilling = pathname?.startsWith('/billing');

  return (
    <div
      role="status"
      className="flex items-center gap-3 h-9 px-3 sm:px-4 border-b border-border/60 bg-surface-container/80 backdrop-blur-sm flex-shrink-0"
    >
      {isEndingSoon || isExpired ? (
        <Clock size={13} className={cn('shrink-0', tone.text)} />
      ) : (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tone.dot)} />
      )}

      <span className={cn('text-[12.5px] font-medium truncate', tone.text)}>{label}</span>

      {/* Thin remaining track — fixed width so the strip never stretches the layout. */}
      <div className="hidden sm:block w-24 h-1 rounded-full bg-surface-low overflow-hidden shrink-0">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone.bar)}
          style={{ width: `${remainingPercent}%` }}
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {!onBilling && (
          <Link
            href="/billing"
            className={cn(
              'inline-flex items-center gap-1 h-6 px-2.5 rounded text-[11.5px] font-semibold transition-colors cursor-pointer',
              isExpired
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : isEndingSoon
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'border border-border/60 bg-surface-high/40 text-foreground hover:bg-surface-high',
            )}
          >
            <span>{isExpired || isEndingSoon ? 'Upgrade' : 'View plans'}</span>
            <ArrowRight size={11} />
          </Link>
        )}

        {!isEndingSoon && !isExpired && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide trial reminder for today"
            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
