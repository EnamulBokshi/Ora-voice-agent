'use client';

import { ProductCatalogTable } from '../products/product-catalog-table';

interface ProductDetailsFeedTabProps {
  onFed?: () => void;
}

export function ProductDetailsFeedTab({ onFed }: ProductDetailsFeedTabProps) {
  return (
    <div className="space-y-4">
      <ProductCatalogTable onFed={onFed} />
    </div>
  );
}
