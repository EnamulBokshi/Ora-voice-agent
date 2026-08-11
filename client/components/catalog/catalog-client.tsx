'use client';

import { useState } from 'react';
import { MOCK_PRODUCTS } from './catalog-data';
import { CatalogMetrics } from './catalog-metrics';
import { CatalogTable } from './catalog-table';
import { CatalogDetailDrawer } from './catalog-detail-drawer';

export function CatalogClient() {
  const [selectedId, setSelectedId] = useState<string>('prod-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedProduct =
    MOCK_PRODUCTS.find((p) => p.id === selectedId) || MOCK_PRODUCTS[0];

  return (
    <div className="flex-1 flex gap-6 h-full w-full overflow-hidden p-6 lg:p-8">
      {/* Left Column: Metrics + Table */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Metrics Grid + Health Banner */}
        <CatalogMetrics />

        {/* Product Table with Toolbar */}
        <CatalogTable
          products={filteredProducts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
        />
      </div>

      {/* Right Column: Product Detail Drawer */}
      <CatalogDetailDrawer
        product={selectedProduct}
        onClose={() => {}}
      />
    </div>
  );
}
