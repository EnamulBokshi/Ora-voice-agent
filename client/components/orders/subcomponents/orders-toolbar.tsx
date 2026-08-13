'use client';

import { Search } from 'lucide-react';
import { Order } from '@/services/orders-service';

interface OrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: 'all' | Order['status'];
  onStatusChange: (status: 'all' | Order['status']) => void;
}

const statusOptions: Array<'all' | Order['status']> = [
  'all',
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'canceled',
];

export function OrdersToolbar({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
}: OrdersToolbarProps) {
  return (
    <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-low">
      <div className="relative w-full sm:w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order ID, product..."
          className="w-full bg-surface-high border border-border rounded-md py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {statusOptions.map((st) => {
          const isActive = selectedStatus === st;
          return (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-colors border ${
                isActive
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high'
              }`}
            >
              {st}
            </button>
          );
        })}
      </div>
    </div>
  );
}
