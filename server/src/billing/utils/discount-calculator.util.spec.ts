import { calculateDiscount } from './discount-calculator.util';

describe('DiscountCalculatorUtil', () => {
  it('should calculate percentage discount accurately', () => {
    const res = calculateDiscount(4900, 'percentage', 20); // 20% of $49.00 ($9.80 off)
    expect(res.discountAmount).toBe(980);
    expect(res.finalAmount).toBe(3920);
    expect(res.effectivePercentage).toBe(20);
  });

  it('should cap 100% discount at full price', () => {
    const res = calculateDiscount(4900, 'percentage', 100);
    expect(res.discountAmount).toBe(4900);
    expect(res.finalAmount).toBe(0);
    expect(res.effectivePercentage).toBe(100);
  });

  it('should handle percentage discount over 100% by clamping to 100%', () => {
    const res = calculateDiscount(5000, 'percentage', 150);
    expect(res.discountAmount).toBe(5000);
    expect(res.finalAmount).toBe(0);
    expect(res.effectivePercentage).toBe(100);
  });

  it('should calculate fixed amount discount accurately', () => {
    const res = calculateDiscount(550000, 'fixed_amount', 100000); // 1000 BDT off 5500 BDT
    expect(res.discountAmount).toBe(100000);
    expect(res.finalAmount).toBe(450000);
    expect(res.effectivePercentage).toBe(18.18);
  });

  it('should clamp fixed discount that exceeds original price to original price', () => {
    const res = calculateDiscount(3000, 'fixed_amount', 5000);
    expect(res.discountAmount).toBe(3000);
    expect(res.finalAmount).toBe(0);
    expect(res.effectivePercentage).toBe(100);
  });

  it('should return 0 discount when 0 original amount', () => {
    const res = calculateDiscount(0, 'percentage', 50);
    expect(res.discountAmount).toBe(0);
    expect(res.finalAmount).toBe(0);
    expect(res.effectivePercentage).toBe(0);
  });
});
