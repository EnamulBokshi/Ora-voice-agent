'use client';

import React from 'react';
import {
  Search,
  Filter,
  CreditCard,
  Tag,
  ArrowUpDown,
  ExternalLink,
  Store,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import { AdminSubscriptionItem, AdminPlanItem } from '@/types/admin-billing';
import { cn } from '@/lib/utils';

interface SubscriptionsTabProps {
  subscriptions: AdminSubscriptionItem[];
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
  providerFilter: string;
  onProviderFilterChange: (p: string) => void;
  planFilter: string;
  onPlanFilterChange: (p: string) => void;
  onPageChange: (page: number) => void;
  onInspect: (subscriptionId: string) => void;
  availablePlans: AdminPlanItem[];
  loading: boolean;
}

const statusTabs = [
  { id: 'all', label: 'All Subscriptions' },
  { id: 'active', label: 'Active' },
  { id: 'trialing', label: 'Trialing' },
  { id: 'past_due', label: 'Past Due' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'canceled', label: 'Canceled' },
];

export function SubscriptionsTab({
  subscriptions,
  pagination,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  providerFilter,
  onProviderFilterChange,
  planFilter,
  onPlanFilterChange,
  onPageChange,
  onInspect,
  availablePlans,
  loading,
}: SubscriptionsTabProps) {
  return (
    <div className="space-y-4">
      {/* ── Search & Filter Controls Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container border border-border p-3.5 rounded-2xl">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          {/* Provider Select */}
          <select
            value={providerFilter}
            onChange={(e) => onProviderFilterChange(e.target.value)}
            className="text-xs rounded-xl border border-border bg-surface-high px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All providers</option>
            <option value="stripe">Stripe</option>
            <option value="bkash">bKash</option>
            <option value="shopify">Shopify</option>
          </select>

          {/* Plan Select */}
          <select
            value={planFilter}
            onChange={(e) => onPlanFilterChange(e.target.value)}
            className="text-xs rounded-xl border border-border bg-surface-high px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All plans</option>
            {availablePlans.map((p) => (
              <option key={p.planId} value={p.planId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Status Pills Segment ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onStatusFilterChange(tab.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap border',
              statusFilter === tab.id
                ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                : 'bg-surface-container border-border text-muted-foreground hover:text-foreground hover:bg-surface-high',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-2xl border border-border bg-surface-container overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-high/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Renewal</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                    <p>Loading subscriptions...</p>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No subscriptions match your query.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try clearing filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isPastDue = sub.status === 'past_due';
                  const isCanceled = sub.status === 'canceled';
                  const isTrial = sub.status === 'trialing';
                  const isActive = sub.status === 'active';

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onInspect(sub.id)}
                      className="hover:bg-surface-high/50 cursor-pointer transition-colors group"
                    >
                      {/* Store */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-surface-high border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {sub.business?.name ? sub.business.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block group-hover:text-primary transition-colors">
                              {sub.business?.name || 'Unknown Merchant'}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {sub.business?.domain || sub.businessId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full font-medium text-[11px] capitalize border',
                              sub.planId === 'scale' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                              sub.planId === 'growth' && 'bg-primary/10 text-primary border-primary/20',
                              sub.planId === 'free' && 'bg-muted text-muted-foreground border-border',
                              !['scale', 'growth', 'free'].includes(sub.planId) &&
                                'bg-blue-500/10 text-blue-400 border-blue-500/20',
                            )}
                          >
                            {sub.plan?.name || sub.planId}
                          </span>
                          {sub.appliedCoupon && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-mono"
                              title={`Coupon: ${sub.appliedCoupon.code}`}
                            >
                              <Tag className="h-2.5 w-2.5 inline mr-0.5" />
                              {sub.appliedCoupon.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4">
                        <span className="text-xs uppercase font-medium text-foreground bg-surface-high px-2 py-0.5 rounded-md border border-border tracking-wider">
                          {sub.billingProvider}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              isActive && 'bg-primary animate-pulse',
                              isTrial && 'bg-blue-400',
                              isPastDue && 'bg-amber-400',
                              sub.status === 'suspended' && 'bg-rose-400',
                              isCanceled && 'bg-muted-foreground',
                            )}
                          />
                          <span className="capitalize font-medium text-foreground">
                            {sub.status.replace('_', ' ')}
                          </span>
                          {sub.cancelAtPeriodEnd && (
                            <span className="text-[10px] text-amber-400 font-medium">(cancels)</span>
                          )}
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums font-medium">
                            <span>{sub.usage?.conversationMinutes || 0}m</span>
                            <span>{sub.planId === 'scale' ? 'unlimited' : 'limit'}</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-high rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(((sub.usage?.conversationMinutes || 0) / 2000) * 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Next Renewal */}
                      <td className="py-3 px-4 tabular-nums text-[11px] text-muted-foreground">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspect(sub.id);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-border bg-surface-high hover:bg-surface-bright text-foreground text-xs font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          Manage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {pagination.total > 0 && (
          <div className="p-4 border-t border-border/50">
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              itemName="subscriptions"
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
