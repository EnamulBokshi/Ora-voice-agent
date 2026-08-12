import type { Metadata } from 'next';
import { CatalogClient } from '@/components/catalog/catalog-client';

export const metadata: Metadata = {
  title: 'Catalog & Products — ORA Command Center',
  description:
    'Manage, inspect, and verify indexed products and ORA AI sales performance across your store catalog.',
};

export default function CatalogPage() {
  return <CatalogClient />;
}
