/**
 * Display-side mirror of server/src/billing/utils/plan-pricing.util.ts.
 *
 * The server is authoritative for every amount charged; this only renders the
 * same arithmetic on pricing and checkout screens: yearly = monthly × 12, less
 * the plan's yearly discount, rounded to a whole minor unit.
 */

export type BillingCycle = 'month' | 'year';
export type PricingCurrency = 'USD' | 'BDT';

interface PricedPlan {
  priceUsdCents: number;
  priceBdtPaisa: number;
  yearlyDiscountPercent?: number | null;
}

export function toBillingCycle(value: unknown): BillingCycle {
  return typeof value === 'string' && /^year/i.test(value.trim()) ? 'year' : 'month';
}

export function yearlyDiscountOf(plan: PricedPlan): number {
  const d = Number(plan.yearlyDiscountPercent ?? 0);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.min(d, 90);
}

const monthlyMinor = (plan: PricedPlan, currency: PricingCurrency) =>
  currency === 'BDT' ? plan.priceBdtPaisa : plan.priceUsdCents;

/** Price for one full cycle, in minor units. */
export function planAmountMinor(plan: PricedPlan, currency: PricingCurrency, cycle: BillingCycle): number {
  const monthly = monthlyMinor(plan, currency);
  if (cycle === 'month') return monthly;
  return Math.round(monthly * 12 * (1 - yearlyDiscountOf(plan) / 100));
}

/** Twelve monthly payments: the crossed-out price next to a yearly price. */
export function planYearlyListMinor(plan: PricedPlan, currency: PricingCurrency): number {
  return monthlyMinor(plan, currency) * 12;
}

/** "$79", "$758.40", "৳8,500". Whole amounts drop the decimals. */
export function formatMinor(minor: number, currency: PricingCurrency): string {
  const major = minor / 100;
  const whole = minor % 100 === 0;
  const num = major.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === 'BDT' ? `৳${num}` : `$${num}`;
}
