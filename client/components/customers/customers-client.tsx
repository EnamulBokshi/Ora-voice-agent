'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  UserPlus,
  Download,
  AlertCircle,
  Users,
} from 'lucide-react';
import { getCustomersApi } from '@/services/customers-service';
import { Customer } from '@/types/customer';
import { demoCustomers } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { TopHeader } from '@/components/dashboard/top-header';
import { CustomersKpiStrip } from './customers-kpi-strip';
import { CustomersFilterBar, CustomerSegment, CustomerSort } from './customers-filter-bar';
import { CustomersTable } from './customers-table';
import { CustomerDetailPanel } from './customer-detail-panel';
import { AddCustomerModal } from './add-customer-modal';

export function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [sortBy, setSortBy] = useState<CustomerSort>('recent');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const applyCustomersData = useCallback((items: Customer[]) => {
    setCustomers(items);
    setSelectedId((prev) => {
      if (prev && items.some((c) => (c._id || c.id) === prev)) {
        return prev;
      }
      return items[0]?._id || items[0]?.id || '';
    });
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getCustomersApi();
      const resolved = withDemoFallback(res ?? [], demoCustomers);
      applyCustomersData(resolved);
    } catch (err) {
      console.error('Failed to load customers:', err);
      const fallback = withDemoFallback(null, demoCustomers);
      if (fallback && fallback.length > 0) {
        applyCustomersData(fallback);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load customers');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyCustomersData]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await getCustomersApi();
        if (!active) return;
        const resolved = withDemoFallback(res ?? [], demoCustomers);
        applyCustomersData(resolved);
      } catch (err) {
        if (!active) return;
        const fallback = withDemoFallback(null, demoCustomers);
        if (fallback && fallback.length > 0) {
          applyCustomersData(fallback);
        } else {
          setError(err instanceof Error ? err.message : 'Could not load customers');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [applyCustomersData]);

  // Filter & Sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Segment filter
    if (activeSegment === 'contactable') {
      result = result.filter(
        (c) => Boolean(c.email && c.email.trim()) || Boolean(c.phone && c.phone.trim()),
      );
    } else if (activeSegment === 'profiled') {
      result = result.filter(
        (c) => c.extractedPreferences && Object.keys(c.extractedPreferences).length > 0,
      );
    } else if (activeSegment === 'anonymous') {
      result = result.filter((c) => c.isAnonymous || (!c.email && !c.phone));
    }

    // 2. Text Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchEmail = (c.email ?? '').toLowerCase().includes(q);
        const matchPhone = (c.phone ?? '').toLowerCase().includes(q);
        const matchPreferences = c.extractedPreferences
          ? JSON.stringify(c.extractedPreferences).toLowerCase().includes(q)
          : false;

        return matchName || matchEmail || matchPhone || matchPreferences;
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // 'recent' by default (lastActiveAt or updatedAt)
      const dateA = new Date(a.lastActiveAt || a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.lastActiveAt || b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return result;
  }, [customers, search, activeSegment, sortBy]);

  // Currently selected customer
  const selectedCustomer = useMemo(() => {
    if (!selectedId) return filteredAndSortedCustomers[0] || customers[0] || null;
    return (
      customers.find((c) => (c._id || c.id) === selectedId) ||
      filteredAndSortedCustomers[0] ||
      null
    );
  }, [customers, filteredAndSortedCustomers, selectedId]);

  // Export filtered customers as JSON
  const handleExportJson = () => {
    if (filteredAndSortedCustomers.length === 0) return;
    const exportData = filteredAndSortedCustomers.map((c) => ({
      id: c._id || c.id,
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      isAnonymous: c.isAnonymous ?? (!c.email && !c.phone),
      externalCustomerId: c.externalCustomerId || null,
      deviceIds: c.deviceIds ?? [],
      extractedPreferences: c.extractedPreferences ?? {},
      createdAt: c.createdAt,
      lastActiveAt: c.lastActiveAt || null,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ora-customers-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Header action elements
  const headerActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => setIsAddModalOpen(true)}
        className="px-3 py-1.5 rounded-md text-xs font-medium text-primary-foreground bg-primary hover:bg-primary-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <UserPlus size={13} />
        <span>Add Customer</span>
      </button>

      <button
        type="button"
        onClick={handleExportJson}
        disabled={filteredAndSortedCustomers.length === 0}
        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-high/40 hover:bg-surface-high border border-border/50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        title="Export to JSON"
      >
        <Download size={13} />
        <span className="hidden sm:inline">Export</span>
      </button>

      <button
        type="button"
        onClick={() => load(true)}
        disabled={refreshing || loading}
        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors disabled:opacity-40 cursor-pointer"
        title="Refresh customer list"
        aria-label="Refresh customer list"
      >
        <RefreshCw size={13} className={refreshing ? 'animate-spin text-primary' : ''} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Top Header */}
      <TopHeader
        title="Customers"
        breadcrumb={{ label: 'Dashboard', href: '/dashboard' }}
        badge={
          <span className="text-[11px] text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full font-medium tabular-nums">
            {customers.length} total
          </span>
        }
        actions={headerActions}
      />

      {/* Main Content Area — with generous, uncongested spacing */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-9 space-y-8">
        <div className="max-w-[1440px] mx-auto space-y-8">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-md bg-destructive/15 border border-destructive/30 flex items-center justify-between gap-3 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => load()}
                className="underline hover:no-underline font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-24 rounded-md bg-surface-container border border-border/50" />
              <div className="h-10 rounded-md bg-surface-container border border-border/50" />
              <div className="h-96 rounded-md bg-surface-container border border-border/50" />
            </div>
          ) : (
            <>
              {/* 1. KPI Metric Strip */}
              <CustomersKpiStrip customers={customers} />

              {/* 2. Customer Segmentation & Filter Bar */}
              <CustomersFilterBar
                customers={customers}
                search={search}
                onSearchChange={setSearch}
                activeSegment={activeSegment}
                onSegmentChange={setActiveSegment}
                sortBy={sortBy}
                onSortChange={setSortBy}
                totalFiltered={filteredAndSortedCustomers.length}
              />

              {/* 3. Master-Detail Work Surface — spacious gap */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 min-h-[560px]">
                {/* Left: Customer Data Grid */}
                <div className="lg:col-span-7 flex flex-col min-h-0">
                  <CustomersTable
                    customers={filteredAndSortedCustomers}
                    selectedId={selectedCustomer ? selectedCustomer._id || selectedCustomer.id || '' : ''}
                    onSelectCustomer={(c) => setSelectedId(c._id || c.id || '')}
                  />
                </div>

                {/* Right: Customer Detail Panel (Inspector) */}
                <div
                  id="customer-detail-section"
                  className="lg:col-span-5 flex flex-col h-full scroll-mt-6"
                >
                  {selectedCustomer ? (
                    <CustomerDetailPanel
                      key={selectedCustomer._id || selectedCustomer.id || ''}
                      customer={selectedCustomer}
                      onReload={() => load()}
                    />
                  ) : (
                    <div className="rounded-md border border-border/60 bg-background p-10 text-center text-xs text-muted-foreground h-full flex flex-col items-center justify-center space-y-2">
                      <Users size={20} className="text-muted-foreground/40" />
                      <p className="font-medium text-foreground text-xs">Select a customer</p>
                      <p className="text-[11.5px] max-w-xs text-muted-foreground">
                        Choose a customer from the list to view contact information, saved preferences, and storefront devices.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(created) => {
          load();
          if (created) setSelectedId(created._id || created.id || '');
        }}
      />
    </div>
  );
}
