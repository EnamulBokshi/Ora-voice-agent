'use client';

import { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Calendar,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { subscribePlanApi } from '@/services/billing-service';
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
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = subscription.subscription;
  const plan = subscription.plan;

  const isTrialing = sub?.status === 'trialing';
  const isActive = sub?.status === 'active';

  // If there's no subscription at all and not expired param, return null
  if (!sub && !isExpiredParam) {
    return null;
  }

  const currentPeriodStart = sub?.currentPeriodStart;
  const currentPeriodEnd = sub?.currentPeriodEnd;

  const startMs = currentPeriodStart ? new Date(currentPeriodStart).getTime() : Date.now() - 24 * 60 * 60 * 1000;
  const endMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : Date.now() + 14 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const totalDurationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.max(0, Math.min(totalDurationMs, nowMs - startMs));
  const diffMs = endMs - nowMs;

  const isExpired = isExpiredParam || (endMs > 0 && diffMs <= 0);

  // Remaining days and hours calculations
  const totalDays = isTrialing ? 14 : Math.max(1, Math.round(totalDurationMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = subscription.trialDaysRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = subscription.trialHoursRemaining ?? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  // Progress percentage (remaining out of total)
  const remainingPercent = isExpired ? 0 : Math.max(0, Math.min(100, Math.round((diffMs / totalDurationMs) * 100)));

  const handlePayAndActivate = async () => {
    if (!plan) {
      const el = document.getElementById('available-tiers');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubscribing(true);
    setError(null);
    try {
      const provider = sub?.billingProvider === 'bkash' ? 'bkash' : 'stripe';
      const result = await subscribePlanApi({ planId: plan.planId, provider });
      if (result.requiresRedirect && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.requiresRedirect && result.bkashURL) {
        window.location.href = result.bkashURL;
        return;
      }
      onSubscribed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initiate payment checkout.');
    } finally {
      setSubscribing(false);
    }
  };

  const scrollToPlans = () => {
    const el = document.getElementById('available-tiers');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. EXPIRED TRIAL STATE
  if (isExpired) {
    return (
      <div className="rounded-lg border border-destructive/60 bg-surface-container p-5 sm:p-6 text-foreground shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-destructive/20 text-destructive shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold font-serif text-destructive">
                  14-Day Free Trial Expired — Access Paused
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/20 text-destructive font-semibold border border-destructive/30">
                  Expired
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Your 14-day free trial on the {plan ? <strong>{plan.name}</strong> : 'ORA Platform'} has
                ended. Real-time voice calls and document ingestions are currently paused. Choose a plan
                below to activate paid billing and restore live shopper interactions immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToPlans}
            className="shrink-0 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Activate Subscription</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Expired Remaining Bar: 0% Empty */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>0 of 14 Days Remaining</span>
            <span className="text-destructive font-semibold">0% Remaining</span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-lowest border border-border/60 overflow-hidden">
            <div className="h-full bg-destructive/40 rounded-full w-0" />
          </div>
        </div>
      </div>
    );
  }

  // 2. TRIALING STATE (Dedicated Urgency Countdown & Visual Remaining Bar)
  if (isTrialing) {
    const isEndingSoon = daysRemaining <= 3;

    return (
      <div
        className={cn(
          'rounded-lg border p-5 sm:p-6 text-foreground shadow-sm space-y-4.5 transition-all',
          isEndingSoon
            ? 'border-amber-500/50 bg-surface-container ring-1 ring-amber-500/20'
            : 'border-primary/40 bg-surface-container ring-1 ring-primary/20',
        )}
      >
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-md shrink-0 flex items-center justify-center',
                isEndingSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary',
              )}
            >
              {isEndingSoon ? <Clock size={20} /> : <Sparkles size={20} />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[color:var(--status-online)] animate-pulse" />
                <h3 className="text-sm sm:text-base font-semibold font-serif text-foreground">
                  {isEndingSoon
                    ? daysRemaining === 0
                      ? `Trial Ending Today (${hoursRemaining} Hours Left)`
                      : `Trial Ending Soon — ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`
                    : `14-Day Free Trial — ${daysRemaining} Days Remaining`}
                </h3>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-semibold border',
                    isEndingSoon
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-primary/20 text-primary border-primary/30',
                  )}
                >
                  {plan?.name ?? 'Starter Plan'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your AI sales agent is currently live. Pay and activate anytime without losing your remaining trial days.
              </p>
            </div>
          </div>

          {/* Quick Pay CTA Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handlePayAndActivate}
              disabled={subscribing}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 touch-manipulation',
                isEndingSoon
                  ? 'bg-amber-500 text-black hover:bg-amber-400 font-bold'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {subscribing ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  <span>Connecting Gateway…</span>
                </>
              ) : (
                <>
                  <CreditCard size={13} />
                  <span>Pay & Upgrade Now</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={scrollToPlans}
              className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-medium border border-border/60 bg-surface-high/40 text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
            >
              Compare Tiers
            </button>
          </div>
        </div>

        {/* ── THE REMAINING BAR (Progress Track) ── */}
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Trial Period Remaining:</span>
              <strong className="text-foreground font-semibold">
                {daysRemaining} of 14 Days Left
              </strong>
            </span>
            <span className="text-[11.5px] font-mono text-muted-foreground">
              Expires: <strong className="text-foreground">{currentPeriodEnd ? formatDateTime(currentPeriodEnd) : 'In 14 days'}</strong>
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3.5 rounded-full bg-surface-low border border-border/60 p-0.5 overflow-hidden shadow-inner">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out shadow-xs',
                isEndingSoon
                  ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-primary shadow-[0_0_12px_rgba(200,240,49,0.4)]',
              )}
              style={{ width: `${Math.max(4, remainingPercent)}%` }}
            />
          </div>

          {/* Milestone markers under bar */}
          <div className="flex justify-between text-[10.5px] font-mono text-muted-foreground pt-0.5">
            <span>Day 1 (Activated)</span>
            <span>Day 7 (Midway)</span>
            <span>Day 14 (End of Trial)</span>
          </div>
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }

  // 3. ACTIVE PAID STATE (Shows Current Billing Cycle Remaining Bar)
  if (isActive) {
    return (
      <div className="rounded-lg border border-border/50 bg-surface-container p-5 sm:p-6 text-foreground shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[color:var(--status-online)]" />
                <h3 className="text-sm sm:text-base font-semibold font-serif text-foreground">
                  Active Subscription — {plan?.name ?? 'Plan'}
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold border border-primary/30">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current monthly cycle renews on {currentPeriodEnd ? formatDateTime(currentPeriodEnd) : 'next month'}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToPlans}
            className="self-start sm:self-auto inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium border border-border/60 bg-surface-high/40 hover:bg-surface-high text-foreground transition-colors cursor-pointer"
          >
            <span>Upgrade / Switch Plan</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* ── Active Billing Cycle Remaining Bar ── */}
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock size={13} className="text-primary" />
              <span>Billing Cycle Remaining:</span>
              <strong className="text-foreground font-semibold">
                {daysRemaining} of {totalDays} Days Left
              </strong>
            </span>
            <span className="text-[11.5px] font-mono text-muted-foreground">
              Cycle End: <strong className="text-foreground">{currentPeriodEnd ? formatDateTime(currentPeriodEnd) : 'In 30 days'}</strong>
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-surface-low border border-border/60 p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/90 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(4, remainingPercent)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
