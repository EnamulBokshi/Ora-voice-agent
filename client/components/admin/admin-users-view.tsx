'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  X,
  Loader2,
} from 'lucide-react';
import { AdminHeader } from './admin-header';
import { AdminUsersTable } from './admin-users-table';
import { PlatformStatCard } from './platform-stat-card';
import { fetchAdminUsers, createPlatformUser } from '@/services/admin-service';
import { AdminUserItem, AdminUserStats, CreatePlatformUserPayload } from '@/types/admin';

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<CreatePlatformUserPayload>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    businessName: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  const loadData = useCallback(
    async (page = 1, isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchAdminUsers({
          page,
          limit: 20,
          search: searchQuery || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          plan: planFilter !== 'all' ? planFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });

        setUsers(res.users);
        setStats(res.stats);
        setPagination(res.pagination);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, roleFilter, planFilter, statusFilter],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await createPlatformUser(addForm);
      alert(res.message || 'User created successfully.');
      setShowAddModal(false);
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        businessName: '',
      });
      loadData(1, true);
    } catch (err: any) {
      alert(err.message || 'Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Users & Subscribers Directory"
        description="Platform accounts, store ownership, and RBAC permissions."
        onRefresh={() => loadData(pagination.page, true)}
        isRefreshing={refreshing}
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <UserPlus size={14} />
          <span>Add Platform User</span>
        </button>
      </AdminHeader>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Top Executive KPI Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title="Total Users"
            value={stats?.totalUsers ?? pagination.total}
            subtitle="Platform accounts registered"
            icon={<Users className="h-4 w-4" />}
            trend={stats?.totalUsersTrend || '+14.2%'}
            trendUp={true}
          />
          <PlatformStatCard
            title="Active Subscribers"
            value={stats?.activeSubscribers ?? 0}
            subtitle="Paid merchant store subscribers"
            icon={<ShieldCheck className="h-4 w-4" />}
            trend={stats?.activeSubscribersTrend || '+21.5%'}
            trendUp={true}
            highlight={true}
          />
          <PlatformStatCard
            title="Verified Accounts"
            value={stats?.activeUsers ?? 0}
            subtitle="Email verified identities"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <PlatformStatCard
            title="Pending Verification"
            value={stats?.pendingVerification ?? 0}
            subtitle="Awaiting 6-digit OTP verification"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        {/* Users & Subscribers Table */}
        <AdminUsersTable
          users={users}
          pagination={pagination}
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          planFilter={planFilter}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onRoleChange={setRoleFilter}
          onPlanChange={setPlanFilter}
          onStatusChange={setStatusFilter}
          onPageChange={(p) => loadData(p)}
          onDataUpdated={() => loadData(pagination.page, true)}
          loading={loading}
        />
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-container p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-high hover:text-foreground"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Provision Platform User</h3>
                <p className="text-[11px] text-muted-foreground">Create a SuperAdmin operator, store owner, or team member.</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Initial Password (min 8 chars)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Assigned Platform Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as any })}
                  className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground outline-none focus:border-ring"
                >
                  <option value="user">Standard User</option>
                  <option value="owner">Store Owner</option>
                  <option value="admin">Store Admin</option>
                  <option value="staff">Store Staff</option>
                  <option value="super_admin">Platform SuperAdmin</option>
                </select>
              </div>

              {addForm.role !== 'super_admin' && (
                <div>
                  <label className="block text-muted-foreground mb-1">Merchant Store Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Footwear Store"
                    value={addForm.businessName || ''}
                    onChange={(e) => setAddForm({ ...addForm, businessName: e.target.value })}
                    className="w-full rounded-lg border border-input bg-surface-high p-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-border bg-surface-high px-4 py-2 text-foreground hover:bg-surface-bright"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{createLoading ? 'Provisioning...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
