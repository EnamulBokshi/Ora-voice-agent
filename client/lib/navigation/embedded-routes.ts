/**
 * Route facts shared by the client components and by `proxy.ts`.
 *
 * Kept free of React and of `next/navigation` so the edge proxy can import it.
 */

/** Where the embedded Shopify app is mounted in the client route tree. */
export const SHOPIFY_BASE_PATH = '/shopify';

/**
 * The top-level tab the embedded app opens for anything that needs a
 * microphone. Shopify Admin frames the app without `allow="microphone"`, so
 * voice training and voice testing can only run outside the iframe.
 *
 * Deliberately outside `app/shopify/`: that layout loads the App Bridge
 * script, which has no admin frame to talk to in a top-level tab. The tab is
 * still a Shopify session — it arrives with an `id_token` and never has a web
 * login — which `lib/session` relies on this constant to recognise.
 */
export const STANDALONE_VOICE_PATH = '/voice-test';

/**
 * Top-level routes that exist under `app/shopify/`.
 *
 * Two dashboard-reachable routes are deliberately left out, so they resolve to
 * nothing and the affordance is hidden rather than framed inside Shopify
 * Admin: the marketing `/docs`, which is marketing chrome and not app surface,
 * and `/setup`, whose onboarding guide the embedded app replaces with the
 * configuration hub at `/shopify/agent`. Add a segment here only once
 * `app/shopify/<segment>/page.tsx` exists.
 */
export const EMBEDDED_SEGMENTS = new Set([
  'agent',
  'billing',
  'conversations',
  'customers',
  'live-desk',
  'profile',
  'usage',
]);

/** The first path segment of an internal href, ignoring query and hash. */
export function firstSegment(href: string): string {
  return href.replace(/[?#].*$/, '').split('/').filter(Boolean)[0] || '';
}

/**
 * Rewrites a dashboard-absolute href for the tree it is rendered in.
 *
 * Returns null when the embedded app has no equivalent route, which is the
 * caller's signal to hide the link rather than point it somewhere that 404s.
 *
 * Components under `components/` are shared by `app/(dashboard)` and
 * `app/shopify`, so a hardcoded `/setup` renders inside the Shopify iframe
 * too. There it leaves the `/shopify` namespace, `proxy.ts` finds no session
 * cookie, and the merchant is bounced to the web sign-up form inside Shopify
 * Admin.
 */
export function resolveAppPath(href: string, basePath: string): string | null {
  // External, protocol-relative, and anchor links are not ours to rewrite.
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (!basePath) return href;
  if (href.startsWith(`${basePath}/`) || href === basePath) return href;

  // `/dashboard` is the embedded app's own home.
  const segment = firstSegment(href);
  if (segment === 'dashboard') {
    return basePath + href.slice('/dashboard'.length);
  }

  return EMBEDDED_SEGMENTS.has(segment) ? basePath + href : null;
}
