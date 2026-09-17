'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Tag, Percent, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminCouponItem, CreateCouponPayload, AdminPlanItem } from '@/types/admin-billing';
import { createAdminCoupon, updateAdminCoupon } from '@/services/admin-billing-service';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon?: AdminCouponItem | null;
  availablePlans: AdminPlanItem[];
  onSaved: (coupon: AdminCouponItem) => void;
}

export function CouponModal({
  isOpen,
  onClose,
  coupon,
  availablePlans,
  onSaved,
}: CouponModalProps) {
  const isEditing = !!coupon;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [currency, setCurrency] = useState<'ALL' | 'USD' | 'BDT'>('ALL');
  const [duration, setDuration] = useState<'once' | 'forever' | 'repeating'>('once');
  const [durationInMonths, setDurationInMonths] = useState<number>(3);
  const [maxRedemptions, setMaxRedemptions] = useState<string>('');
  const [maxRedemptionsPerTenant, setMaxRedemptionsPerTenant] = useState<number>(1);
  const [validFrom, setValidFrom] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description || '');
      setDiscountType(coupon.discountType || 'percentage');
      if (coupon.discountType === 'percentage') {
        setDiscountValue(coupon.discountAmount.toString());
      } else {
        setDiscountValue((coupon.discountAmount / 100).toString());
      }
      setCurrency(coupon.currency || 'ALL');
      setDuration(coupon.duration || 'once');
      setDurationInMonths(coupon.durationInMonths || 3);
      setMaxRedemptions(coupon.maxRedemptions ? coupon.maxRedemptions.toString() : '');
      setMaxRedemptionsPerTenant(coupon.maxRedemptionsPerTenant ?? 1);
      setValidFrom(coupon.validFrom ? coupon.validFrom.substring(0, 10) : '');
      setValidUntil(coupon.validUntil ? coupon.validUntil.substring(0, 10) : '');
      setSelectedPlans(coupon.applicablePlans || []);
      setIsActive(coupon.isActive ?? true);
    } else {
      setCode('');
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('20');
      setCurrency('ALL');
      setDuration('once');
      setDurationInMonths(3);
      setMaxRedemptions('');
      setMaxRedemptionsPerTenant(1);
      const today = new Date().toISOString().substring(0, 10);
      setValidFrom(today);
      setValidUntil('');
      setSelectedPlans([]);
      setIsActive(true);
    }
    setError(null);
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  const handlePlanToggle = (planId: string) => {
    if (selectedPlans.includes(planId)) {
      setSelectedPlans(selectedPlans.filter((p) => p !== planId));
    } else {
      setSelectedPlans([...selectedPlans, planId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      setError('A valid uppercase coupon code is required.');
      return;
    }

    const val = parseFloat(discountValue || '0');
    if (isNaN(val) || val <= 0) {
      setError('Please provide a valid discount value greater than 0.');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    const calculatedDiscountAmount =
      discountType === 'percentage' ? val : Math.round(val * 100);

    setLoading(true);
    try {
      const payload: CreateCouponPayload = {
        code: cleanCode,
        description: description.trim(),
        discountType,
        discountAmount: calculatedDiscountAmount,
        currency,
        duration,
        durationInMonths: duration === 'repeating' ? Number(durationInMonths) : undefined,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        maxRedemptionsPerTenant: Number(maxRedemptionsPerTenant) || 1,
        validFrom: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        applicablePlans: selectedPlans,
        isActive,
      };

      let savedCoupon: AdminCouponItem;
      if (isEditing && coupon) {
        savedCoupon = await updateAdminCoupon(coupon._id, payload);
      } else {
        savedCoupon = await createAdminCoupon(payload);
      }

      onSaved(savedCoupon);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save coupon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-surface-lowest shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-heading">
                {isEditing ? `Edit ${coupon.code}` : 'New Coupon'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure discount, duration, and limits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Code & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Code <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LAUNCH20"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground font-mono font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Entered at checkout (case-insensitive).
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Early adopter 20% lifetime discount"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Section 2: Discount Structure */}
          <div className="p-4 rounded-xl bg-surface-container border border-border/80 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent size={13} className="text-primary" /> Discount
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as 'percentage' | 'fixed_amount')
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  {discountType === 'percentage' ? 'Percentage (%)' : 'Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    {discountType === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    min="1"
                    max={discountType === 'percentage' ? '100' : undefined}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'ALL' | 'USD' | 'BDT')}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All (USD & BDT)</option>
                  <option value="USD">USD (Stripe)</option>
                  <option value="BDT">BDT (bKash)</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value as 'once' | 'forever' | 'repeating')
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="once">Once (first invoice)</option>
                  <option value="forever">Forever (recurring)</option>
                  <option value="repeating">Repeating (monthly)</option>
                </select>
              </div>

              {duration === 'repeating' && (
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">
                    Months
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={durationInMonths}
                    onChange={(e) => setDurationInMonths(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Quotas & Validity Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Redemption limit
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if empty"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Total redemptions across all stores.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Limit per store
              </label>
              <input
                type="number"
                min="1"
                value={maxRedemptionsPerTenant}
                onChange={(e) =>
                  setMaxRedemptionsPerTenant(parseInt(e.target.value) || 1)
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Default: 1.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Valid From
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                No expiry if empty.
              </span>
            </div>
          </div>

          {/* Section 4: Applicable Plans */}
          <div className="space-y-2 pt-2 border-t border-border/80">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eligible Plans
            </label>
            <p className="text-[11px] text-muted-foreground">
              Select eligible plans, or leave unselected to apply to all.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {availablePlans.map((plan) => {
                const isSelected = selectedPlans.includes(plan.planId);
                return (
                  <button
                    key={plan.planId}
                    type="button"
                    onClick={() => handlePlanToggle(plan.planId)}
                    className={`px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-surface-high text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {plan.name} ({plan.planId})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active toggle */}
          <div className="pt-2 border-t border-border/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
              />
              <span>Coupon is Active and redeemable immediately</span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-container shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {loading && <Loader2 size={13} className="animate-spin mr-1.5" />}
            <span>{isEditing ? 'Save Coupon' : 'Create Coupon'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
