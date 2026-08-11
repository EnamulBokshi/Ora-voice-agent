'use client';

import {
  Search,
  CheckCircle2,
  AlertTriangle,
  PackagePlus,
  RefreshCw,
  Edit3,
  Trash2,
  Zap,
} from 'lucide-react';
import { ProductItem } from './catalog-types';

interface CatalogTableProps {
  products: ProductItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddProduct: () => void;
  onBatchSync: () => void;
  onEditProduct: (product: ProductItem) => void;
  onDeleteProduct: (id: string) => void;
  onVerifyLive: (id: string) => void;
}

export function CatalogTable({
  products,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  onAddProduct,
  onBatchSync,
  onEditProduct,
  onDeleteProduct,
  onVerifyLive,
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
            placeholder="Search catalog by name, SKU, or category..."
            className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBatchSync}
            className="px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 text-foreground hover:bg-[var(--surface-high)] transition-all"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <RefreshCw size={14} /> Batch Feed Sync
          </button>

          <button
            onClick={onAddProduct}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
            style={{
              background: 'var(--logo-gradient)',
              boxShadow: 'var(--logo-glow)',
            }}
          >
            <PackagePlus size={14} /> Add Product
          </button>
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
          {products.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground mb-1">No Products Found</p>
              <p className="text-xs">Click &quot;Add Product&quot; or &quot;Batch Feed Sync&quot; to populate your catalog.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3.5 px-4">PRODUCT</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">PRICE</th>
                  <th className="py-3.5 px-4">INVENTORY</th>
                  <th className="py-3.5 px-4">ORA STATUS</th>
                  <th className="py-3.5 px-4">SOURCE TIER</th>
                  <th className="py-3.5 px-4">AGENT SALES</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
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
                            className="w-9 h-9 rounded-lg object-cover border shrink-0 bg-background"
                            style={{ borderColor: 'var(--glass-border)' }}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground">{item.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{item.sku}</td>
                      <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--primary)' }}>
                        {item.price}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.inventoryCount} in stock
                      </td>
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
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Verify Live Price & Stock"
                            onClick={() => onVerifyLive(item.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--surface-high)] transition-colors"
                          >
                            <Zap size={14} />
                          </button>
                          <button
                            title="Edit Product"
                            onClick={() => onEditProduct(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            title="Delete Product"
                            onClick={() => onDeleteProduct(item.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-[var(--surface-high)] transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
