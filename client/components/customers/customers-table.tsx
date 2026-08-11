'use client';

import { useState } from 'react';
import { Search, ChevronRight, User } from 'lucide-react';
import { CustomerRecord, CustomerSegment } from './customers-types';
import { CustomerDetailPanel } from './customer-detail-panel';

interface CustomersTableProps {
  customers: CustomerRecord[];
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment>('All');
  const [search, setSearch] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('cust-1');

  const filteredCustomers = customers.filter((c) => {
    if (selectedSegment !== 'All' && c.segment !== selectedSegment) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.segment.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedCustomer =
    customers.find((c) => c.id === selectedId) || customers[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
      {/* Left Column: Customer List (7 cols) */}
      <div
        className="lg:col-span-7 rounded-2xl border flex flex-col overflow-hidden backdrop-blur-md"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Search Toolbar */}
        <div
          className="p-4 border-b flex items-center justify-between gap-4"
          style={{
            background: 'var(--surface-container)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="relative w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers, conversations, orders..."
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>
        </div>

        {/* Segment Filter Pills */}
        <div
          className="flex items-center gap-1.5 p-3 overflow-x-auto border-b no-scrollbar"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {(['All', 'New', 'Returning', 'High value', 'High intent', 'At risk'] as const).map((seg) => {
            const isActive = selectedSegment === seg;

            return (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg as CustomerSegment)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'shadow-sm'
                    : 'hover:text-foreground hover:bg-[var(--surface-high)]'
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
                {seg}
              </button>
            );
          })}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">CUSTOMER</th>
                <th className="py-3 px-4">ACTIVITY</th>
                <th className="py-3 px-4 text-right">ORDERS</th>
                <th className="py-3 px-4 text-right">TOTAL SPENT</th>
                <th className="py-3 px-4">SEGMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)] text-foreground">
              {filteredCustomers.map((c) => {
                const isSelected = c.id === selectedId;

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="hover:bg-[var(--surface-high)]/60 cursor-pointer transition-colors"
                    style={
                      isSelected
                        ? {
                            background: 'color-mix(in srgb, var(--primary) 10%, var(--surface-container))',
                          }
                        : {}
                    }
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0"
                          style={{
                            background: 'var(--surface-high)',
                            borderColor: 'var(--glass-border)',
                            color: 'var(--primary)',
                          }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {c.conversationsCount} conversations
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {c.ordersCount}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold" style={{ color: 'var(--primary)' }}>
                      ${c.totalSpent.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
                        style={{
                          background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                          color: 'var(--primary)',
                        }}
                      >
                        {c.segment}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Customer Intelligence Inspector (5 cols) */}
      <div className="lg:col-span-5 flex flex-col h-full">
        <CustomerDetailPanel customer={selectedCustomer} />
      </div>
    </div>
  );
}
