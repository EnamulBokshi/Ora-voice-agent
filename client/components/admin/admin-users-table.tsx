'use client';

import React from 'react';
import Link from 'next/link';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  Store,
  Crown,
} from 'lucide-react';
import { AdminUserItem } from '@/types/admin';
import { cn } from '@/lib/utils';

interface AdminUsersTableProps {
  users: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchQuery: string;
  roleFilter: string;
  planFilter: string;
  statusFilter: string;
  onSearchChange: (q: string) => void;
  onRoleChange: (r: string) => void;
  onPlanChange: (p: string) => void;
  onStatusChange: (s: string) => void;
  onPageChange: (p: number) => void;
  onDataUpdated: () => void;
  loading?: boolean;
}

export function AdminUsersTable({
  users,
  pagination,
  searchQuery,
  roleFilter,
  planFilter,
  statusFilter,
  onSearchChange,
  onRoleChange,
  onPlanChange,
  onStatusChange,
  onPageChange,
  onDataUpdated,
  loading = false,
}: AdminUsersTableProps) {

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
            <Shield size={10} />
            SUPERADMIN
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center rounded-full border border-chart-2/40 bg-chart-2/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-chart-2">
            STORE OWNER
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center rounded-full border border-info/40 bg-info/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">
            ADMIN
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
            STAFF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-border bg-surface-high px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            USER
          </span>
        );
    }
  };

  const getPlanBadge = (sub?: AdminUserItem['subscription']) => {
    if (!sub) {
      return (
        <span className="inline-flex items-center rounded-md border border-border bg-surface-lowest px-2 py-0.5 text-[10px] text-muted-foreground">
          Free Tier
        </span>
      );
    }

    const isPaid = sub.isSubscriber;
    const isScale = sub.planId === 'scale';
    const isGrowth = sub.planId === 'growth';

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
              isScale
                ? 'border-primary/40 bg-primary/20 text-primary'
                : isGrowth
                ? 'border-chart-2/40 bg-chart-2/20 text-chart-2'
                : 'border-border bg-surface-lowest text-muted-foreground',
            )}
          >
            {isPaid && <Crown size={10} />}
            {sub.planName}
          </span>
        </div>
        <span className="text-[9px] uppercase font-mono text-muted-foreground">
          {sub.billingProvider} • {sub.status}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-container p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by name, email, or connected store..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-high py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">SuperAdmins</option>
            <option value="owner">Store Owners</option>
            <option value="admin">Admins</option>
            <option value="staff">Staff</option>
            <option value="user">Standard Users</option>
          </select>

          {/* Plan Tier Filter */}
          <select
            value={planFilter}
            onChange={(e) => onPlanChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Tier</option>
            <option value="growth">Growth Plan</option>
            <option value="scale">Scale Plan</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Stores</option>
            <option value="suspended">Suspended Stores</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-container">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
            <tr>
              <th className="px-4 py-3">User Identity</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Store Tenant</th>
              <th className="px-4 py-3">Subscriber & Plan</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3 text-right">Activity</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading users & subscribers directory...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No users found matching the selected filters.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-high/50 transition-colors">
                  {/* User Identity */}
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors block truncate"
                      >
                        {u.name}
                      </Link>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {u.email}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">{getRoleBadge(u.role)}</td>

                  {/* Store Tenant */}
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex flex-col">
                      <span className="truncate font-semibold">{u.businessName}</span>
                      {u.businessDomain && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {u.businessDomain}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Plan / Subscriber */}
                  <td className="px-4 py-3">{getPlanBadge(u.subscription)}</td>

                  {/* Verification Status */}
                  <td className="px-4 py-3">
                    {u.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckCircle2 size={13} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                        <AlertCircle size={13} />
                        Pending OTP
                      </span>
                    )}
                  </td>

                  {/* Activity Metrics */}
                  <td className="px-4 py-3 text-right text-[11px] text-muted-foreground tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground font-semibold">
                        {u.metrics?.conversationsCount || 0} convs
                      </span>
                      <span>{u.metrics?.ordersCount || 0} orders</span>
                    </div>
                  </td>

                  {/* Direct Action Link */}
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-high hover:bg-surface-bright text-xs font-semibold text-foreground border border-border transition-colors shadow-xs"
                      title="Inspect user profile & store configuration"
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))
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
        itemName="users"
        onPageChange={onPageChange}
      />
    </div>
  );
}
