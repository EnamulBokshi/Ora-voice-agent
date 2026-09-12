'use client';

import { usePathname } from 'next/navigation';

import {
  EMBEDDED_SEGMENTS,
  SHOPIFY_BASE_PATH,
  resolveAppPath,
} from './embedded-routes';

export { EMBEDDED_SEGMENTS, SHOPIFY_BASE_PATH, resolveAppPath };

/** `/shopify` inside the embedded app, an empty string in the dashboard. */
export function useAppBasePath(): string {
  const pathname = usePathname();
  return pathname === SHOPIFY_BASE_PATH ||
    pathname?.startsWith(`${SHOPIFY_BASE_PATH}/`)
    ? SHOPIFY_BASE_PATH
    : '';
}

/** True while rendering inside the embedded Shopify app. */
export function useIsEmbedded(): boolean {
  return useAppBasePath() === SHOPIFY_BASE_PATH;
}

/**
 * Resolver for hrefs and for `router.push` targets. Returns null when the
 * destination does not exist in the current tree.
 */
export function useAppPath(): (href: string) => string | null {
  const basePath = useAppBasePath();
  return (href: string) => resolveAppPath(href, basePath);
}
