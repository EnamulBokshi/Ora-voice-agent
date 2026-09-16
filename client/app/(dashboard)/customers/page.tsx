import { Metadata } from 'next';
import { Suspense } from 'react';
import { CustomersClient } from '@/components/customers/customers-client';

export const metadata: Metadata = {
  title: 'Customers | ORA Dashboard',
  description: 'View customer directory and storefront contacts.',
};

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersClient />
    </Suspense>
  );
}
