export type DiscountType = 'percentage' | 'fixed_amount';

export interface DiscountCalculationResult {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  effectivePercentage: number;
}

/**
 * Pure calculation utility for applying coupon discounts to billing amounts.
 * All amounts are in smallest currency units (e.g. cents for USD, paisa for BDT).
 */
export function calculateDiscount(
  originalAmount: number,
  discountType: DiscountType,
  discountValue: number,
): DiscountCalculationResult {
  if (originalAmount <= 0) {
    return {
      originalAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
      effectivePercentage: 0,
    };
  }

  let discountAmount = 0;

  if (discountType === 'percentage') {
    const clampedPercent = Math.min(100, Math.max(0, discountValue));
    discountAmount = Math.round((originalAmount * clampedPercent) / 100);
  } else if (discountType === 'fixed_amount') {
    discountAmount = Math.max(0, Math.round(discountValue));
  }

  // Cap discount to originalAmount so final amount never goes below 0
  discountAmount = Math.min(originalAmount, discountAmount);
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  const effectivePercentage =
    originalAmount > 0
      ? Math.round((discountAmount / originalAmount) * 10000) / 100
      : 0;

  return {
    originalAmount,
    discountAmount,
    finalAmount,
    effectivePercentage,
  };
}
