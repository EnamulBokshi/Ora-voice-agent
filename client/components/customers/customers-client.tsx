'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Users,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from '@/components/dashboard/top-header';
import { getCustomersApi } from '@/services/customers-service';
import type { Customer } from '@/types/customer';

function formatDate(iso?: string | Date | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatRelativeTime(iso?: string | Date | null) {
  if (!iso) return '—';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) return formatDate(iso);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  } catch {
    return '—';
  }
}

export function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'all' | 'verified' | 'guest'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getCustomersApi();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtering
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const isAnonymous = c.isAnonymous ?? (!c.email && !c.phone);

      if (segment === 'verified' && isAnonymous) return false;
      if (segment === 'guest' && !isAnonymous) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchExt = c.externalCustomerId?.toLowerCase().includes(q);

      return matchName || matchEmail || matchPhone || matchExt;
    });
  }, [customers, search, segment]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <TopHeader
        title="Customers"
        onRefresh={() => load(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

          {/* Table Container Card */}
          <div className="rounded-lg border border-border bg-surface-lowest overflow-hidden shadow-sm">
            
            {/* Filter / Search Toolbar */}
            <div className="p-4 border-b border-border bg-surface-container/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All Customers' },
                    { id: 'verified', label: 'Verified' },
                    { id: 'guest', label: 'Guests' },
                  ] as const
                ).map((s) => {
                  const isActive = segment === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSegment(s.id);
                        setPage(1);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                      )}
                    >
                      {s.label}
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by name, email, phone…"
                  className="w-full h-8 pl-8 pr-8 rounded-md border border-border bg-surface-high text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="m-4 flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => load()}
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
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 hidden md:table-cell">Account Type</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Preferences & Tags</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Last Active</th>
                    <th className="px-5 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-3.5"><div className="h-3.5 w-28 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 w-32 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 w-16 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-24 bg-surface-high rounded" /></td>
                        <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-3.5 w-16 bg-surface-high rounded" /></td>
                        <td className="px-5 py-3.5 text-right"><div className="h-3.5 w-16 bg-surface-high rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <Users size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {search || segment !== 'all' ? 'No matching customers found' : 'No customers recorded yet'}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          {search || segment !== 'all'
                            ? 'Try clearing your search query or switching segment filters.'
                            : 'Shoppers interacting with your store or ORA AI will automatically be listed here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((c) => {
                      const customerId = c._id || c.id || '';
                      const isAnonymous = c.isAnonymous ?? (!c.email && !c.phone);
                      const prefEntries = Object.entries(c.extractedPreferences || {});

                      return (
                        <tr
                          key={customerId}
                          className="hover:bg-surface-container/60 transition-colors"
                        >
                          {/* Name & Avatar */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface-high border border-border flex items-center justify-center font-semibold text-[11px] text-foreground flex-shrink-0 select-none">
                                {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate max-w-[180px]">
                                  {c.name || 'Anonymous Shopper'}
                                </div>
                                {c.externalCustomerId && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Shopify ID: {c.externalCustomerId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Details */}
                          <td className="px-4 py-3.5">
                            {c.email ? (
                              <div className="flex items-center gap-1.5 text-foreground group/copy">
                                <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                                <span className="font-mono text-[11.5px] truncate max-w-[160px]">
                                  {c.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, c.email!, `mail-${customerId}`)}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity p-0.5"
                                  title="Copy email"
                                >
                                  {copiedKey === `mail-${customerId}` ? (
                                    <Check size={11} className="text-primary" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            ) : c.phone ? (
                              <div className="flex items-center gap-1.5 text-foreground group/copy">
                                <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                                <span className="font-mono text-[11.5px] truncate max-w-[160px]">
                                  {c.phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, c.phone!, `phone-${customerId}`)}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity p-0.5"
                                  title="Copy phone"
                                >
                                  {copiedKey === `phone-${customerId}` ? (
                                    <Check size={11} className="text-primary" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-[11.5px]">—</span>
                            )}
                          </td>

                          {/* Account Type */}
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
                                !isAnonymous
                                  ? 'bg-primary/10 text-primary border-primary/20'
                                  : 'bg-surface-high text-muted-foreground border-border/50',
                              )}
                            >
                              {!isAnonymous ? 'Verified Customer' : 'Guest'}
                            </span>
                          </td>

                          {/* Preferences & Tags */}
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            {prefEntries.length === 0 ? (
                              <span className="text-muted-foreground/50 text-[11px]">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[240px]">
                                {prefEntries.slice(0, 2).map(([key, val]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] bg-surface-high border border-border/50 text-muted-foreground truncate max-w-[110px]"
                                    title={`${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`}
                                  >
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </span>
                                ))}
                                {prefEntries.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                                    +{prefEntries.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Last Active */}
                          <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                            {formatRelativeTime(c.lastActiveAt || c.updatedAt)}
                          </td>

                          {/* Created */}
                          <td className="px-5 py-3.5 text-right text-muted-foreground whitespace-nowrap">
                            {formatDate(c.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div className="p-4 border-t border-border bg-surface-container/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground tabular-nums">
                  Showing page {page} of {totalPages} ({filtered.length} customers)
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
    </div>
  );
}
