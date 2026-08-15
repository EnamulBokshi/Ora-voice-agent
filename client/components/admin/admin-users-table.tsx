'use client';

import React from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Shield,
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
  onSearchChange: (q: string) => void;
  onRoleChange: (r: string) => void;
  onPageChange: (p: number) => void;
  loading?: boolean;
}

export function AdminUsersTable({
  users,
  pagination,
  searchQuery,
  roleFilter,
  onSearchChange,
  onRoleChange,
  onPageChange,
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
          <span className="inline-flex items-center rounded-full border border-chart-4/40 bg-chart-4/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
            ADMIN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-border bg-surface-high px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            STAFF
          </span>
        );
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
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface-high py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter size={13} />
            <span>Filter Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="rounded-lg border border-input bg-surface-high px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">SuperAdmins</option>
            <option value="owner">Store Owners</option>
            <option value="admin">Store Admins</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
            <tr>
              <th className="px-4 py-3">User Profile</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Store Tenant</th>
              <th className="px-4 py-3">Email Verified</th>
              <th className="px-4 py-3">Registered Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading users directory...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-high/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{u.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {u.email}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">{getRoleBadge(u.role)}</td>

                  <td className="px-4 py-3 font-medium text-foreground">
                    <span className="truncate">{u.businessName}</span>
                  </td>

                  <td className="px-4 py-3">
                    {u.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckCircle2 size={13} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
                        <AlertCircle size={13} />
                        Pending OTP
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
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
