'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, Tag, Ticket, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import {
  createAdminCoupon,
  deactivateAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
} from '@/services/admin-service';
import { Coupon } from '@/types/billing';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const EMPTY_FORM = {
  code: '',
  discountType: 'percent' as 'percent' | 'fixed',
  percentOff: 20,
  amountOffUsd: 0,
  amountOffBdt: 0,
  appliesToPlanIds: '',
  maxRedemptions: '',
  maxRedemptionsPerBusiness: 1,
  expiresAt: '',
  notes: '',
};

const inputClass =
  'w-full rounded-lg border border-border bg-surface-high px-3 py-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Platform-admin coupon console.
 *
 * This screen creates and retires codes. It never prices anything: the discount a
 * merchant receives is computed by the server at checkout from these records.
 */
export function AdminCouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setCoupons(await fetchAdminCoupons());
    } catch (err) {
      toast.error('Could not load coupons', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = coupons.filter((c) => c.isActive).length;
  const redeemedTotal = coupons.reduce((acc, c) => acc + (c.redeemedCount || 0), 0);

  // Switching type resets the other type's figures, so a number typed as a
  // percentage can never be submitted as an amount, or the reverse.
  const selectDiscountType = (discountType: 'percent' | 'fixed') => {
    setForm((prev) =>
      discountType === 'percent'
        ? { ...prev, discountType, amountOffUsd: 0, amountOffBdt: 0 }
        : { ...prev, discountType, percentOff: 0 },
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdminCoupon({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        ...(form.discountType === 'percent'
          ? { percentOff: Number(form.percentOff) }
          : {
              amountOffUsdCents: Math.round(Number(form.amountOffUsd) * 100),
              amountOffBdtPaisa: Math.round(Number(form.amountOffBdt) * 100),
            }),
        appliesToPlanIds: form.appliesToPlanIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}),
        maxRedemptionsPerBusiness: Number(form.maxRedemptionsPerBusiness) || 1,
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      toast.success(`Coupon ${form.code.trim().toUpperCase()} created`, {
        description:
          form.discountType === 'percent'
            ? `${form.percentOff}% off, redeemable at checkout.`
            : `$${Number(form.amountOffUsd).toFixed(2)} off, redeemable at checkout.`,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadData();
    } catch (err) {
      toast.error('Coupon not created', {
        description:
          err instanceof Error ? err.message : 'Check the values and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      if (coupon.isActive) {
        await deactivateAdminCoupon(coupon._id);
        toast.success(`${coupon.code} deactivated`, {
          description: 'Merchants can no longer redeem it.',
        });
      } else {
        await updateAdminCoupon(coupon._id, { isActive: true });
        toast.success(`${coupon.code} reactivated`);
      }
      await loadData();
    } catch (err) {
      toast.error(`Could not update ${coupon.code}`, {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const discountLabel = (c: Coupon) =>
    c.discountType === 'percent'
      ? `${c.percentOff}% off`
      : `$${(c.amountOffUsdCents / 100).toFixed(2)} / ৳${Math.round(c.amountOffBdtPaisa / 100).toLocaleString()} off`;

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Coupons & Discount Codes"
        description="Discount codes merchants apply at checkout, with plan, expiry, and redemption limits."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      >
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 sm:px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          <span className="hidden sm:inline">{showForm ? 'Close' : 'New Coupon'}</span>
        </button>
      </AdminHeader>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title="Total Coupons"
            value={coupons.length}
            subtitle="All codes ever issued"
            icon={<Ticket size={18} />}
          />
          <PlatformStatCard
            title="Active Codes"
            value={activeCount}
            subtitle="Redeemable at checkout now"
            icon={<CheckCircle2 size={18} />}
          />
          <PlatformStatCard
            title="Total Redemptions"
            value={redeemedTotal}
            subtitle="Reserved or applied by merchants"
            icon={<Users size={18} />}
          />
          <PlatformStatCard
            title="Discount Engine"
            value="Server-Priced"
            subtitle="Codes sent in, amounts computed here"
            icon={<Tag size={18} />}
          />
        </div>

        {/* Create Coupon */}
        {showForm && (
          <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
            <h2 className="text-sm font-bold font-heading text-foreground">Issue New Coupon</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Code">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="LAUNCH20"
                    spellCheck={false}
                    autoComplete="off"
                    className={cn(inputClass, 'font-mono tracking-wide')}
                  />
                </Field>

                {/*
                  A segmented control rather than a dropdown: the selected type stays
                  visible while the amount is typed, so "29" cannot be entered under
                  one meaning and saved under the other.
                */}
                <Field label="Discount Type">
                  <div className="inline-flex w-full rounded-lg border border-border bg-surface-high p-0.5">
                    {(['percent', 'fixed'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => selectDiscountType(type)}
                        className={cn(
                          'flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition-colors',
                          form.discountType === type
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {type === 'percent' ? 'Percentage (%)' : 'Fixed Amount'}
                      </button>
                    ))}
                  </div>
                </Field>

                {form.discountType === 'percent' ? (
                  <Field label="Percent Off (1–100)">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={form.percentOff}
                        onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })}
                        className={cn(inputClass, 'pr-8')}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        %
                      </span>
                    </div>
                  </Field>
                ) : (
                  <>
                    <Field label="Amount Off (USD)">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.amountOffUsd}
                          onChange={(e) =>
                            setForm({ ...form, amountOffUsd: Number(e.target.value) })
                          }
                          className={cn(inputClass, 'pl-7')}
                        />
                      </div>
                    </Field>
                    <Field label="Amount Off (BDT)">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          ৳
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={form.amountOffBdt}
                          onChange={(e) =>
                            setForm({ ...form, amountOffBdt: Number(e.target.value) })
                          }
                          className={cn(inputClass, 'pl-7')}
                        />
                      </div>
                    </Field>
                  </>
                )}

                <Field label="Plans (comma separated, blank = all)">
                  <input
                    value={form.appliesToPlanIds}
                    onChange={(e) => setForm({ ...form, appliesToPlanIds: e.target.value })}
                    placeholder="growth, scale"
                    className={inputClass}
                  />
                </Field>

                <Field label="Total Redemptions (blank = unlimited)">
                  <input
                    type="number"
                    min={1}
                    value={form.maxRedemptions}
                    onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Per Merchant">
                  <input
                    type="number"
                    min={1}
                    value={form.maxRedemptionsPerBusiness}
                    onChange={(e) =>
                      setForm({ ...form, maxRedemptionsPerBusiness: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Expires">
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Internal Note">
                  <input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Partner launch campaign"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.code.trim() ||
                    (form.discountType === 'percent'
                      ? form.percentOff < 1 || form.percentOff > 100
                      : form.amountOffUsd <= 0 && form.amountOffBdt <= 0)
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />}
                  <span>{saving ? 'Issuing...' : 'Create Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coupon Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading text-foreground">Issued Coupons</h2>
            <span className="text-xs font-mono text-muted-foreground">
              Validated server-side at checkout
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-surface-container p-12 flex items-center justify-center gap-3 text-muted-foreground text-sm">
              <Loader2 className="animate-spin text-primary" size={18} />
              <span>Loading coupons...</span>
            </div>
          ) : coupons.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-container p-12 text-center text-sm text-muted-foreground">
              No coupons issued yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-container overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-surface-high/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Plans</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Redeemed</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Expires</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-border/60 last:border-0 hover:bg-surface-high/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-foreground">{c.code}</td>
                      <td className="px-4 py-3 text-foreground">{discountLabel(c)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.appliesToPlanIds?.length ? c.appliesToPlanIds.join(', ') : 'All tiers'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {c.redeemedCount}
                        {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.expiresAt ? formatDateTime(c.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            c.isActive
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-surface-high text-muted-foreground',
                          )}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleActive(c)}
                          className="rounded-lg border border-border bg-surface-high px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-bright transition-colors"
                        >
                          {c.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
