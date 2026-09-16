'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  BadgeCheck,
  ShoppingBag,
  DollarSign,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from '@/components/dashboard/top-header';
import {
  getOrdersApi,
  getOrderByIdApi,
  updateOrderStatusApi,
  type Order,
  type OrdersPaginatedResponse,
} from '@/services/orders-service';

// ── Status Configuration ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Order['status'],
  { label: string; icon: React.ReactNode; cls: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock size={11} />,
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    icon: <BadgeCheck size={11} />,
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
  },
  shipped: {
    label: 'Shipped',
    icon: <Truck size={11} />,
    cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dot: 'bg-sky-400',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCircle2 size={11} />,
    cls: 'bg-primary/10 text-primary border-primary/25',
    dot: 'bg-primary',
  },
  canceled: {
    label: 'Canceled',
    icon: <XCircle size={11} />,
    cls: 'bg-destructive/10 text-destructive border-destructive/25',
    dot: 'bg-destructive',
  },
};

const STATUS_FLOW: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered'];
const ALL_STATUSES: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];

function StatusBadge({ status }: { status: Order['status'] }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border tabular-nums',
        cfg.cls,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source?: 'ora_agent' | 'merchant_platform' }) {
  if (source === 'ora_agent') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
        ORA AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-high text-muted-foreground border border-border/50">
      Storefront
    </span>
  );
}

function formatCurrency(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Order Detail Drawer ───────────────────────────────────────────────────────

function OrderDetailDrawer({
  orderId,
  onClose,
  onStatusUpdated,
}: {
  orderId: string;
  onClose: () => void;
  onStatusUpdated: (updated: Order) => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOrderByIdApi(orderId)
      .then((o) => {
        if (mounted) {
          setOrder(o);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStatusChange = async (status: Order['status']) => {
    if (!order) return;
    setStatusDropdownOpen(false);
    setUpdatingStatus(true);
    try {
      const updated = await updateOrderStatusApi(order._id, status);
      setOrder(updated);
      onStatusUpdated(updated);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const currentStatusIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-[#0A0A0A] border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-lowest flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center border border-border">
              <ShoppingBag size={16} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground tracking-tight">
                  {loading ? 'Loading…' : order?.orderNumber ?? 'Order Details'}
                </h2>
                {order && <StatusBadge status={order.status} />}
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                {order ? `Placed on ${formatDateTime(order.createdAt)}` : 'Fetching order data…'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading order details…
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <XCircle size={24} className="text-destructive/50" />
            Order not found or was removed.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar">

            {/* Fulfillment Status Stepper (Shopify style) */}
            {order.status !== 'canceled' && (
              <div className="p-4 rounded-lg bg-surface-container/70 border border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Fulfillment Progress
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => setStatusDropdownOpen((o) => !o)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-surface-high hover:bg-surface-bright border border-border rounded-md px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {updatingStatus ? 'Updating…' : 'Change Status'}
                      <ChevronDown size={12} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-20 bg-[#111111] rounded-md border border-border shadow-2xl p-1 space-y-1 min-w-[150px]">
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleStatusChange(s)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-left transition-colors cursor-pointer',
                              order.status === s
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                            )}
                          >
                            {STATUS_CONFIG[s].icon}
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {STATUS_FLOW.map((s, idx) => {
                    const isPassed = currentStatusIndex >= idx;
                    const isCurrent = currentStatusIndex === idx;
                    return (
                      <div key={s} className="flex flex-col items-center text-center">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold mb-1.5 border transition-all',
                            isCurrent
                              ? 'bg-primary text-primary-foreground border-primary'
                              : isPassed
                              ? 'bg-primary/20 text-primary border-primary/40'
                              : 'bg-surface-high text-muted-foreground border-border/50',
                          )}
                        >
                          {idx + 1}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] capitalize leading-tight',
                            isCurrent
                              ? 'font-bold text-primary'
                              : isPassed
                              ? 'text-foreground'
                              : 'text-muted-foreground/60',
                          )}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If Canceled */}
            {order.status === 'canceled' && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-destructive">
                  <XCircle size={16} />
                  <span className="font-semibold">This order has been canceled.</span>
                </div>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('pending')}
                  className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Reopen order
                </button>
              </div>
            )}

            {/* Line Items Card */}
            <div className="rounded-lg bg-surface-container/50 border border-border/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Order Items ({order.items.length})
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Total units: {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {order.items.map((item, i) => (
                  <div key={i} className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-surface-high border border-border flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatCurrency(item.unitPrice, order.currency)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums flex-shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Summary */}
              <div className="pt-3 border-t border-border/60 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping & Taxes</span>
                  <span className="tabular-nums text-muted-foreground">Free</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/40 text-sm font-semibold text-foreground">
                  <span>Total Paid</span>
                  <span className="text-primary tabular-nums">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Information */}
            <div className="rounded-lg bg-surface-container/50 border border-border/60 p-4 space-y-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Customer & Shipping
              </span>

              {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 ? (
                <div className="text-xs space-y-1.5 text-foreground">
                  {order.shippingAddress.fullName && (
                    <div className="font-semibold text-[13px]">{order.shippingAddress.fullName}</div>
                  )}
                  {order.shippingAddress.addressLine1 && (
                    <div className="text-muted-foreground">{order.shippingAddress.addressLine1}</div>
                  )}
                  {order.shippingAddress.addressLine2 && (
                    <div className="text-muted-foreground">{order.shippingAddress.addressLine2}</div>
                  )}
                  {(order.shippingAddress.city || order.shippingAddress.state || order.shippingAddress.postalCode) && (
                    <div className="text-muted-foreground">
                      {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                  {order.shippingAddress.country && (
                    <div className="text-muted-foreground">{order.shippingAddress.country}</div>
                  )}
                  {order.shippingAddress.phone && (
                    <div className="text-muted-foreground/80 font-mono text-[11px] pt-1">
                      Tel: {order.shippingAddress.phone}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No physical shipping address specified. (Standard digital/store checkout)
                </p>
              )}
            </div>

            {/* Order Metadata */}
            <div className="rounded-lg bg-surface-container/50 border border-border/60 p-4 space-y-2.5 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Channel & Attribution
              </span>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Channel</span>
                <SourceBadge source={order.source} />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Order Reference</span>
                <span className="font-mono text-[11.5px] text-foreground">{order._id}</span>
              </div>
            </div>

          </div>
        )}
      </aside>
    </>
  );
}

// ── Main Orders Page Client ───────────────────────────────────────────────────

export function OrdersClient() {
  const [data, setData] = useState<OrdersPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async (p: number, quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getOrdersApi({ page: p, limit: PAGE_SIZE });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const handleStatusUpdated = (updated: Order) => {
    if (!data) return;
    setData((prev) =>
      prev
        ? { ...prev, items: prev.items.map((o) => (o._id === updated._id ? updated : o)) }
        : prev,
    );
  };

  // Metrics computation from loaded dataset
  const metrics = useMemo(() => {
    const items = data?.items ?? [];
    const totalOrders = data?.pagination.total ?? items.length;
    const totalRevenue = items.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingCount = items.filter((o) => o.status === 'pending').length;
    const confirmedCount = items.filter((o) => o.status === 'confirmed').length;
    const shippedCount = items.filter((o) => o.status === 'shipped').length;
    const deliveredCount = items.filter((o) => o.status === 'delivered').length;

    return {
      totalOrders,
      totalRevenue,
      pendingCount,
      confirmedCount,
      shippedCount,
      deliveredCount,
    };
  }, [data]);

  // Client-side search and status filter
  const filtered = useMemo(() => {
    return (data?.items ?? []).filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        o.orderNumber.toLowerCase().includes(query) ||
        (o.shippingAddress?.fullName && o.shippingAddress.fullName.toLowerCase().includes(query)) ||
        o.items.some((i) => i.name.toLowerCase().includes(query));
      return matchStatus && matchSearch;
    });
  }, [data, statusFilter, search]);

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <TopHeader
        title="Orders"
        onRefresh={() => load(page, true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Shopify-style KPI Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-surface-container border border-border flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Orders
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {loading ? '—' : metrics.totalOrders}
                </span>
                <ShoppingBag size={16} className="text-muted-foreground/60" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-container border border-border flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Volume / Revenue
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {loading ? '—' : formatCurrency(metrics.totalRevenue)}
                </span>
                <DollarSign size={16} className="text-primary/70" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-container border border-border flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Unfulfilled / Pending
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-amber-400 tabular-nums">
                  {loading ? '—' : metrics.pendingCount}
                </span>
                <Clock size={16} className="text-amber-400/70" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-container border border-border flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Fulfilled / Delivered
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {loading ? '—' : metrics.deliveredCount}
                </span>
                <CheckCircle2 size={16} className="text-primary" />
              </div>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="rounded-lg border border-border bg-surface-lowest overflow-hidden shadow-sm">
            
            {/* Shopify-style Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-border bg-surface-container/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Segmented Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {(['all', ...ALL_STATUSES] as const).map((s) => {
                  const isActive = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                      )}
                    >
                      {s === 'all' ? 'All Orders' : STATUS_CONFIG[s].label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by order #, customer, item…"
                  className="w-full h-8 pl-8 pr-8 rounded-md border border-border bg-surface-high text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="m-4 flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => load(page)}
                  className="font-semibold underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-container/30 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 hidden md:table-cell">Channel</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Items</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-3.5"><div className="h-3.5 w-24 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-28 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 w-16 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-3.5 w-14 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-20 bg-surface-high rounded" /></td>
                        <td className="px-5 py-3.5 text-right"><div className="h-3.5 w-16 bg-surface-high rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <Package size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {search || statusFilter !== 'all' ? 'No matching orders found' : 'No orders yet'}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          {search || statusFilter !== 'all'
                            ? 'Adjust or clear your search and filters to view more orders.'
                            : 'When shoppers place orders through your storefront or ORA AI sales consultations, they will appear here automatically.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order) => {
                      const customerName =
                        order.shippingAddress?.fullName ||
                        (order.shippingAddress?.city
                          ? `Customer in ${order.shippingAddress.city}`
                          : 'Storefront Guest');

                      return (
                        <tr
                          key={order._id}
                          onClick={() => setSelectedOrderId(order._id)}
                          className="hover:bg-surface-container/70 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3.5 font-semibold text-foreground group-hover:text-primary transition-colors">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-foreground truncate max-w-[160px]">
                            {customerName}
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <SourceBadge source={order.source} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && data && totalPages > 1 && (
              <div className="p-4 border-t border-border bg-surface-container/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground tabular-nums">
                  Showing page {page} of {totalPages} ({data.pagination.total} total orders)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-8 px-2.5 rounded border border-border bg-surface-high hover:bg-surface-bright disabled:opacity-40 disabled:pointer-events-none text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 px-2.5 rounded border border-border bg-surface-high hover:bg-surface-bright disabled:opacity-40 disabled:pointer-events-none text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
