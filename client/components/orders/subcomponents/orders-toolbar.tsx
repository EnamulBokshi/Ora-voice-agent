'use client';

import { Search } from 'lucide-react';
import { OrderStatus } from '../orders-types';

interface OrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: 'all' | OrderStatus;
  onStatusChange: (status: 'all' | OrderStatus) => void;
}

export function OrdersToolbar({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
}: OrdersToolbarProps) {
  const statusOptions: Array<'all' | OrderStatus> = ['all', 'completed', 'processing', 'pending', 'refunded'];

  return (
    <div
      className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Search box */}
      <div className="relative w-full sm:w-72">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order ID, customer name..."
          className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
          style={{ borderColor: 'var(--glass-border)' }}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {statusOptions.map((st) => {
          const isActive = selectedStatus === st;
          return (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all border ${
                isActive ? 'shadow-sm' : 'hover:text-foreground hover:bg-[var(--surface-high)]'
              }`}
              style={
                isActive
                  ? {
                      background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                    }
                  : {
                      background: 'transparent',
                      borderColor: 'transparent',
                      color: 'var(--muted-foreground)',
                    }
              }
            >
              {st}
            </button>
          );
        })}
      </div>
    </div>
  );
}
