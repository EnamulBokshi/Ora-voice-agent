'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Store,
  Calendar,
  CreditCard,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
  Ban,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchAdminSubscriptionById,
  updateAdminSubscription,
  cancelAdminSubscription,
} from '@/services/admin-billing-service';
import {
  AdminSubscriptionItem,
  AdminPlanItem,
  UpdateSubscriptionAdminPayload,
} from '@/types/admin-billing';
import { cn } from '@/lib/utils';

interface SubscriptionDrawerProps {
  subscriptionId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  availablePlans: AdminPlanItem[];
}

export function SubscriptionDrawer({
  subscriptionId,
  open,
  onClose,
  onUpdated,
  availablePlans,
}: SubscriptionDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [data, setData] = useState<{
    subscription: AdminSubscriptionItem;
    business: any;
    plan: AdminPlanItem;
    owner: { email: string; name: string } | null;
    recentTransactions: any[];
    recentInvoices: any[];
  } | null>(null);

  // Form state for admin overrides
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetchAdminSubscriptionById(id);
      setData(res);
      setSelectedPlanId(res.subscription.planId);
      setSelectedStatus(res.subscription.status);
      setCancelAtPeriodEnd(!!res.subscription.cancelAtPeriodEnd);
      setAdminNotes(res.subscription.adminNotes || '');
      if (res.subscription.currentPeriodEnd) {
        const dateStr = new Date(res.subscription.currentPeriodEnd).toISOString().split('T')[0];
        setPeriodEndDate(dateStr);
      }
    } catch (err: any) {
      console.error('Failed to load subscription details:', err);
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to load subscription details.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && subscriptionId) {
      loadDetail(subscriptionId);
    } else {
      setData(null);
    }
  }, [open, subscriptionId, loadDetail]);

  const handleSaveOverrides = async () => {
    if (!subscriptionId) return;
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const payload: UpdateSubscriptionAdminPayload = {
        planId: selectedPlanId,
        status: selectedStatus,
        cancelAtPeriodEnd,
        adminNotes,
      };
      if (periodEndDate) {
        payload.currentPeriodEnd = new Date(periodEndDate).toISOString();
      }

      await updateAdminSubscription(subscriptionId, payload);
      setFeedbackMsg({ type: 'success', text: 'Subscription updated successfully.' });
      onUpdated();
      loadDetail(subscriptionId);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to update subscription.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async (immediate = false) => {
    if (!subscriptionId) return;
    const confirmText = immediate
      ? 'Are you sure you want to cancel this subscription immediately? The merchant will lose premium access instantly.'
      : 'Cancel subscription at the end of current billing period?';
    if (!window.confirm(confirmText)) return;

    setCancelling(true);
    setFeedbackMsg(null);
    try {
      await cancelAdminSubscription(subscriptionId, immediate);
      setFeedbackMsg({
        type: 'success',
        text: immediate ? 'Subscription canceled immediately.' : 'Subscription set to cancel at period end.',
      });
      onUpdated();
      loadDetail(subscriptionId);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to cancel subscription.' });
    } finally {
      setCancelling(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      {/* Backdrop overlay click */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over Sheet Panel */}
      <div className="w-full max-w-2xl bg-surface-low border-l border-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-surface-high border border-border flex items-center justify-center text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                {data?.business?.name || 'Subscription Details'}
                {data?.subscription?.status && (
                  <span
                    className={cn(
                      'text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold',
                      data.subscription.status === 'active' && 'bg-primary/10 text-primary border border-primary/20',
                      data.subscription.status === 'trialing' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                      data.subscription.status === 'past_due' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                      data.subscription.status === 'suspended' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                      data.subscription.status === 'canceled' && 'bg-muted text-muted-foreground border border-border',
                    )}
                  >
                    {data.subscription.status}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {data?.business?.domain || data?.subscription?.businessId || 'Loading...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-high text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground space-y-3">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p>Loading subscription details & invoices...</p>
            </div>
          ) : data ? (
            <>
              {feedbackMsg && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium',
                    feedbackMsg.type === 'success'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                  )}
                >
                  {feedbackMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  {feedbackMsg.text}
                </div>
              )}

              {/* 1. Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface-container">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">Plan Tier</span>
                  <span className="text-sm font-semibold text-foreground capitalize mt-0.5 block">
                    {data.plan?.name || data.subscription.planId}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                      ${((data.plan?.priceUsdCents || 0) / 100).toFixed(2)}
                    </span>
                    /mo
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface-container">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">Provider</span>
                  <span className="text-sm font-semibold text-foreground uppercase mt-0.5 block">
                    {data.subscription.billingProvider}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block">
                    {data.subscription.providerRef || 'Direct'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface-container">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">Renewal Date</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground mt-0.5 block">
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {data.subscription.cancelAtPeriodEnd ? (
                      <span className="text-amber-400">Cancels at end</span>
                    ) : (
                      'Auto-renews'
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface-container">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">Owner Account</span>
                  <span className="text-sm font-semibold text-foreground truncate mt-0.5 block">
                    {data.owner?.name || 'Store Owner'}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate block">
                    {data.owner?.email || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Applied Coupon Info if active */}
              {data.subscription.appliedCoupon && (
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      Applied Promo Code: <strong className="font-mono text-primary">{data.subscription.appliedCoupon.code}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      ({data.subscription.appliedCoupon.discountType === 'percentage'
                        ? `${data.subscription.appliedCoupon.discountAmount}% off`
                        : `$${(data.subscription.appliedCoupon.discountAmount / 100).toFixed(2)} off`})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Applied on {new Date(data.subscription.appliedCoupon.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* 2. Admin Override Controls Form */}
              <div className="p-5 rounded-2xl border border-border bg-surface-container space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Manage Subscription
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Admin controls</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-muted-foreground font-medium mb-1.5 block">Plan</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-high px-3 py-2 text-foreground focus:outline-none focus:border-primary font-medium"
                    >
                      {availablePlans.map((p) => (
                        <option key={p.planId} value={p.planId}>
                          {p.name} (${(p.priceUsdCents / 100).toFixed(2)}/mo)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium mb-1.5 block">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-high px-3 py-2 text-foreground focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="past_due">Past Due</option>
                      <option value="suspended">Suspended</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground font-medium mb-1.5 block">Period end</label>
                    <input
                      type="date"
                      value={periodEndDate}
                      onChange={(e) => setPeriodEndDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-high px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer p-2 rounded-xl hover:bg-surface-high transition-colors">
                      <input
                        type="checkbox"
                        checked={cancelAtPeriodEnd}
                        onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
                        className="rounded border-border accent-primary h-4 w-4"
                      />
                      <span>Cancel at period end</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground font-medium mb-1.5 block text-xs">
                    Admin notes
                  </label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Reason for change..."
                    className="w-full rounded-xl border border-border bg-surface-high px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleSaveOverrides}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Saving...' : 'Apply Changes'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelSubscription(false)}
                      disabled={cancelling || data.subscription.status === 'canceled'}
                      className="px-3 py-1.5 rounded-xl border border-border bg-surface-high text-xs text-muted-foreground hover:text-amber-400 hover:border-amber-400/30 transition-colors disabled:opacity-40"
                    >
                      Cancel at End
                    </button>
                    <button
                      onClick={() => handleCancelSubscription(true)}
                      disabled={cancelling || data.subscription.status === 'canceled'}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                    >
                      Cancel Immediately
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Recent Invoices */}
              <div className="p-5 rounded-2xl border border-border bg-surface-container space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Invoices
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums font-medium">
                    {data.recentInvoices?.length || 0} recorded
                  </span>
                </div>

                {data.recentInvoices?.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No invoices generated yet.</p>
                ) : (
                  <div className="divide-y divide-border/40 text-xs">
                    {data.recentInvoices?.map((inv: any) => (
                      <div key={inv._id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-foreground block">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {new Date(inv.createdAt).toLocaleDateString()} • Status: <strong className="capitalize">{inv.status}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground tabular-nums text-sm">
                            ${((inv.amountUsdCents || 0) / 100).toFixed(2)}
                          </span>
                          <a
                            href={`/api/v1/invoices/${inv._id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded border border-border hover:bg-surface-high text-muted-foreground hover:text-foreground transition-colors"
                            title="View Invoice PDF / HTML"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Recent Payment Transactions */}
              <div className="p-5 rounded-2xl border border-border bg-surface-container space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Payment Transaction History
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums font-medium">
                    {data.recentTransactions?.length || 0} transactions
                  </span>
                </div>

                {data.recentTransactions?.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No payment transactions recorded.</p>
                ) : (
                  <div className="divide-y divide-border/40 text-xs">
                    {data.recentTransactions?.map((tx: any) => (
                      <div key={tx._id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium text-foreground block truncate max-w-[260px]">
                            {tx.providerTransactionId}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {new Date(tx.createdAt).toLocaleDateString()} • via <strong className="uppercase">{tx.billingProvider}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-foreground tabular-nums text-sm block">
                            ${(tx.amount || 0).toFixed(2)} <span className="font-sans text-xs font-normal text-muted-foreground">{tx.currency}</span>
                          </span>
                          <span
                            className={cn(
                              'text-[10px] uppercase font-semibold tabular-nums',
                              tx.status === 'succeeded' ? 'text-primary' : 'text-rose-400',
                            )}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
