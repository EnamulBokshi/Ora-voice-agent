'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import {
  fetchAdminPlans,
  updateAdminPlan,
  createAdminPlan,
  updateMerchantCustomLimits,
} from '@/services/admin-service';
import {
  CreditCard,
  CheckCircle2,
  Users,
  Mic,
  FileText,
  Globe,
  Sliders,
  Sparkles,
  Edit2,
  X,
  Check,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPlansView() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Scale Custom Limits Form State
  const [customBizId, setCustomBizId] = useState('');
  const [customVoiceMins, setCustomVoiceMins] = useState(15000);
  const [customDocLimit, setCustomDocLimit] = useState(300);
  const [customSiteLimit, setCustomSiteLimit] = useState(15);
  const [savingCustomLimits, setSavingCustomLimits] = useState(false);
  const [customSuccessMessage, setCustomSuccessMessage] = useState<string | null>(null);
  const [customErrorMessage, setCustomErrorMessage] = useState<string | null>(null);

  const loadPlans = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAdminPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('Failed to load admin plans:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const stats = useMemo(() => {
    const totalSubs = plans.reduce((acc, p) => acc + (p.activeSubscribers || 0), 0);
    const totalMins = plans.reduce((acc, p) => acc + (p.limits?.voiceMinutes || p.limits?.conversationMinutes || 0), 0);
    return {
      activePlans: plans.filter((p) => p.isActive).length,
      totalSubscribers: totalSubs,
      totalMinsProvisioned: totalMins,
    };
  }, [plans]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setSavingPlanId(editingPlan.planId);
    try {
      await updateAdminPlan(editingPlan.planId, {
        name: editingPlan.name,
        priceUsdCents: Number(editingPlan.priceUsdCents),
        priceBdtPaisa: Number(editingPlan.priceBdtPaisa),
        trialDays: Number(editingPlan.trialDays),
        isActive: Boolean(editingPlan.isActive),
        limits: {
          voiceMinutes: Number(editingPlan.limits?.voiceMinutes || 0),
          documentLimit: Number(editingPlan.limits?.documentLimit || 5),
          websiteLimit: Number(editingPlan.limits?.websiteLimit || 1),
        },
      });
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to update plan.');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleApplyCustomLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBizId.trim()) {
      setCustomErrorMessage('Please enter a valid Business ID.');
      return;
    }

    setSavingCustomLimits(true);
    setCustomSuccessMessage(null);
    setCustomErrorMessage(null);

    try {
      await updateMerchantCustomLimits(customBizId.trim(), {
        voiceMinutes: Number(customVoiceMins),
        documentLimit: Number(customDocLimit),
        websiteLimit: Number(customSiteLimit),
      });
      setCustomSuccessMessage(
        `Successfully provisioned custom Scale quotas for Business ${customBizId.trim()}! Limits active immediately across gateways.`,
      );
      setCustomBizId('');
    } catch (err: any) {
      setCustomErrorMessage(err.message || 'Failed to apply custom limits.');
    } finally {
      setSavingCustomLimits(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background text-foreground">
      <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <AdminHeader
          title="Plans & Universal Quotas"
          description="Configure platform subscription tiers, monthly voice AI minutes, document ingestion limits, and Scale merchant custom limits."
          onRefresh={() => loadPlans(true)}
          isRefreshing={refreshing}
        />

        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatCard
            title="Active Tiers"
            value={stats.activePlans}
            subtitle={`${plans.length} total tiers configured`}
            icon={<CreditCard size={18} />}
          />
          <PlatformStatCard
            title="Active Subscribers"
            value={stats.totalSubscribers}
            subtitle="Across Stripe, bKash & Shopify"
            icon={<Users size={18} />}
          />
          <PlatformStatCard
            title="Voice Quota Catalog"
            value={`${stats.totalMinsProvisioned.toLocaleString()} min`}
            subtitle="Cumulative tier capacities"
            icon={<Mic size={18} />}
          />
          <PlatformStatCard
            title="Anti-Abuse Policy"
            value="Strict Host"
            subtitle="14-day trial per unique domain"
            icon={<ShieldCheck size={18} />}
          />
        </div>

        {/* Available Plans Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold font-serif text-foreground">
              Configured Subscription Tiers
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              Stripe USD ($) & bKash BDT (৳) Native
            </span>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border bg-surface-container p-12 flex items-center justify-center gap-3 text-muted-foreground text-sm">
              <Loader2 className="animate-spin text-primary" size={18} />
              <span>Loading subscription tiers...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const voiceMins = plan.limits?.voiceMinutes ?? plan.limits?.conversationMinutes ?? 0;
                const docLimit = plan.limits?.documentLimit ?? 5;
                const siteLimit = plan.limits?.websiteLimit ?? plan.limits?.connectedStores ?? 1;

                return (
                  <div
                    key={plan.planId}
                    className="rounded-xl border border-border bg-surface-container p-5 flex flex-col justify-between hover:border-border/80 transition-colors relative"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-high text-muted-foreground font-semibold">
                          {plan.planId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {plan.isActive ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-serif font-bold text-foreground mb-1">
                        {plan.name}
                      </h3>

                      {/* Pricing Dual Displays */}
                      <div className="space-y-1 mb-4 pb-3 border-b border-border/50">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-mono font-bold text-foreground">
                            ${Math.round(plan.priceUsdCents / 100)}
                          </span>
                          <span className="text-xs text-muted-foreground">USD / mo</span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          ৳{Math.round(plan.priceBdtPaisa / 100).toLocaleString()} BDT / mo
                        </div>
                        {plan.trialDays ? (
                          <div className="text-[11px] font-mono text-primary pt-0.5">
                            {plan.trialDays}-day anti-abuse free trial
                          </div>
                        ) : null}
                      </div>

                      {/* Quota Metrics */}
                      <div className="space-y-2 text-xs mb-5">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mic size={13} className="text-primary" />
                            Voice Minutes:
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            {voiceMins.toLocaleString()} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <FileText size={13} className="text-primary" />
                            Knowledge Docs:
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            {docLimit.toLocaleString()} docs
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Globe size={13} className="text-primary" />
                            Website Domains:
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            {siteLimit} site{siteLimit > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground pt-1">
                          <span className="flex items-center gap-1.5">
                            <Users size={13} className="text-muted-foreground" />
                            Subscribers:
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            {plan.activeSubscribers || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="w-full h-8 rounded-lg text-xs font-medium border border-border bg-surface-high hover:bg-surface-bright text-foreground transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit Tier Configuration</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scale Custom Limits Configuration Tool */}
        <div className="rounded-2xl border border-border bg-surface-container p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-primary" />
                <h3 className="text-base font-semibold font-serif text-foreground">
                  Scale Plan Custom Quota Provisioning
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                High-volume merchants on the Scale tier can receive custom voice minutes, knowledge document ingestion allowances, and domain caps. Overrides are immediately enforced by the entitlement engine and gateway.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-high border border-border text-xs font-mono text-muted-foreground">
              <Sparkles size={13} className="text-primary" />
              <span>Real-Time Override</span>
            </div>
          </div>

          {customSuccessMessage && (
            <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 text-foreground text-xs flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              <span>{customSuccessMessage}</span>
            </div>
          )}

          {customErrorMessage && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
              <span>{customErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleApplyCustomLimits} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Business ID / Tenant
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 64df... or biz_id"
                  value={customBizId}
                  onChange={(e) => setCustomBizId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Custom Monthly Voice Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={customVoiceMins}
                  onChange={(e) => setCustomVoiceMins(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Custom Knowledge Documents Limit
                </label>
                <input
                  type="number"
                  min="5"
                  step="25"
                  value={customDocLimit}
                  onChange={(e) => setCustomDocLimit(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Custom Verified Websites Limit
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customSiteLimit}
                  onChange={(e) => setCustomSiteLimit(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingCustomLimits}
                className="h-9 px-5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingCustomLimits ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Applying Overrides...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Apply Custom Limits to Merchant</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Edit Tier Modal */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <div className="rounded-2xl border border-border bg-surface-container p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <h3 className="text-base font-serif font-bold text-foreground">
                  Edit Plan: {editingPlan.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Price (USD Cents)</label>
                    <input
                      type="number"
                      value={editingPlan.priceUsdCents}
                      onChange={(e) => setEditingPlan({ ...editingPlan, priceUsdCents: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      = ${(editingPlan.priceUsdCents / 100).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Price (BDT Paisa)</label>
                    <input
                      type="number"
                      value={editingPlan.priceBdtPaisa}
                      onChange={(e) => setEditingPlan({ ...editingPlan, priceBdtPaisa: e.target.value })}
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      = ৳{(editingPlan.priceBdtPaisa / 100).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Voice Minutes</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.voiceMinutes || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, voiceMinutes: Number(e.target.value) },
                        })
                      }
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Doc Limit</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.documentLimit || 5}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, documentLimit: Number(e.target.value) },
                        })
                      }
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Websites</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.websiteLimit || 1}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          limits: { ...editingPlan.limits, websiteLimit: Number(e.target.value) },
                        })
                      }
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={editingPlan.trialDays || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: Number(e.target.value) })}
                      className="w-full h-9 rounded-lg border border-border bg-surface-low px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="plan-active-check"
                      checked={editingPlan.isActive}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="plan-active-check" className="text-xs font-medium text-foreground cursor-pointer">
                      Plan is Active & Listed
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="h-9 px-4 rounded-lg text-xs font-medium border border-border bg-surface-high hover:bg-surface-bright text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPlanId === editingPlan.planId}
                    className="h-9 px-5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingPlanId === editingPlan.planId ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>Save Tier Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
