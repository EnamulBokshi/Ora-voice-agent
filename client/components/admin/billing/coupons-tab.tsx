'use client';

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Copy,
  Check,
  Percent,
  DollarSign,
  Calendar,
  Layers,
  Edit,
  Trash2,
  Eye,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  History,
} from 'lucide-react';
import { AdminCouponItem, AdminPlanItem } from '@/types/admin-billing';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import { CouponModal } from './coupon-modal';
import { CouponRedemptionsDrawer } from './coupon-redemptions-drawer';
import { updateAdminCoupon, deleteAdminCoupon } from '@/services/admin-billing-service';
import { cn } from '@/lib/utils';

interface CouponsTabProps {
  coupons: AdminCouponItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  onPageChange: (p: number) => void;
  availablePlans: AdminPlanItem[];
  loading: boolean;
  onRefresh: () => void;
  onNotification: (type: 'success' | 'error', text: string) => void;
}

export function CouponsTab({
  coupons,
  pagination,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  onPageChange,
  availablePlans,
  loading,
  onRefresh,
  onNotification,
}: CouponsTabProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCouponItem | null>(null);
  const [drawerCoupon, setDrawerCoupon] = useState<AdminCouponItem | null>(null);
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<AdminCouponItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (coupon: AdminCouponItem) => {
    setTogglingCouponId(coupon._id);
    try {
      const nextActive = !coupon.isActive;
      await updateAdminCoupon(coupon._id, { isActive: nextActive });
      onNotification(
        'success',
        `Coupon "${coupon.code}" is now ${nextActive ? 'active' : 'disabled'}.`,
      );
      onRefresh();
    } catch (err: any) {
      onNotification('error', err?.message || 'Failed to toggle coupon status.');
    } finally {
      setTogglingCouponId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await deleteAdminCoupon(couponToDelete._id);
      onNotification(
        'success',
        res.message || `Coupon "${couponToDelete.code}" deleted successfully.`,
      );
      setCouponToDelete(null);
      onRefresh();
    } catch (err: any) {
      onNotification('error', err?.message || 'Failed to delete coupon.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container border border-border p-3.5 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Dropdowns & Create Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="text-xs rounded-xl border border-border bg-surface-high px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="text-xs rounded-xl border border-border bg-surface-high px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
          </select>

          <Button
            size="sm"
            onClick={() => {
              setEditingCoupon(null);
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-xs"
          >
            <Plus size={14} className="mr-1.5" />
            <span>New Coupon</span>
          </Button>
        </div>
      </div>

      {/* ── Coupons Data Table ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-container shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-lowest/70 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Coupon</th>
                <th className="px-4 py-3.5 font-semibold">Discount</th>
                <th className="px-4 py-3.5 font-semibold">Duration</th>
                <th className="px-4 py-3.5 font-semibold">Redemptions</th>
                <th className="px-4 py-3.5 font-semibold">Plans</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
                    <span>Loading coupons...</span>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    <Tag className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No coupons</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {searchQuery
                        ? 'No coupons match your search.'
                        : 'Create your first coupon.'}
                    </p>
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isExpired = c.validUntil && new Date(c.validUntil) < new Date();
                  const isMaxedOut = c.maxRedemptions && c.redemptionsCount >= c.maxRedemptions;
                  const isToggling = togglingCouponId === c._id;

                  const redemptionPercent = c.maxRedemptions
                    ? Math.min(100, Math.round((c.redemptionsCount / c.maxRedemptions) * 100))
                    : null;

                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-surface-high/50 transition-colors group"
                    >
                      {/* Code */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(c.code)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-lowest border border-border hover:border-primary/50 text-foreground font-mono font-bold text-xs group/btn transition-colors"
                            title="Click to copy coupon code"
                          >
                            <span>{c.code}</span>
                            {copiedCode === c.code ? (
                              <Check size={12} className="text-primary" />
                            ) : (
                              <Copy
                                size={12}
                                className="text-muted-foreground group-hover/btn:text-foreground"
                              />
                            )}
                          </button>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
                            {c.description}
                          </p>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-primary tabular-nums tracking-tight">
                            {c.discountType === 'percentage'
                              ? `${c.discountAmount}%`
                              : `$${(c.discountAmount / 100).toFixed(2)}`}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            {c.discountType === 'percentage' ? 'OFF' : 'FLAT'}
                          </span>
                        </div>
                      </td>

                      {/* Duration & Currency */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="text-xs text-foreground font-medium capitalize">
                            {c.duration}
                            {c.duration === 'repeating' && c.durationInMonths
                              ? ` (${c.durationInMonths} mos)`
                              : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {c.currency === 'ALL'
                              ? 'USD & BDT'
                              : c.currency === 'USD'
                                ? 'USD only'
                                : 'BDT only'}
                          </span>
                        </div>
                      </td>

                      {/* Redemptions Progress */}
                      <td className="px-4 py-3.5 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-semibold tabular-nums">
                              {c.redemptionsCount}
                              {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {c.maxRedemptions
                                ? `${Math.round((c.redemptionsCount / c.maxRedemptions) * 100)}%`
                                : 'unlimited'}
                            </span>
                          </div>
                          {c.maxRedemptions && (
                            <div className="h-1.5 w-full rounded-full bg-surface-high overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.round((c.redemptionsCount / c.maxRedemptions) * 100))}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Applicable Plans */}
                      <td className="px-4 py-3.5">
                        {c.applicablePlans.length === 0 ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-surface-high border border-border text-muted-foreground">
                            All Tiers
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {c.applicablePlans.map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize bg-surface-high border border-border text-foreground"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                            !c.isActive
                              ? 'bg-muted text-muted-foreground border border-border'
                              : isExpired
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : isMaxedOut
                                  ? 'bg-muted-foreground/10 text-muted-foreground border border-border'
                                  : 'bg-primary/10 text-primary border border-primary/20',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              !c.isActive
                                ? 'bg-muted-foreground'
                                : isExpired
                                  ? 'bg-amber-400'
                                  : isMaxedOut
                                    ? 'bg-muted-foreground'
                                    : 'bg-primary',
                            )}
                          />
                          {!c.isActive
                            ? 'Disabled'
                            : isExpired
                              ? 'Expired'
                              : isMaxedOut
                                ? 'Exhausted'
                                : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Redemptions Drawer */}
                          <button
                            type="button"
                            onClick={() => setDrawerCoupon(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                            title="View Redemptions Audit"
                          >
                            <History size={14} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCoupon(c);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                            title="Edit Coupon"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Toggle Active / Disabled */}
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleActive(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                            title={c.isActive ? 'Disable coupon' : 'Enable coupon'}
                          >
                            {isToggling ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <span className="text-[11px] font-mono">
                                {c.isActive ? 'Off' : 'On'}
                              </span>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setCouponToDelete(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface-high transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-lowest flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Total Coupons: <strong className="text-foreground tabular-nums font-semibold">{pagination.total}</strong>
          </div>
          {pagination.totalPages > 1 && (
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              itemName="coupons"
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>

      {/* ── Modals & Drawers ── */}
      <CouponModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCoupon(null);
        }}
        coupon={editingCoupon}
        availablePlans={availablePlans}
        onSaved={() => {
          onNotification(
            'success',
            editingCoupon ? 'Coupon details updated.' : 'New coupon generated.',
          );
          onRefresh();
        }}
      />

      <CouponRedemptionsDrawer
        isOpen={!!drawerCoupon}
        onClose={() => setDrawerCoupon(null)}
        coupon={drawerCoupon}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-destructive/40 bg-surface-lowest p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Delete Coupon &ldquo;{couponToDelete.code}&rdquo;?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Redemptions: {couponToDelete.redemptionsCount}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              If this coupon has already been redeemed by merchants, it will be safely{' '}
              <strong className="text-foreground">deactivated</strong> to keep audit integrity intact.
              Otherwise it will be deleted permanently.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCouponToDelete(null)}
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
