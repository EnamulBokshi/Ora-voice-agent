'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { MerchantsTable } from './merchants-table';
import { fetchAdminBusinesses } from '@/services/admin-service';
import { AdminBusinessItem } from '@/types/admin';
import {
  Store,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

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
        status: (statusFilter === 'active' || statusFilter === 'suspended') ? statusFilter : undefined,
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

  // Derived Telemetry Summary
  const stats = useMemo(() => {
    const total = pagination.total || businesses.length;
    const active = businesses.filter((b) => b.status === 'active').length;
    const totalConvs = businesses.reduce((acc, b) => acc + (b.conversationsCount || 0), 0);
    const anomalies = businesses.filter(
      (b) => b.anomalyFlags?.isMultiSite || b.anomalyFlags?.hasMismatch,
    ).length;

    return { total, active, totalConvs, anomalies };
  }, [businesses, pagination.total]);

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Merchants & Stores Directory"
        description="Merchant stores, integrations, and operational states."
        onRefresh={() => loadData(pagination.page, true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* ── 4-KPI Telemetry Ribbon (Standard ORA Newsreader Serif + Tabular Numbers) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title="Total Stores"
            value={stats.total.toLocaleString()}
            subtitle="Registered merchant accounts"
            icon={<Store className="h-4 w-4" />}
          />

          <PlatformStatCard
            title="Active Stores"
            value={stats.active.toLocaleString()}
            subtitle={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% operational online`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            highlight={stats.active > 0}
          />

          <PlatformStatCard
            title="Total Conversations"
            value={stats.totalConvs.toLocaleString()}
            subtitle="AI sales & support sessions"
            icon={<MessageSquare className="h-4 w-4" />}
          />

          <PlatformStatCard
            title="Security Status"
            value={stats.anomalies === 0 ? '100% Verified' : `${stats.anomalies} Flagged`}
            subtitle={stats.anomalies === 0 ? 'All origins match store domains' : 'Domain mismatch / multi-site'}
            icon={stats.anomalies === 0 ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            valueColor={stats.anomalies === 0 ? 'text-primary' : 'text-amber-400'}
          />
        </div>

        {/* ── Main Merchants Table ── */}
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
