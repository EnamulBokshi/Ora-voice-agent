'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import {
  Search,
  CheckCircle2,
  Loader2,
  Key,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  Globe,
  X,
  Eye,
  PauseCircle,
  PlayCircle,
  Ban,
  Radio,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { AdminBusinessItem } from '@/types/admin';
import {
  updateBusinessStatus,
  adminRevokeBusinessKeyApi,
  adminUpdateKeyStatusApi,
} from '@/services/admin-service';
import { cn } from '@/lib/utils';

interface MerchantsTableProps {
  businesses: AdminBusinessItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (q: string) => void;
  onStatusChange: (s: string) => void;
  onPageChange: (p: number) => void;
  onDataUpdated: () => void;
  loading?: boolean;
}

export function MerchantsTable({
  businesses,
  pagination,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onDataUpdated,
  loading = false,
}: MerchantsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedBusinessForKey, setSelectedBusinessForKey] =
    useState<AdminBusinessItem | null>(null);
  const [keyActionLoading, setKeyActionLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<boolean>(false);

  // Interactive Confirmation & Feedback Toast State
  const [confirmToggleBusiness, setConfirmToggleBusiness] =
    useState<AdminBusinessItem | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmToggleBusiness) return;
    const business = confirmToggleBusiness;
    const nextStatus = business.status === 'active' ? 'suspended' : 'active';
    setConfirmToggleBusiness(null);
    setUpdatingId(business.id);

    try {
      await updateBusinessStatus(business.id, nextStatus);
      showNotification(
        'success',
        nextStatus === 'suspended'
          ? `Store "${business.name}" has been suspended.`
          : `Store "${business.name}" is now active.`,
      );
      onDataUpdated();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update store status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleAdminRevokeKey = async (businessId: string) => {
    setKeyActionLoading(true);
    try {
      await adminRevokeBusinessKeyApi(businessId);
      showNotification('success', 'Publishable key revoked and invalidated successfully.');
      setShowRevokeConfirm(false);
      onDataUpdated();
      if (selectedBusinessForKey) {
        setSelectedBusinessForKey({
          ...selectedBusinessForKey,
          publishableKey: null,
          keyStatus: 'revoked',
        });
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to revoke publishable key.');
    } finally {
      setKeyActionLoading(false);
    }
  };

  const handleAdminToggleKeyStatus = async (
    businessId: string,
    currentKeyStatus?: string,
  ) => {
    const nextKeyStatus: 'active' | 'suspended' =
      currentKeyStatus === 'suspended' ? 'active' : 'suspended';
    setKeyActionLoading(true);
    try {
      await adminUpdateKeyStatusApi(businessId, nextKeyStatus);
      showNotification('success', `Key status updated to ${nextKeyStatus}.`);
      onDataUpdated();
      if (selectedBusinessForKey) {
        setSelectedBusinessForKey({
          ...selectedBusinessForKey,
          keyStatus: nextKeyStatus,
        });
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update key status.');
    } finally {
      setKeyActionLoading(false);
    }
  };

  // Filtered businesses if "flagged" filter tab is selected
  const displayedBusinesses = useMemo(() => {
    if (statusFilter === 'flagged') {
      return businesses.filter(
        (b) => b.anomalyFlags?.isMultiSite || b.anomalyFlags?.hasMismatch,
      );
    }
    return businesses;
  }, [businesses, statusFilter]);

  return (
    <>
      {/* ── Interactive Confirmation Toast Modal for Store Status ── */}
      {confirmToggleBusiness && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 rounded-2xl border border-border bg-surface-container/95 p-4 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 max-w-sm">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                confirmToggleBusiness.status === 'active'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-primary/15 text-primary border border-primary/30',
              )}
            >
              {confirmToggleBusiness.status === 'active' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
            </div>
            <div className="flex-1 pr-1">
              <h4 className="font-semibold text-foreground text-sm font-heading">
                {confirmToggleBusiness.status === 'active'
                  ? 'Suspend Merchant Store?'
                  : 'Reactivate Merchant Store?'}
              </h4>
              <p className="text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                {confirmToggleBusiness.status === 'active'
                  ? `Are you sure you want to suspend "${confirmToggleBusiness.name}"? The voice widget and integrations will be paused.`
                  : `Are you sure you want to reactivate "${confirmToggleBusiness.name}" and restore live AI storefront features?`}
              </p>
            </div>
            <button
              onClick={() => setConfirmToggleBusiness(null)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmToggleBusiness(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmToggleBusiness.status === 'active' ? 'destructive' : 'default'}
              onClick={handleConfirmToggleStatus}
            >
              {confirmToggleBusiness.status === 'active' ? 'Confirm Suspend' : 'Confirm Reactivate'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Toast Feedback Notification ── */}
      {feedback && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-medium shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200',
            feedback.type === 'success'
              ? 'border-primary/40 bg-surface-container/95 text-foreground shadow-primary/10'
              : 'border-destructive/40 bg-surface-container/95 text-foreground shadow-destructive/10',
          )}
        >
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg',
              feedback.type === 'success'
                ? 'bg-primary/15 text-primary'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-semibold text-foreground">
              {feedback.type === 'success' ? 'Success' : 'Attention'}
            </span>
            <span className="text-xs text-muted-foreground">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Master Card Container ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-container p-4 sm:p-5 shadow-xs">
        {/* Table Controls Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stores, domains, owners, or keys..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-low py-1.5 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Segmented Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-low border border-border text-xs">
            <button
              type="button"
              onClick={() => onStatusChange('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs',
                statusFilter === 'all'
                  ? 'bg-surface-high text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('active')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5',
                statusFilter === 'active'
                  ? 'bg-surface-high text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('suspended')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5',
                statusFilter === 'suspended'
                  ? 'bg-surface-high text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-400" />
              Suspended
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('flagged')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5',
                statusFilter === 'flagged'
                  ? 'bg-destructive/15 text-destructive border border-destructive/30 font-semibold'
                  : 'text-muted-foreground hover:text-destructive',
              )}
            >
              <ShieldAlert size={12} />
              Flagged
            </button>
          </div>
        </div>

        {/* ── High-Scan Executive Table (Zero Horizontal Overflow) ── */}
        <div className="rounded-xl border border-border bg-surface-lowest overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-low text-muted-foreground font-medium uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Store & Platform</th>
                <th className="px-3 py-2.5">Owner Contact</th>
                <th className="px-3 py-2.5">Key & Origin Telemetry</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Activity & Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Loading merchants directory...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Building2 className="size-8 text-muted-foreground/40 stroke-1" />
                      <p className="text-xs font-medium text-foreground">No merchant stores found</p>
                      <p className="text-[11px] text-muted-foreground">Try adjusting your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedBusinesses.map((b) => {
                  const hasKey = Boolean(b.publishableKey);
                  const isSuspended =
                    b.keyStatus === 'suspended' || b.status === 'suspended';
                  const isMultiSite = b.anomalyFlags?.isMultiSite;
                  const hasMismatch = b.anomalyFlags?.hasMismatch;
                  const originCount = b.detectedOrigins?.length || 0;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-surface-container/60 transition-colors group"
                    >
                      {/* 1. Store Identity & Platform (Combined) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Store Avatar */}
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-high border border-border text-xs font-bold text-foreground">
                            {b.name ? b.name.charAt(0).toUpperCase() : 'S'}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/users/${b.id}`}
                                className="font-semibold text-xs text-foreground hover:text-primary transition-colors truncate"
                                title={b.name}
                              >
                                {b.name}
                              </Link>
                              {b.connectedPlatform && b.connectedPlatform !== 'none' && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium uppercase tracking-wider bg-surface-high border border-border text-muted-foreground">
                                  {b.connectedPlatform}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Globe size={10} className="shrink-0 opacity-60" />
                              {b.domain ? (
                                <span className="truncate">{b.domain}</span>
                              ) : (
                                <span className="italic text-[10px] text-muted-foreground/60">No domain set</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Owner Contact */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="text-foreground text-xs font-medium truncate">
                            {b.ownerName || 'Store Owner'}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate font-mono">
                            {b.ownerEmail}
                          </span>
                        </div>
                      </td>

                      {/* 3. Publishable Key & Origin Telemetry (Clean Pill) */}
                      <td className="px-3 py-3">
                        {hasKey ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Key string chip with copy button */}
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-low border border-border text-[11px] font-mono">
                              <span className="text-muted-foreground font-semibold">
                                {b.publishableKey?.slice(0, 10)}...{b.publishableKey?.slice(-4)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(b.publishableKey!)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                                title="Copy Key"
                              >
                                {copiedKey ? (
                                  <Check size={11} className="text-primary" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>

                            {/* Security Telemetry Badge */}
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Suspended
                              </span>
                            ) : isMultiSite ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
                                <ShieldAlert size={10} />
                                Multi-Site ({originCount})
                              </span>
                            ) : hasMismatch ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <AlertTriangle size={10} />
                                Mismatch
                              </span>
                            ) : originCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                <ShieldCheck size={10} />
                                Verified ({originCount})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-high border border-border text-muted-foreground">
                                No Traffic
                              </span>
                            )}

                            {/* Quick Inspect Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessForKey(b)}
                              className="text-[11px] font-medium text-primary hover:underline transition-colors"
                            >
                              Inspect
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-[11px] italic">No active key</span>
                            {b.keyRevokedAt && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                Revoked
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Store Status */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                            b.status === 'active'
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'bg-destructive/10 text-destructive border border-destructive/25',
                          )}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              b.status === 'active' ? 'bg-primary animate-pulse' : 'bg-destructive',
                            )}
                          />
                          <span className="capitalize">{b.status}</span>
                        </span>
                      </td>

                      {/* 5. Activity & Created (Paired) */}
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-foreground text-xs flex items-center gap-1 tabular-nums">
                            <MessageSquare size={11} className="text-muted-foreground" />
                            {b.conversationsCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {b.createdAt
                              ? new Date(b.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Action Buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect Store Details */}
                          <Link
                            href={`/admin/users/${b.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                            title="Inspect Store Details"
                          >
                            <Eye size={14} />
                          </Link>

                          {/* Inspect Key Telemetry */}
                          {hasKey && (
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessForKey(b)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-surface-high transition-colors"
                              title="Inspect Key & Live Origins"
                            >
                              <Key size={14} />
                            </button>
                          )}

                          {/* Suspend / Activate Store Toggle */}
                          <button
                            type="button"
                            onClick={() => setConfirmToggleBusiness(b)}
                            disabled={updatingId === b.id}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors disabled:opacity-50',
                              b.status === 'active'
                                ? 'text-muted-foreground hover:text-amber-400 hover:bg-surface-high'
                                : 'text-muted-foreground hover:text-primary hover:bg-surface-high',
                            )}
                            title={b.status === 'active' ? 'Suspend Store' : 'Activate Store'}
                          >
                            {updatingId === b.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : b.status === 'active' ? (
                              <PauseCircle size={14} />
                            ) : (
                              <PlayCircle size={14} />
                            )}
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

        {/* Modular Pagination */}
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          itemName="merchants"
          onPageChange={onPageChange}
        />
      </div>

      {/* ── High-Craft Key Intelligence & Origin Security Modal ── */}
      {selectedBusinessForKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            if (!keyActionLoading) {
              setSelectedBusinessForKey(null);
              setShowRevokeConfirm(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface-container p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Key size={17} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-heading font-bold text-foreground tracking-tight">
                    Key Intelligence & Origin Security
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>
                      Store: <strong className="text-foreground">{selectedBusinessForKey.name}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Domain:{' '}
                      <span className="text-foreground font-medium">
                        {selectedBusinessForKey.domain || 'Unregistered (N/A)'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedBusinessForKey(null);
                  setShowRevokeConfirm(false);
                }}
                disabled={keyActionLoading}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-surface-high transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Key Information Box */}
            <div className="p-4 rounded-xl bg-surface-low border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Publishable Storefront Key
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    selectedBusinessForKey.publishableKey &&
                      selectedBusinessForKey.keyStatus !== 'suspended'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : selectedBusinessForKey.keyStatus === 'suspended'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-destructive/15 text-destructive border border-destructive/30',
                  )}
                >
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      selectedBusinessForKey.publishableKey &&
                        selectedBusinessForKey.keyStatus !== 'suspended'
                        ? 'bg-primary animate-pulse'
                        : selectedBusinessForKey.keyStatus === 'suspended'
                          ? 'bg-amber-400'
                          : 'bg-destructive',
                    )}
                  />
                  {selectedBusinessForKey.publishableKey
                    ? selectedBusinessForKey.keyStatus?.toUpperCase() || 'ACTIVE'
                    : 'REVOKED'}
                </span>
              </div>

              {selectedBusinessForKey.publishableKey ? (
                <div className="flex items-center justify-between gap-3 bg-surface-container border border-border rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-primary font-medium select-all break-all flex-1">
                    {selectedBusinessForKey.publishableKey}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleCopyKey(selectedBusinessForKey.publishableKey!)}
                    title="Copy Key to Clipboard"
                  >
                    {copiedKey ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-1">
                  This store has no active publishable key.
                </p>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Public key used by the storefront widget to establish secure WebSocket sessions.
                Authorized origins are automatically monitored below.
              </p>
            </div>

            {/* Detected Origins & Anomaly Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" />
                  Live Connected Storefronts & Origins
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {selectedBusinessForKey.detectedOrigins?.length || 0} active
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 rounded-xl border border-border bg-surface-low p-2.5">
                {!selectedBusinessForKey.detectedOrigins ||
                selectedBusinessForKey.detectedOrigins.length === 0 ? (
                  /* High-craft Empty State */
                  <div className="py-6 px-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="size-10 rounded-full bg-surface-container border border-border flex items-center justify-center text-muted-foreground">
                      <Radio size={18} className="text-muted-foreground/60" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      No Web Origins Connected Yet
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                      When a customer or merchant loads the widget on any website using this key,
                      the connecting domain and live telemetry will automatically appear here.
                    </p>
                  </div>
                ) : (
                  selectedBusinessForKey.detectedOrigins.map((orig, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-colors',
                        orig.isMismatch
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-surface-container border-border',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-foreground font-medium truncate">
                          <Globe
                            size={13}
                            className={orig.isMismatch ? 'text-amber-400' : 'text-primary'}
                          />
                          <span className="truncate">{orig.origin}</span>
                        </div>
                        {orig.isMismatch ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Domain Mismatch
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-primary/10 text-primary border border-primary/20 shrink-0">
                            Verified Domain
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 tabular-nums">
                        <span>
                          Sessions: <strong className="text-foreground">{orig.sessionCount}</strong>
                        </span>
                        <span>
                          Last active:{' '}
                          {new Date(orig.lastSeen).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({new Date(orig.lastSeen).toLocaleDateString()})
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Revoke Confirmation Prompt */}
            {showRevokeConfirm && (
              <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 space-y-2.5 animate-in fade-in duration-150">
                <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Permanently revoke and destroy key?
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This will immediately disconnect and reject all live voice sessions and storefront
                  widgets using this key across all websites.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRevokeConfirm(false)}
                    disabled={keyActionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAdminRevokeKey(selectedBusinessForKey.id)}
                    disabled={keyActionLoading}
                  >
                    {keyActionLoading && <Loader2 size={12} className="animate-spin mr-1" />}
                    Confirm Revocation
                  </Button>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            {!showRevokeConfirm && (
              <div className="flex items-center justify-between pt-3 border-t border-border/80">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBusinessForKey(null)}
                  disabled={keyActionLoading}
                >
                  Close
                </Button>

                {selectedBusinessForKey.publishableKey && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAdminToggleKeyStatus(
                          selectedBusinessForKey.id,
                          selectedBusinessForKey.keyStatus,
                        )
                      }
                      disabled={keyActionLoading}
                      className={cn(
                        selectedBusinessForKey.keyStatus === 'suspended'
                          ? 'border-primary/40 text-primary hover:bg-primary/10'
                          : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30',
                      )}
                    >
                      {keyActionLoading ? (
                        <Loader2 size={13} className="animate-spin mr-1" />
                      ) : selectedBusinessForKey.keyStatus === 'suspended' ? (
                        <PlayCircle size={13} className="mr-1" />
                      ) : (
                        <PauseCircle size={13} className="mr-1" />
                      )}
                      <span>
                        {selectedBusinessForKey.keyStatus === 'suspended'
                          ? 'Reactivate Key'
                          : 'Suspend Key'}
                      </span>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={keyActionLoading}
                    >
                      <Trash2 size={13} className="mr-1" />
                      <span>Revoke Key</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
