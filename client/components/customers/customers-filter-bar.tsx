'use client';

import { Search, X, ArrowUpDown } from 'lucide-react';
import { Customer } from '@/types/customer';

export type CustomerSegment = 'all' | 'contactable' | 'profiled' | 'anonymous';
export type CustomerSort = 'recent' | 'newest' | 'name';

interface CustomersFilterBarProps {
  customers: Customer[];
  search: string;
  onSearchChange: (val: string) => void;
  activeSegment: CustomerSegment;
  onSegmentChange: (seg: CustomerSegment) => void;
  sortBy: CustomerSort;
  onSortChange: (sort: CustomerSort) => void;
  totalFiltered: number;
}

export function CustomersFilterBar({
  customers,
  search,
  onSearchChange,
  activeSegment,
  onSegmentChange,
  sortBy,
  onSortChange,
  totalFiltered,
}: CustomersFilterBarProps) {
  const counts = {
    all: customers.length,
    contactable: customers.filter(
      (c) => Boolean(c.email && c.email.trim()) || Boolean(c.phone && c.phone.trim()),
    ).length,
    profiled: customers.filter(
      (c) => c.extractedPreferences && Object.keys(c.extractedPreferences).length > 0,
    ).length,
    anonymous: customers.filter(
      (c) => c.isAnonymous || (!c.email && !c.phone),
    ).length,
  };

  const segments: { key: CustomerSegment; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'contactable', label: 'Verified Contacts', count: counts.contactable },
    { key: 'profiled', label: 'With Preferences', count: counts.profiled },
    { key: 'anonymous', label: 'Guests', count: counts.anonymous },
  ];

  const hasActiveFilters = search.trim().length > 0 || activeSegment !== 'all';

  return (
    <div className="space-y-4">
      {/* Top row: Filter segments + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Segment pill buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {segments.map((seg) => {
            const isActive = activeSegment === seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSegmentChange(seg.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/35 font-semibold'
                    : 'bg-surface-high/30 text-muted-foreground border-border/50 hover:text-foreground hover:bg-surface-high/60'
                }`}
              >
                <span>{seg.label}</span>
                <span
                  className={`text-[10.5px] tabular-nums px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'bg-surface-high/60 text-muted-foreground'
                  }`}
                >
                  {seg.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown size={12} className="text-muted-foreground" />
            <span className="hidden md:inline text-[11.5px]">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as CustomerSort)}
            className="bg-surface-high/30 border border-border/60 text-foreground rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/70 transition-colors cursor-pointer"
            aria-label="Sort customers"
          >
            <option value="recent">Recently Active</option>
            <option value="newest">Newest Added</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Search input row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customers by name, email, phone, or preference notes…"
            className="w-full h-10 bg-surface-high/30 border border-border/60 rounded-md py-2 pl-9 pr-8 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-surface-high"
              aria-label="Clear search input"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter status */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 tabular-nums">
            <span>
              Showing <span className="text-primary font-semibold">{totalFiltered}</span> of{' '}
              <span>{customers.length}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onSegmentChange('all');
              }}
              className="text-primary hover:underline text-xs cursor-pointer ml-1 underline underline-offset-2 font-medium"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
