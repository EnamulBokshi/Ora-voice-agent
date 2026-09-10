'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Customer } from '@/types/customer';
import { CustomerDetailPanel } from './customer-detail-panel';

interface CustomersTableProps {
  customers: Customer[];
  onReload: () => void;
}

export function CustomersTable({ customers, onReload }: CustomersTableProps) {
  const [search, setSearch] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('');

  // useState only reads its initial value once, so seeding this from customers[0]
  // meant the selection stayed empty (or stale) after onReload brought new rows in.
  // Default to the first customer whenever the current selection is no longer present.
  const selectionPresent = selectedId && customers.some((c) => c._id === selectedId);
  const effectiveSelectedId = selectionPresent ? selectedId : (customers[0]?._id ?? '');

  const filteredCustomers = customers.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedCustomer =
    customers.find((c) => c._id === effectiveSelectedId) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
      {/* Left: Customer list */}
      <div className="lg:col-span-7 rounded-md border border-border bg-surface-container overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-surface-low">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full bg-surface-high border border-border rounded-md py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="flex-1 p-8 text-center text-[13px] text-muted-foreground">
            {customers.length === 0
              ? 'No customers yet. Shoppers who talk to the ORA widget will appear here.'
              : 'No customers match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[11px] tracking-wider font-medium">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredCustomers.map((c) => {
                  const isSelected = c._id === effectiveSelectedId;
                  return (
                    <tr
                      key={c._id}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => setSelectedId(c._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(c._id);
                        }
                      }}
                      className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-surface-high'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-surface-high text-foreground shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <p className="font-medium text-foreground">{c.name}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground text-[12px]">
                        {c.email ?? c.phone ?? '—'}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-foreground">
                        {c.pastOrderIds?.length ?? 0}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground text-[12px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right: Customer detail */}
      <div className="lg:col-span-5 flex flex-col h-full">
        {selectedCustomer ? (
          <CustomerDetailPanel customer={selectedCustomer} onReload={onReload} />
        ) : (
          <div className="rounded-md border border-border bg-surface-container p-8 text-center text-[13px] text-muted-foreground">
            Select a customer to view details.
          </div>
        )}
      </div>
    </div>
  );
}
