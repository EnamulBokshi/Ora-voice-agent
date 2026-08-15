'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { AdminBusinessItem } from '@/types/admin';
import { updateBusinessStatus } from '@/services/admin-service';
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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-container p-5">
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3 text-right">Conversations</th>
              <th className="px-4 py-3">Joined Date</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading merchant records...</span>
                  </div>
                </td>
              </tr>
            ) : businesses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No merchants found matching your query.
                </td>
              </tr>
            ) : (
              businesses.map((b) => (
                <tr key={b.id} className="hover:bg-surface-high/50 transition-colors">
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

                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                    {b.conversationsCount.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A'}
                  </td>

                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} merchants)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-high text-foreground hover:bg-surface-bright disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
