'use client';

import React from 'react';
import { useShopifySession } from '@/components/shopify/shopify-session-provider';
import { ShopifyPlanGate } from '@/components/shopify/shopify-plan-gate';
import { OverviewClient } from '@/components/overview/overview-client';

export default function ShopifyAppHomePage() {
  const { hasActivePlan } = useShopifySession();

  if (!hasActivePlan) {
    return <ShopifyPlanGate />;
  }

  return <OverviewClient />;
}
