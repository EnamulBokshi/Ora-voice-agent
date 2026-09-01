'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Shield,
  User,
  MoreVertical,
  Eye,
  Edit2,
  Ban,
  Mail,
  LogOut,
  X,
  CreditCard,
  Building,
  Store,
  Sparkles,
  MessageSquare,
  PhoneCall,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { AdminUserItem, AdminUserDetail, UpdateAdminUserPayload } from '@/types/admin';
import {
  fetchAdminUserById,
  updateAdminUser,
  executeAdminUserAction,
} from '@/services/admin-service';
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
  // Modal & Drawer states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdminUserPayload>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Open User Detail
  const handleOpenDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    try {
      const res = await fetchAdminUserById(userId);
      setUserDetail(res.user);
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });
    setActiveMenuId(null);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      await updateAdminUser(editingUser.id, editForm);
      setEditingUser(null);
      onDataUpdated();
    } catch (err) {
      alert('Failed to update user profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Action
  const handleAction = async (
    userId: string,
    action: 'suspend' | 'activate' | 'resend_otp' | 'revoke_sessions' | 'delete',
    userEmail: string,
  ) => {
    setActiveMenuId(null);
    let confirmMsg = `Are you sure you want to perform "${action}" for ${userEmail}?`;
    if (action === 'suspend') confirmMsg = `Suspend ${userEmail} and restrict their store access?`;
    if (action === 'delete') confirmMsg = `Permanently delete account ${userEmail}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await executeAdminUserAction(userId, action);
      alert(res.message);
      onDataUpdated();
      if (selectedUserId === userId && action === 'delete') {
        setSelectedUserId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute account action.');
    } finally {
      setActionLoading(false);
    }
  };

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
      case 'user':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            <User size={10} />
            USER
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

  const getPlanBadge = (sub?: AdminUserItem['subscription']) => {
    if (!sub || sub.planId === 'free') {
      return (
        <span className="inline-flex items-center rounded-md border border-border bg-surface-high px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Free Tier
        </span>
      );
    }

    if (sub.planId === 'scale') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-300">
          <Sparkles size={11} className="text-purple-400" />
          Scale Plan
          <span className="rounded bg-purple-950/80 px-1 py-0.2 text-[9px] uppercase tracking-wider text-purple-300 font-mono">
            {sub.billingProvider}
          </span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
        <CreditCard size={11} />
        Growth Plan
        <span className="rounded bg-surface-lowest px-1 py-0.2 text-[9px] uppercase tracking-wider text-primary font-mono">
          {sub.billingProvider}
        </span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-container p-5">
      {/* Table Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user name, email, store, or domain..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-surface-high py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter size={13} />
            <span>Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => onPlanChange(e.target.value)}
              className="rounded-lg border border-input bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Plans</option>
              <option value="subscriber">Subscribers Only (Paid)</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
              <option value="free">Free Tier</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => onRoleChange(e.target.value)}
              className="rounded-lg border border-input bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">SuperAdmins</option>
              <option value="owner">Store Owners</option>
              <option value="admin">Store Admins</option>
              <option value="staff">Staff</option>
              <option value="user">Users</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rounded-lg border border-input bg-surface-high px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Status</option>
              <option value="active">Active Stores</option>
              <option value="suspended">Suspended</option>
              <option value="unverified">Pending OTP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
            <tr>
              <th className="px-4 py-3">User Identity</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Store Tenant</th>
              <th className="px-4 py-3">Subscriber & Plan</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3 text-right">Activity</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
                      <span className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer" onClick={() => handleOpenDetail(u.id)}>
                        {u.name}
                      </span>
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
                  <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground font-semibold">
                        {u.metrics?.conversationsCount || 0} convs
                      </span>
                      <span>{u.metrics?.ordersCount || 0} orders</span>
                    </div>
                  </td>

                  {/* Actions Menu */}
                  <td className="px-4 py-3 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
                    >
                      <MoreVertical size={15} />
                    </button>

                    {activeMenuId === u.id && (
                      <div className="absolute right-4 top-10 z-30 w-44 rounded-xl border border-border bg-surface-container shadow-2xl p-1.5 text-left text-xs animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleOpenDetail(u.id);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-surface-high transition-colors"
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-surface-high transition-colors"
                        >
                          <Edit2 size={13} />
                          <span>Edit Profile</span>
                        </button>
                        <button
                          onClick={() => handleAction(u.id, 'resend_otp', u.email)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-surface-high transition-colors"
                        >
                          <Mail size={13} />
                          <span>Resend OTP</span>
                        </button>
                        <button
                          onClick={() => handleAction(u.id, 'revoke_sessions', u.email)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-surface-high transition-colors"
                        >
                          <LogOut size={13} />
                          <span>Revoke Sessions</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() =>
                            handleAction(
                              u.id,
                              u.businessStatus === 'suspended' ? 'activate' : 'suspend',
                              u.email,
                            )
                          }
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
                            u.businessStatus === 'suspended'
                              ? 'text-primary hover:bg-primary/10'
                              : 'text-amber-400 hover:bg-amber-400/10',
                          )}
                        >
                          <Ban size={13} />
                          <span>{u.businessStatus === 'suspended' ? 'Reactivate Store' : 'Suspend Store'}</span>
                        </button>
                      </div>
                    )}
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total matching users)
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

      {/* User Drilldown Detail Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface-container p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUserId(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-high hover:text-foreground"
            >
              <X size={16} />
            </button>

            {detailLoading || !userDetail ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">Loading drilldown details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Profile */}
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{userDetail.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{userDetail.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {getRoleBadge(userDetail.role)}
                      {userDetail.emailVerified ? (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          <AlertCircle size={11} /> Pending OTP
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground font-mono">
                    <span>Joined: {new Date(userDetail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Business Store Tenant & Subscription */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Store Details */}
                  <div className="rounded-xl border border-border bg-surface-lowest p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                      <Store size={14} className="text-primary" />
                      <span>Store Tenant Details</span>
                    </div>
                    {userDetail.business ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Store Name:</span>
                          <span className="font-semibold text-foreground">{userDetail.business.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Domain:</span>
                          <span className="font-mono text-foreground">{userDetail.business.domain || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform:</span>
                          <span className="uppercase font-mono text-foreground">{userDetail.business.connectedPlatform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="capitalize font-semibold text-foreground">{userDetail.business.status}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No linked store tenant.</p>
                    )}
                  </div>

                  {/* Subscription Details */}
                  <div className="rounded-xl border border-border bg-surface-lowest p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                      <CreditCard size={14} className="text-primary" />
                      <span>Subscription & Plan</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan Tier:</span>
                        <span className="font-bold text-primary">{userDetail.subscription.planName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="uppercase font-mono text-foreground">{userDetail.subscription.billingProvider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize font-semibold text-foreground">{userDetail.subscription.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subscriber State:</span>
                        <span className={cn('font-semibold', userDetail.subscription.isSubscriber ? 'text-primary' : 'text-muted-foreground')}>
                          {userDetail.subscription.isSubscriber ? 'Active Paid Subscriber' : 'Standard / Free'}
                        </span>
                      </div>
                      {userDetail.subscription.currentPeriodEnd && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Renewal Date:</span>
                          <span className="font-mono text-foreground">
                            {new Date(userDetail.subscription.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Performance & Store Metrics */}
                <div className="rounded-xl border border-border bg-surface-lowest p-4">
                  <div className="text-xs font-semibold text-foreground mb-3">AI Sales & Store Performance Metrics</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-lg bg-surface-high p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase">Catalog</span>
                      <p className="text-base font-black font-mono text-foreground">{userDetail.metrics.productsCount}</p>
                    </div>
                    <div className="rounded-lg bg-surface-high p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase">Conversations</span>
                      <p className="text-base font-black font-mono text-foreground">{userDetail.metrics.conversationsCount}</p>
                    </div>
                    <div className="rounded-lg bg-surface-high p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase">Voice Mins</span>
                      <p className="text-base font-black font-mono text-foreground">{userDetail.metrics.voiceMinutes}</p>
                    </div>
                    <div className="rounded-lg bg-surface-high p-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase">Orders GMV</span>
                      <p className="text-base font-black font-mono text-primary">${userDetail.metrics.totalGmv}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Conversation Logs */}
                {userDetail.recentConversations && userDetail.recentConversations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-foreground mb-2">Recent Customer Conversations</div>
                    <div className="rounded-lg border border-border divide-y divide-border text-xs">
                      {userDetail.recentConversations.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 hover:bg-surface-high/40">
                          <div>
                            <span className="font-semibold text-foreground">{c.customerIdentifier}</span>
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{c.sessionId}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-muted-foreground">{c.turnCount} turns</span>
                            <span className="capitalize text-[10px] text-primary">{c.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-container p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-high hover:text-foreground"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold text-foreground mb-4">Edit User Profile</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground outline-none focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground outline-none focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Assigned Role</label>
                <select
                  value={editForm.role || 'user'}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground outline-none focus:border-ring"
                >
                  <option value="super_admin">SuperAdmin</option>
                  <option value="owner">Store Owner</option>
                  <option value="admin">Store Admin</option>
                  <option value="staff">Store Staff</option>
                  <option value="user">Standard User</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="emailVerified"
                  checked={Boolean(editForm.emailVerified)}
                  onChange={(e) => setEditForm({ ...editForm, emailVerified: e.target.checked })}
                  className="h-4 w-4 rounded border-input bg-surface-high text-primary focus:ring-ring"
                />
                <label htmlFor="emailVerified" className="text-foreground">Email Verified</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-border bg-surface-high px-4 py-2 text-foreground hover:bg-surface-bright"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
