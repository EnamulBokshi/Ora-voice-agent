'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Check,
  ShoppingBag,
  DollarSign,
  Users,
  Store,
  Clock,
  Mic,
  AlertTriangle,
  Loader2,
  Search,
} from 'lucide-react';
import { AdminPlanItem } from '@/types/admin-billing';
import { Button } from '@/components/ui/button';
import { PlanModal } from './plan-modal';
import { updateAdminPlan, deleteAdminPlan } from '@/services/admin-billing-service';
import { cn } from '@/lib/utils';

interface PlansTabProps {
  plans: AdminPlanItem[];
  loading: boolean;
  onRefresh: () => void;
  onNotification: (type: 'success' | 'error', text: string) => void;
}

export function PlansTab({ plans, loading, onRefresh, onNotification }: PlansTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<AdminPlanItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.planId.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const handleToggleActive = async (plan: AdminPlanItem) => {
    setTogglingPlanId(plan._id);
    try {
      const nextActive = !plan.isActive;
      await updateAdminPlan(plan._id, { isActive: nextActive });
      onNotification(
        'success',
        `Plan "${plan.name}" is now ${nextActive ? 'active' : 'archived'}.`,
      );
      onRefresh();
    } catch (err: any) {
      onNotification('error', err?.message || 'Failed to update plan status.');
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await deleteAdminPlan(planToDelete._id);
      onNotification('success', res.message || `Plan "${planToDelete.name}" handled successfully.`);
      setPlanToDelete(null);
      onRefresh();
    } catch (err: any) {
      onNotification('error', err?.message || 'Failed to delete plan.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Search, Counter & New Plan Trigger ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container border border-border p-3.5 rounded-2xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground tabular-nums">
            <strong className="text-foreground font-semibold">{filteredPlans.length}</strong> {filteredPlans.length === 1 ? 'plan' : 'plans'}
          </span>

          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-xs"
          >
            <Plus size={14} className="mr-1.5" />
            <span>New Plan</span>
          </Button>
        </div>
      </div>

      {/* ── Pricing Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-96 rounded-2xl border border-border bg-surface-container/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border bg-surface-container/30">
          <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No subscription plans found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? `No plan matching "${searchQuery}". Try a different search query.`
              : 'Create your first subscription tier to start accepting merchant payments.'}
          </p>
          {!searchQuery && (
            <Button
              size="sm"
              onClick={() => {
                setEditingPlan(null);
                setModalOpen(true);
              }}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            >
              <Plus size={14} className="mr-1" />
              Create Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const usd = (plan.priceUsdCents / 100).toFixed(0);
            const bdt = (plan.priceBdtPaisa / 100).toLocaleString();
            const isToggling = togglingPlanId === plan._id;

            return (
              <div
                key={plan._id}
                className={cn(
                  'relative flex flex-col justify-between rounded-2xl border bg-surface-container transition-all duration-200 overflow-hidden group',
                  plan.badge
                    ? 'border-primary/40 shadow-sm shadow-primary/5 hover:border-primary/70'
                    : 'border-border hover:border-border/80',
                  !plan.isActive && 'opacity-70 bg-surface-container/60',
                )}
              >
                {/* Accent Top Bar */}
                <div
                  className={cn(
                    'h-1.5 w-full',
                    plan.badge
                      ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/40'
                      : plan.isActive
                        ? 'bg-surface-bright'
                        : 'bg-muted-foreground/20',
                  )}
                />

                <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
                          {plan.name}
                        </h3>
                        {plan.badge && (
                          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {plan.badge}
                          </span>
                        )}
                      </div>

                      {/* Status Pill */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
                          plan.isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-muted text-muted-foreground border border-border',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            plan.isActive ? 'bg-primary' : 'bg-muted-foreground',
                          )}
                        />
                        {plan.isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                      <span className="font-mono bg-surface-high px-1.5 py-0.5 rounded border border-border">
                        slug: {plan.planId}
                      </span>
                      {plan.isCustom && (
                        <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                          Custom
                        </span>
                      )}
                    </div>

                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                        {plan.description}
                      </p>
                    )}

                    {/* Dual Pricing Display */}
                    <div className="p-3 rounded-xl bg-surface-high border border-border/80 space-y-1.5 mb-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">USD:</span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                            ${usd}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1 font-normal">/mo</span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                        <span className="text-xs text-muted-foreground">bKash:</span>
                        <div className="text-right">
                          <span className="text-base font-semibold text-primary tabular-nums tracking-tight">
                            ৳{bdt}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-1 font-normal">/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Quota Highlights */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-lowest border border-border/60 text-[11px] mb-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mic size={13} className="text-muted-foreground shrink-0" />
                        <span>
                          <strong className="text-foreground tabular-nums font-semibold">
                            {plan.limits?.conversationMinutes?.toLocaleString() ?? 0}
                          </strong>{' '}
                          voice mins
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ShoppingBag size={13} className="text-muted-foreground shrink-0" />
                        <span>
                          <strong className="text-foreground tabular-nums font-semibold">
                            {plan.limits?.ordersPerMonth?.toLocaleString() ?? 0}
                          </strong>{' '}
                          orders/mo
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Store size={13} className="text-muted-foreground shrink-0" />
                        <span>
                          <strong className="text-foreground tabular-nums font-semibold">
                            {plan.limits?.connectedStores ?? 1}
                          </strong>{' '}
                          stores
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users size={13} className="text-muted-foreground shrink-0" />
                        <span>
                          <strong className="text-foreground tabular-nums font-semibold">
                            {plan.limits?.seats ?? 1}
                          </strong>{' '}
                          seats
                        </span>
                      </div>
                    </div>

                    {/* Feature Highlights */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Included Features
                      </span>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {(plan.features || []).slice(0, 4).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check size={13} className="text-primary shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))}
                        {(plan.features?.length || 0) > 4 && (
                          <li className="text-[11px] text-primary/80 pl-5">
                            + {plan.features.length - 4} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPlan(plan);
                          setModalOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs text-foreground hover:bg-surface-high"
                      >
                        <Edit size={12} className="mr-1" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleToggleActive(plan)}
                        className={cn(
                          'h-8 px-2 text-xs',
                          plan.isActive
                            ? 'text-muted-foreground hover:text-foreground'
                            : 'text-primary hover:text-primary/90',
                        )}
                        title={plan.isActive ? 'Archive plan' : 'Activate plan'}
                      >
                        {isToggling ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : plan.isActive ? (
                          'Archive'
                        ) : (
                          'Activate'
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanToDelete(plan)}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete plan"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Plan Create / Edit Modal ── */}
      <PlanModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        onSaved={() => {
          onNotification(
            'success',
            editingPlan ? 'Plan changes saved.' : 'New subscription plan created.',
          );
          onRefresh();
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-destructive/40 bg-surface-lowest p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Delete Plan &ldquo;{planToDelete.name}&rdquo;?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slug: <span className="font-mono text-foreground">{planToDelete.planId}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              If active merchant subscriptions are attached to this plan, the engine will safely{' '}
              <strong className="text-foreground">archive</strong> it to protect billing renewals.
              Otherwise, it will be deleted permanently.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlanToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 size={13} className="animate-spin mr-1" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
