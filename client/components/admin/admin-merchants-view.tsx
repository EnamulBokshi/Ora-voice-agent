'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from './admin-header';
import { MerchantsTable } from './merchants-table';
import { fetchAdminBusinesses } from '@/services/admin-service';
import { AdminBusinessItem } from '@/types/admin';

export function AdminMerchantsView() {
  const [businesses, setBusinesses] = useState<AdminBusinessItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (page = 1, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchAdminBusinesses({
        page,
        limit: 15,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      setBusinesses(res.businesses);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Merchants & Stores Directory"
        description="Comprehensive index of all merchant stores, active platform integrations, and tenant operational states."
        onRefresh={() => loadData(pagination.page, true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6">
        <MerchantsTable
          businesses={businesses}
          pagination={pagination}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onPageChange={(p) => loadData(p)}
          onDataUpdated={() => loadData(pagination.page, true)}
          loading={loading}
        />
      </div>
    </div>
  );
}
