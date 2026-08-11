import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { CatalogClient } from '@/components/catalog/catalog-client';

export const metadata: Metadata = {
  title: 'Catalog & Products — ORA Command Center',
  description:
    'Manage, inspect, and verify indexed products and ORA AI sales performance across your store catalog.',
};

export default function CatalogPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="catalog" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Catalog & Products" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <CatalogClient />
        </main>
      </div>
    </div>
  );
}
