'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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

/**
 * `useRouter` whose `push` and `replace` resolve their target for the current
 * tree, so a shared component can keep pushing dashboard-absolute paths.
 *
 * A destination the embedded app does not have is dropped rather than
 * navigated to: leaving `/shopify` inside the iframe ends at the web sign-in
 * page, which is worse than the click doing nothing.
 */
export function useAppRouter() {
  const router = useRouter();
  const resolve = useAppPath();

  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        const target = resolve(href);
        if (target) router.push(target, options);
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        const target = resolve(href);
        if (target) router.replace(target, options);
      },
    }),
    [router, resolve],
  );
}
