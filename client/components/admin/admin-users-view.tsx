'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from './admin-header';
import { AdminUsersTable } from './admin-users-table';
import { fetchAdminUsers } from '@/services/admin-service';
import { AdminUserItem } from '@/types/admin';

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (page = 1, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchAdminUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });

      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Users & RBAC Directory"
        description="Global platform authentication identities, merchant store ownership mappings, and role-based permissions."
        onRefresh={() => loadData(pagination.page, true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6">
        <AdminUsersTable
          users={users}
          pagination={pagination}
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          onSearchChange={setSearchQuery}
          onRoleChange={setRoleFilter}
          onPageChange={(p) => loadData(p)}
          loading={loading}
        />
      </div>
    </div>
  );
}
