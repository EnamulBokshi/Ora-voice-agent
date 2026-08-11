'use client';

import { Search, Filter, ArrowUpDown, CheckCircle2, AlertTriangle, LayoutList, LayoutGrid } from 'lucide-react';
import { ProductItem } from './catalog-types';

interface CatalogTableProps {
  products: ProductItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function CatalogTable({
  products,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: CatalogTableProps) {
  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-80 max-w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products, SKUs..."
            className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 text-foreground hover:bg-[var(--surface-high)] transition-all"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <Filter size={14} /> Filter
          </button>
          <button
            className="px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 text-foreground hover:bg-[var(--surface-high)] transition-all"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <ArrowUpDown size={14} /> Sort
          </button>

          {/* Grid/List View Switch */}
          <div
            className="flex items-center p-1 rounded-xl border text-xs gap-1"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <button className="p-1 rounded-lg bg-[var(--surface-high)] text-[var(--primary)] shadow-sm">
              <LayoutList size={14} />
            </button>
            <button className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="rounded-2xl border overflow-hidden flex-1 flex flex-col backdrop-blur-md"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3.5 px-4">PRODUCT</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">PRICE</th>
                <th className="py-3.5 px-4">INVENTORY</th>
                <th className="py-3.5 px-4">ORA STATUS</th>
                <th className="py-3.5 px-4">SOURCE</th>
                <th className="py-3.5 px-4">ORA SALES</th>
                <th className="py-3.5 px-4">CONVERSION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)] text-foreground">
              {products.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className="hover:bg-[var(--surface-high)]/50 transition-colors cursor-pointer"
                    style={{
                      background: isSelected
                        ? 'color-mix(in srgb, var(--primary) 10%, var(--surface-container))'
                        : 'transparent',
                    }}
                  >
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover border shrink-0"
                          style={{ borderColor: 'var(--glass-border)' }}
                        />
                        <span className="font-semibold text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">{item.sku}</td>
                    <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--primary)' }}>
                      {item.price}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.inventoryCount} in stock</td>
                    <td className="py-3 px-4">
                      {item.oraStatus === 'verified' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border"
                          style={{
                            background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                            color: 'var(--ora-success)',
                            borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                          }}
                        >
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border"
                          style={{
                            background: 'color-mix(in srgb, var(--ora-warning) 12%, transparent)',
                            color: 'var(--ora-warning)',
                            borderColor: 'color-mix(in srgb, var(--ora-warning) 25%, transparent)',
                          }}
                        >
                          <AlertTriangle size={12} /> Needs Attention
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{item.source}</td>
                    <td className="py-3 px-4 font-medium">{item.oraSalesOrders} orders</td>
                    <td className="py-3 px-4 font-bold" style={{ color: 'var(--secondary)' }}>
                      {item.conversionRate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
