/**
 * Single source of truth for what a plan costs per billing cycle.
 *
 * A plan stores one monthly price per currency plus an admin-set
 * `yearlyDiscountPercent`. The yearly price is derived here, never stored,
 * so changing the monthly price or the discount can never leave the two out
 * of step. Every charge, quote, invoice and MRR figure reads from these
 * helpers.
 */

export type BillingCycle = 'month' | 'year';
export type PricingCurrency = 'USD' | 'BDT';

export const BILLING_CYCLES: readonly BillingCycle[] = ['month', 'year'] as const;

/** Upper bound for the admin-set yearly discount. */
export const MAX_YEARLY_DISCOUNT_PERCENT = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Period lengths used when a gateway does not report its own period end. */
const PERIOD_DAYS: Record<BillingCycle, number> = { month: 30, year: 365 };

export interface PricedPlan {
  priceUsdCents: number;
  priceBdtPaisa: number;
  yearlyDiscountPercent?: number | null;
}

/** Normalises anything a client or an older document might carry. */
export function toBillingCycle(value: unknown): BillingCycle {
  return typeof value === 'string' && /^year/i.test(value.trim()) ? 'year' : 'month';
}

/** The discount clamped to the allowed range. */
export function yearlyDiscountOf(plan: PricedPlan): number {
  const d = Number(plan.yearlyDiscountPercent ?? 0);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.min(d, MAX_YEARLY_DISCOUNT_PERCENT);
}

function monthlyMinor(plan: PricedPlan, currency: PricingCurrency): number {
  return currency === 'BDT' ? plan.priceBdtPaisa : plan.priceUsdCents;
}

/**
 * Price for one full billing cycle, in minor units (cents / paisa).
 * Yearly = monthly × 12, less the yearly discount, rounded to a whole minor unit.
 */
export function planAmountMinor(
  plan: PricedPlan,
  currency: PricingCurrency,
  cycle: BillingCycle,
): number {
  const monthly = monthlyMinor(plan, currency);
  if (cycle === 'month') return monthly;
  return Math.round(monthly * 12 * (1 - yearlyDiscountOf(plan) / 100));
}

/** What twelve monthly payments would cost; the crossed-out yearly price. */
export function planYearlyListMinor(plan: PricedPlan, currency: PricingCurrency): number {
  return monthlyMinor(plan, currency) * 12;
}

/** Monthly-equivalent USD, for MRR. A yearly subscriber counts as 1/12 of the yearly price. */
export function monthlyEquivalentUsd(plan: PricedPlan, cycle: BillingCycle): number {
  const cents = planAmountMinor(plan, 'USD', cycle);
  return (cycle === 'year' ? cents / 12 : cents) / 100;
}

/** Period end for a cycle starting at `from`, when the gateway gives none. */
export function addBillingPeriod(from: Date | number, cycle: BillingCycle): Date {
  const start = typeof from === 'number' ? from : from.getTime();
  return new Date(start + PERIOD_DAYS[cycle] * DAY_MS);
}
