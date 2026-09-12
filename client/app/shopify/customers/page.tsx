import type { Metadata } from 'next';
import { CustomersClient } from '@/components/customers/customers-client';

export const metadata: Metadata = {
  title: 'Customers | Shopify',
  description: 'Understand the customers ORA is helping, nurturing, and converting.',
};

export default function ShopifyCustomersPage() {
  return <CustomersClient />;
}
