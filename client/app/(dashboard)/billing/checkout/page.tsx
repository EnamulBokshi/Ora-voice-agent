import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutClient } from '@/components/billing/checkout-client';

export const metadata: Metadata = {
  title: 'Checkout | ORA Command Center',
  description: 'Choose a payment method and complete your ORA subscription.',
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutClient />
    </Suspense>
  );
}
