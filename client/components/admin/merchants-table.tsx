'use client';

import React, { useState } from 'react';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleToggleStatus = async (business: AdminBusinessItem) => {
    const nextStatus = business.status === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      business.status === 'active'
        ? `Are you sure you want to SUSPEND "${business.name}"? Their AI voice widget and dashboard access will be restricted.`
        : `Re-activate "${business.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      setUpdatingId(business.id);
      await updateBusinessStatus(business.id, nextStatus);
      onDataUpdated();
    } catch (err) {
      alert('Failed to update business status. Please try again.');
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
    setFeedbackMessage(null);
    try {
      await adminRevokeBusinessKeyApi(businessId);
      setFeedbackMessage({
        type: 'success',
        text: 'Publishable key revoked and invalidated successfully.',
      });
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
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to revoke publishable key.',
      });
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
    setFeedbackMessage(null);
    try {
      await adminUpdateKeyStatusApi(businessId, nextKeyStatus);
      setFeedbackMessage({
        type: 'success',
        text: `Key status updated to ${nextKeyStatus}.`,
      });
      onDataUpdated();
      if (selectedBusinessForKey) {
        setSelectedBusinessForKey({
          ...selectedBusinessForKey,
          keyStatus: nextKeyStatus,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to update key status.',
      });
    } finally {
      setKeyActionLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-container p-5 shadow-sm">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stores by name, domain, or key..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-surface-high py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter size={13} />
              <span>Filter Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-lg border border-input bg-surface-high px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Merchants</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-4 py-3">Merchant / Store</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Publishable Key & Telemetry</th>
                <th className="px-4 py-3">Store Status</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3 text-right">Conversations</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading merchant records...</span>
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
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{b.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {b.domain || 'no domain'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground">{b.ownerName}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {b.ownerEmail}
                          </span>
                        </div>
                      </td>

                      {/* ── Key & Telemetry Column ── */}
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
                                <Copy size={11} />
                              </button>
                            </div>

                            {/* Anomaly / Security Pills */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  KEY SUSPENDED
                                </span>
                              ) : isMultiSite ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-destructive/15 text-destructive border border-destructive/30">
                                  <ShieldAlert size={10} /> MULTI-SITE (
                                  {b.anomalyFlags?.activeOriginsCount} SITES)
                                </span>
                              ) : hasMismatch ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle size={10} /> DOMAIN MISMATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[color:var(--status-online)]/15 text-[color:var(--status-online)] border border-[color:var(--status-online)]/30">
                                  <ShieldCheck size={10} /> SECURE (
                                  {b.detectedOrigins?.length || 0} ORIGIN)
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedBusinessForKey(b)}
                                className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-dotted font-medium ml-1"
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

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
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

                      <td className="px-4 py-3">
                        <span className="rounded bg-surface-high px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                          {b.connectedPlatform || 'none'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                        {b.conversationsCount.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasKey && (
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessForKey(b)}
                              className="p-1.5 rounded-md border border-border bg-surface-high hover:bg-surface-bright text-foreground text-[11px] font-medium transition-colors"
                              title="Inspect Key & Live Telemetry"
                            >
                              <Key size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(b)}
                            disabled={updatingId === b.id}
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                              b.status === 'active'
                                ? 'border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                                : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
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
              setFeedbackMessage(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface-container p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-primary" />
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    Key Intelligence & Security
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
                  setFeedbackMessage(null);
                }}
                disabled={keyActionLoading}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface-high transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status notification */}
            {feedbackMessage && (
              <div
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-medium border flex items-center gap-2',
                  feedbackMessage.type === 'success'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-destructive/10 border-destructive/20 text-destructive',
                )}
              >
                {feedbackMessage.type === 'success' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* Key Information Box */}
            <div className="p-3.5 rounded-xl bg-surface-low border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Publishable Key String
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    selectedBusinessForKey.publishableKey && selectedBusinessForKey.keyStatus !== 'suspended'
                      ? 'bg-[color:var(--status-online)]/15 text-[color:var(--status-online)] border border-[color:var(--status-online)]/30'
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
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Mismatch
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
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
                    className="px-3 py-1 text-xs font-medium rounded-md bg-surface-low border border-border text-foreground hover:bg-surface-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminRevokeKey(selectedBusinessForKey.id)}
                    disabled={keyActionLoading}
                    className="px-3 py-1 text-xs font-semibold rounded-md bg-destructive text-white hover:bg-destructive/90 flex items-center gap-1.5"
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
                    setFeedbackMessage(null);
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
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                      )}
                    >
                      {keyActionLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : selectedBusinessForKey.keyStatus === 'suspended' ? (
                        <PlayCircle size={13} />
                      ) : (
                        <PauseCircle size={13} />
                      )}
                      {selectedBusinessForKey.keyStatus === 'suspended'
                        ? 'Reactivate Key'
                        : 'Suspend Key'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={keyActionLoading}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Revoke Key
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
