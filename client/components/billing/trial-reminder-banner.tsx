'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TrialReminderBannerProps {
  subscription: SubscriptionDetailsResponse;
  onSubscribed: () => void;
  isExpiredParam?: boolean;
}

export function TrialReminderBanner({
  subscription,
  onSubscribed,
  isExpiredParam = false,
}: TrialReminderBannerProps) {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = subscription.subscription;
  const plan = subscription.plan;

  const isTrialing = sub?.status === 'trialing';

  // If there's no subscription and not expired param, or if already active, do not render a banner
  if ((!sub && !isExpiredParam) || sub?.status === 'active') {
    return null;
  }

  const currentPeriodEnd = sub?.currentPeriodEnd;
  const endMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : 0;
  const nowMs = Date.now();
  const diffMs = endMs > 0 ? endMs - nowMs : 0;

  const isExpired = isExpiredParam || (endMs > 0 && diffMs <= 0);

  const daysRemaining = subscription.trialDaysRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = subscription.trialHoursRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  const handlePayAndActivate = () => {
    if (!plan) {
      const el = document.getElementById('available-tiers');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubscribing(true);
    setError(null);
    router.push(`/billing/checkout?planId=${encodeURIComponent(plan.planId)}`);
  };

  const scrollToPlans = () => {
    const el = document.getElementById('available-tiers');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. EXPIRED TRIAL STATE — Compact warning strip
  if (isExpired) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-foreground transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-md bg-destructive/15 text-destructive shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="text-xs sm:text-[13px] leading-snug">
            <span className="font-semibold text-destructive">
              Free trial expired
            </span>
            <span className="text-muted-foreground">
              {' '}— ORA is currently paused on your storefront. Choose a plan to restore live shopper conversations.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToPlans}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-end sm:self-auto"
        >
          <span>Choose a Plan</span>
          <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  // 2. TRIALING STATE — Minimalist single-row alert strip
  if (isTrialing) {
    const isEndingSoon = daysRemaining <= 3;

    return (
      <div
        className={cn(
          'rounded-lg border px-4 py-3 sm:px-5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all',
          isEndingSoon
            ? 'border-amber-500/40 bg-amber-500/5 text-foreground'
            : 'border-border/60 bg-surface-container/60 text-foreground',
        )}
      >
        {/* Left: Live status dot & copy */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center shrink-0">
            {isEndingSoon ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-online)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--status-online)]" />
              </span>
            )}
          </div>

          <div className="text-xs sm:text-[13px] leading-snug">
            <span className="font-semibold text-foreground">
              {daysRemaining === 0
                ? `Trial ends today (${hoursRemaining}h remaining)`
                : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your free trial`}
            </span>
            <span className="text-muted-foreground hidden md:inline">
              {' '}— {plan?.name ?? 'Starter'} plan active. Upgrade anytime to keep your sales agent live.
            </span>
            {currentPeriodEnd && (
              <span className="text-muted-foreground/80 block md:inline md:before:content-['·_'] text-[11px] sm:text-xs">
                Ends {formatDateTime(currentPeriodEnd)}
              </span>
            )}
            {error && <p className="text-[11px] text-destructive mt-1 font-medium">{error}</p>}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={scrollToPlans}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1 cursor-pointer"
          >
            Compare plans
          </button>

          <button
            type="button"
            onClick={handlePayAndActivate}
            disabled={subscribing}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 touch-manipulation',
              isEndingSoon
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            {subscribing ? (
              <>
                <Loader2 className="animate-spin" size={12} />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <span>Upgrade Plan</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
