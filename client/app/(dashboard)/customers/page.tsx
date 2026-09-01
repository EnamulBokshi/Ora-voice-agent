import type { Metadata } from 'next';
import { CustomersClient } from '@/components/customers/customers-client';

export const metadata: Metadata = {
  title: 'Customers — ORA Command Center',
  description:
    'Understand the customers ORA is helping, nurturing, and converting.',
};

export default function CustomersPage() {
  return <CustomersClient />;
}
