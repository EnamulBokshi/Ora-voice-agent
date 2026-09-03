import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Orders | ORA Command Center',
};

export default function OrdersPage() {
  redirect('/live-desk');
}
