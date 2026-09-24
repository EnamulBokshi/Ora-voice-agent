import {
  addBillingPeriod,
  monthlyEquivalentUsd,
  planAmountMinor,
  planYearlyListMinor,
  toBillingCycle,
  yearlyDiscountOf,
} from './plan-pricing.util';

describe('plan-pricing.util', () => {
  const plan = { priceUsdCents: 7900, priceBdtPaisa: 850000, yearlyDiscountPercent: 20 };

  it('returns the stored monthly price for a monthly cycle', () => {
    expect(planAmountMinor(plan, 'USD', 'month')).toBe(7900);
    expect(planAmountMinor(plan, 'BDT', 'month')).toBe(850000);
  });

  it('derives the yearly price as 12 months less the discount', () => {
    // 7900 × 12 × 0.8 = 75840
    expect(planAmountMinor(plan, 'USD', 'year')).toBe(75840);
    expect(planAmountMinor(plan, 'BDT', 'year')).toBe(8160000);
    expect(planYearlyListMinor(plan, 'USD')).toBe(94800);
  });

  it('charges 12 × monthly when no discount is set', () => {
    expect(planAmountMinor({ priceUsdCents: 2900, priceBdtPaisa: 320000 }, 'USD', 'year')).toBe(34800);
  });

  it('rounds to a whole minor unit', () => {
    // 2900 × 12 × 0.85 = 29580; 999 × 12 × 0.85 = 10189.8 → 10190
    expect(planAmountMinor({ priceUsdCents: 999, priceBdtPaisa: 0, yearlyDiscountPercent: 15 }, 'USD', 'year')).toBe(10190);
  });

  it('clamps nonsense discounts', () => {
    expect(yearlyDiscountOf({ ...plan, yearlyDiscountPercent: -5 })).toBe(0);
    expect(yearlyDiscountOf({ ...plan, yearlyDiscountPercent: 150 })).toBe(90);
    expect(yearlyDiscountOf({ ...plan, yearlyDiscountPercent: null })).toBe(0);
  });

  it('counts a yearly subscriber as one twelfth of the yearly price in MRR', () => {
    expect(monthlyEquivalentUsd(plan, 'month')).toBe(79);
    expect(monthlyEquivalentUsd(plan, 'year')).toBeCloseTo(63.2, 5);
  });

  it('normalises cycle values from clients and older documents', () => {
    expect(toBillingCycle('year')).toBe('year');
    expect(toBillingCycle('yearly')).toBe('year');
    expect(toBillingCycle('month')).toBe('month');
    expect(toBillingCycle(undefined)).toBe('month');
    expect(toBillingCycle('weekly')).toBe('month');
  });

  it('adds 30 or 365 days', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(addBillingPeriod(from, 'month').toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(addBillingPeriod(from, 'year').toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
