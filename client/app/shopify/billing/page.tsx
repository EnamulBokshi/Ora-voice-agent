import type { Metadata } from 'next';
import { ShopifyPlanGate } from '@/components/shopify/shopify-plan-gate';

export const metadata: Metadata = {
  title: 'Billing & Plans | Shopify',
  description: 'Manage your ORA voice sales plan through Shopify App Billing.',
};

export default function ShopifyBillingPage() {
  return <ShopifyPlanGate />;
}
