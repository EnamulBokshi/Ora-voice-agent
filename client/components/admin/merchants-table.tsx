'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Loader2,
  Filter,
  Key,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  Globe,
  X,
  Activity,
  Eye,
  PauseCircle,
  PlayCircle,
  Ban,
  Store,
} from 'lucide-react';
import { AdminBusinessItem, DetectedOriginItem } from '@/types/admin';
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

  return (
    <>
      {/* ── Interactive Confirmation Toast Modal for Store Status ── */}
      {confirmToggleBusiness && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 rounded-2xl border border-border bg-surface-container/95 p-4 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 max-w-sm">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                confirmToggleBusiness.status === 'active'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-primary/15 text-primary',
              )}
            >
              {confirmToggleBusiness.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="flex-1 pr-1">
              <h4 className="font-bold text-foreground text-sm font-heading">
                {confirmToggleBusiness.status === 'active'
                  ? 'Suspend Merchant Store?'
                  : 'Reactivate Merchant Store?'}
              </h4>
              <p className="text-xs text-muted-foreground font-normal mt-0.5 leading-relaxed">
                {confirmToggleBusiness.status === 'active'
                  ? `Are you sure you want to suspend "${confirmToggleBusiness.name}"? Their AI voice widget and storefront integrations will be paused.`
                  : `Are you sure you want to reactivate "${confirmToggleBusiness.name}" and restore all AI sales services?`}
              </p>
            </div>
            <button
              onClick={() => setConfirmToggleBusiness(null)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setConfirmToggleBusiness(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground bg-surface-high hover:bg-surface-bright hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmToggleStatus}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-opacity shadow-xs',
                confirmToggleBusiness.status === 'active'
                  ? 'bg-amber-500 text-black hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              <span>{confirmToggleBusiness.status === 'active' ? 'Confirm Suspend' : 'Confirm Reactivate'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Toast Feedback Notification ── */}
      {feedback && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200',
            feedback.type === 'success'
              ? 'border-primary/40 bg-surface-container/95 text-foreground shadow-primary/10'
              : 'border-destructive/40 bg-surface-container/95 text-foreground shadow-destructive/10',
          )}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              feedback.type === 'success'
                ? 'bg-primary/15 text-primary'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-bold text-foreground">
              {feedback.type === 'success' ? 'Success' : 'Error'}
            </span>
            <span className="text-xs text-muted-foreground font-normal">{feedback.text}</span>
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
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stores by name, domain, owner, or key..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-high py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Filter size={13} />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary/50"
            >
              <option value="all">All Merchants</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-container">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-4 py-3">Store Tenant</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Publishable Key & Security</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3 text-right">Conversations</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading merchant directory...</span>
                    </div>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No merchants found matching your query.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => {
                  const hasKey = Boolean(b.publishableKey);
                  const isSuspended =
                    b.keyStatus === 'suspended' || b.status === 'suspended';
                  const isMultiSite = b.anomalyFlags?.isMultiSite;
                  const hasMismatch = b.anomalyFlags?.hasMismatch;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-surface-high/50 transition-colors"
                    >
                      {/* Store Tenant Identity */}
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-high border border-border text-xs font-serif font-bold text-foreground">
                            {b.name ? b.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/admin/users/${b.id}`}
                              className="font-semibold text-sm hover:text-primary transition-colors block truncate"
                              title="Inspect Store & Owner"
                            >
                              {b.name}
                            </Link>
                            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                              <Globe size={11} className="opacity-60 shrink-0" />
                              <span className="truncate">{b.domain || 'no domain registered'}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner Contact */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{b.ownerName}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {b.ownerEmail}
                          </span>
                        </div>
                      </td>

                      {/* Key & Security Column */}
                      <td className="px-4 py-3">
                        {hasKey ? (
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-primary">
                                {b.publishableKey?.slice(0, 16)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(b.publishableKey!)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                                title="Copy full key"
                              >
                                {copiedKey ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                              </button>
                            </div>

                            {/* Anomaly / Security Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  KEY SUSPENDED
                                </span>
                              ) : isMultiSite ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-destructive/15 text-destructive border border-destructive/30">
                                  <ShieldAlert size={10} /> MULTI-SITE ({b.anomalyFlags?.activeOriginsCount} SITES)
                                </span>
                              ) : hasMismatch ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle size={10} /> DOMAIN MISMATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                                  <ShieldCheck size={10} /> SECURE ({b.detectedOrigins?.length || 0} ORIGIN)
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedBusinessForKey(b)}
                                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors font-medium underline decoration-dotted ml-0.5"
                              >
                                Inspect
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-[11px] font-mono opacity-60">
                              No active key
                            </span>
                            {b.keyRevokedAt && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-destructive/10 text-destructive border border-destructive/20">
                                REVOKED
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Store Status */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                            b.status === 'active'
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'bg-destructive/15 text-destructive border border-destructive/30',
                          )}
                        >
                          {b.status === 'active' ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <XCircle size={11} />
                          )}
                          {b.status}
                        </span>
                      </td>

                      {/* Platform */}
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-surface-high px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase border border-border">
                          {b.connectedPlatform || 'custom'}
                        </span>
                      </td>

                      {/* Conversations Count */}
                      <td className="px-4 py-3 text-right font-serif font-semibold text-sm text-foreground tabular-nums">
                        {b.conversationsCount.toLocaleString()}
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px] tabular-nums">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Direct Inspect Button */}
                          <Link
                            href={`/admin/users/${b.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-high hover:bg-surface-bright text-xs font-semibold text-foreground border border-border transition-colors shadow-xs"
                            title="Inspect Store & Telemetry"
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </Link>

                          {/* Key Telemetry Button */}
                          {hasKey && (
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessForKey(b)}
                              className="p-1 rounded-lg border border-border bg-surface-high hover:bg-surface-bright text-foreground transition-colors shadow-xs"
                              title="Inspect Key & Live Origins"
                            >
                              <Key size={13} />
                            </button>
                          )}

                          {/* Store Suspend / Activate Toggle */}
                          <button
                            onClick={() => setConfirmToggleBusiness(b)}
                            disabled={updatingId === b.id}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs border',
                              b.status === 'active'
                                ? 'border-border bg-surface-high text-amber-400 hover:bg-surface-bright'
                                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
                            )}
                          >
                            {updatingId === b.id ? (
                              <Loader2 size={12} className="animate-spin inline" />
                            ) : b.status === 'active' ? (
                              'Suspend'
                            ) : (
                              'Activate'
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

      {/* ── Key Telemetry & Moderation Modal ── */}
      {selectedBusinessForKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
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
            <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-primary" />
                  <h3 className="text-base font-heading font-bold text-foreground tracking-tight">
                    Key Intelligence & Origin Security
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Store: <strong className="text-foreground">{selectedBusinessForKey.name}</strong> • Registered Domain:{' '}
                  <span className="font-mono text-foreground">{selectedBusinessForKey.domain || 'None'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBusinessForKey(null);
                  setShowRevokeConfirm(false);
                }}
                disabled={keyActionLoading}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-high transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Key Information Box */}
            <div className="p-3.5 rounded-xl bg-surface-low border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Publishable Key String
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider',
                    selectedBusinessForKey.publishableKey && selectedBusinessForKey.keyStatus !== 'suspended'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-destructive/15 text-destructive border border-destructive/30',
                  )}
                >
                  {selectedBusinessForKey.publishableKey
                    ? selectedBusinessForKey.keyStatus?.toUpperCase() || 'ACTIVE'
                    : 'NO KEY / REVOKED'}
                </span>
              </div>

              {selectedBusinessForKey.publishableKey ? (
                <div className="flex items-center gap-2 bg-surface-container border border-border rounded-lg p-2">
                  <span className="font-mono text-xs text-primary font-bold break-all flex-1">
                    {selectedBusinessForKey.publishableKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(selectedBusinessForKey.publishableKey!)}
                    className="p-1.5 rounded bg-surface-high hover:bg-surface-bright text-foreground transition-colors shrink-0"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  This store has no active publishable key.
                </p>
              )}
            </div>

            {/* Detected Origins & Anomaly Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-bold text-foreground flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" /> Live Detected Origins & Connected Sites
                </h4>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {selectedBusinessForKey.detectedOrigins?.length || 0} active
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-border bg-surface-low p-2.5">
                {(!selectedBusinessForKey.detectedOrigins ||
                  selectedBusinessForKey.detectedOrigins.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No web origins have connected using this key yet.
                  </p>
                ) : (
                  selectedBusinessForKey.detectedOrigins.map((orig, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-colors',
                        orig.isMismatch
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-surface-container border-border',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-foreground font-medium truncate">
                          <Globe size={13} className={orig.isMismatch ? 'text-amber-400' : 'text-primary'} />
                          <span className="truncate">{orig.origin}</span>
                        </div>
                        {orig.isMismatch ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Mismatch
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20 shrink-0">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5 font-mono tabular-nums">
                        <span>Sessions: <strong className="text-foreground">{orig.sessionCount}</strong></span>
                        <span>Last seen: {new Date(orig.lastSeen).toLocaleTimeString()} ({new Date(orig.lastSeen).toLocaleDateString()})</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Revoke Confirmation Warning Prompt */}
            {showRevokeConfirm && (
              <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 space-y-2 animate-in fade-in duration-150">
                <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Permanently revoke and destroy key?
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This will immediately disconnect and reject all live voice sessions and storefront widgets across all websites.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRevokeConfirm(false)}
                    disabled={keyActionLoading}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-low border border-border text-foreground hover:bg-surface-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminRevokeKey(selectedBusinessForKey.id)}
                    disabled={keyActionLoading}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/90 flex items-center gap-1.5"
                  >
                    {keyActionLoading && <Loader2 size={12} className="animate-spin" />}
                    Confirm Revocation
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            {!showRevokeConfirm && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusinessForKey(null);
                  }}
                  disabled={keyActionLoading}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-surface-low border border-border text-foreground hover:bg-surface-high transition-colors"
                >
                  Close
                </button>

                {selectedBusinessForKey.publishableKey && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAdminToggleKeyStatus(
                          selectedBusinessForKey.id,
                          selectedBusinessForKey.keyStatus,
                        )
                      }
                      disabled={keyActionLoading}
                      className={cn(
                        'px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5',
                        selectedBusinessForKey.keyStatus === 'suspended'
                          ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                          : 'border-border bg-surface-high text-amber-400 hover:bg-surface-bright',
                      )}
                    >
                      {keyActionLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : selectedBusinessForKey.keyStatus === 'suspended' ? (
                        <PlayCircle size={13} />
                      ) : (
                        <PauseCircle size={13} />
                      )}
                      <span>
                        {selectedBusinessForKey.keyStatus === 'suspended'
                          ? 'Reactivate Key'
                          : 'Suspend Key'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={keyActionLoading}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Revoke Key</span>
                    </button>
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
