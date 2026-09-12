'use client';

import React from 'react';
import Link from 'next/link';
import { useAppPath } from '@/lib/navigation/app-path';

type AppLinkProps = React.ComponentProps<typeof Link> & {
  /** Rendered instead of the link when the route has no embedded equivalent. */
  fallback?: React.ReactNode;
};

/**
 * `next/link` that keeps a shared component inside its own route tree.
 *
 * Renders `fallback` (nothing by default) when the destination does not exist
 * in the embedded Shopify app, because a link out of `/shopify` redirects the
 * iframe to the web sign-up page.
 */
export function AppLink({ href, fallback = null, ...rest }: AppLinkProps) {
  const resolve = useAppPath();
  const target = typeof href === 'string' ? resolve(href) : href;

  if (!target) return <>{fallback}</>;

  return <Link href={target} {...rest} />;
}
