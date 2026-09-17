'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Tag,
  Store,
  Calendar,
  Percent,
  DollarSign,
  Loader2,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AdminCouponItem, AdminCouponRedemptionItem } from '@/types/admin-billing';
import { fetchAdminCouponRedemptions } from '@/services/admin-billing-service';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';

interface CouponRedemptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: AdminCouponItem | null;
}

export function CouponRedemptionsDrawer({
  isOpen,
  onClose,
  coupon,
}: CouponRedemptionsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [redemptions, setRedemptions] = useState<AdminCouponRedemptionItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadRedemptions = useCallback(async () => {
    if (!coupon) return;
    setLoading(true);
    try {
      const res = await fetchAdminCouponRedemptions(coupon._id, { page, limit });
      setRedemptions(res.items || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load coupon redemptions:', err);
    } finally {
      setLoading(false);
    }
  }, [coupon, page, limit]);

  useEffect(() => {
    if (isOpen && coupon) {
      setPage(1);
      loadRedemptions();
    }
  }, [isOpen, coupon, loadRedemptions]);

  if (!isOpen || !coupon) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-2xl bg-surface-lowest border-l border-border h-full shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Tag size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground font-heading">
                  Redemptions
                </h2>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                  {coupon.code}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {coupon.description || 'Store redemption history.'}
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

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-surface-container/60 border-b border-border shrink-0">
          <div className="p-2.5 rounded-xl bg-surface-high border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Discount
            </span>
            <span className="text-base font-bold text-primary tabular-nums tracking-tight mt-0.5 block">
              {coupon.discountType === 'percentage'
                ? `${coupon.discountAmount}% OFF`
                : `$${(coupon.discountAmount / 100).toFixed(2)} OFF`}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-high border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Redemptions
            </span>
            <span className="text-base font-bold text-foreground tabular-nums tracking-tight mt-0.5 block">
              {coupon.redemptionsCount}
              {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ' (Unlimited)'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-high border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Duration
            </span>
            <span className="text-sm font-medium text-foreground mt-0.5 capitalize block">
              {coupon.duration}
            </span>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs">Loading redemption records...</span>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border bg-surface-container/30">
              <Tag className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No redemptions</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                This coupon has not been redeemed yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((redemption) => {
                const currencySymbol = redemption.currency === 'BDT' ? '৳' : '$';
                const originalFormatted = (redemption.originalAmount / 100).toFixed(2);
                const discountFormatted = (redemption.discountAmount / 100).toFixed(2);
                const finalFormatted = (redemption.finalAmount / 100).toFixed(2);

                return (
                  <div
                    key={redemption.id}
                    className="p-4 rounded-xl border border-border bg-surface-container space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high border border-border text-primary shrink-0">
                          <Store size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            {redemption.business?.name || 'Unknown Merchant Store'}
                          </h4>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {redemption.business?.domain || redemption.business?.id || 'No domain'}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize bg-surface-high border border-border text-muted-foreground">
                        Plan: {redemption.planId}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-lowest border border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">List Price</span>
                        <span className="font-medium text-muted-foreground tabular-nums">
                          {currencySymbol}
                          {originalFormatted}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Discount
                        </span>
                        <span className="font-semibold text-primary tabular-nums">
                          -{currencySymbol}
                          {discountFormatted}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Final Billed
                        </span>
                        <span className="font-bold text-foreground tabular-nums text-sm">
                          {currencySymbol}
                          {finalFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {redemption.redeemedBy?.email || 'Store Owner'}
                      </span>
                      <span className="flex items-center gap-1 tabular-nums">
                        <Calendar size={12} />
                        {new Date(redemption.redeemedAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer with Pagination */}
        <div className="px-6 py-3 border-t border-border bg-surface-container shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Total Records: <strong className="text-foreground tabular-nums font-semibold">{total}</strong>
          </div>
          {totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              itemName="redemptions"
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
