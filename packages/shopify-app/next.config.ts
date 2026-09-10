import type { NextConfig } from "next"

/**
 * Served at `https<host>/shopify` behind the same nginx as the ORA dashboard
 * and API. `basePath` makes every asset and route resolve under that prefix, so
 * nginx needs one `location /shopify` block and no rewriting.
 *
 * Serving it on the API's own origin is deliberate: the embedded app's calls to
 * `/api/v1/...` are then same-origin, exactly like the dashboard's, so no CORS
 * or preflight is involved at all.
 *
 * The framing policy is NOT set here. nginx owns it, for two reasons. It has to
 * override the server-level `X-Frame-Options: SAMEORIGIN` that would otherwise
 * stop Shopify Admin framing this app, and a browser intersects multiple
 * `Content-Security-Policy` headers — two sources emitting `frame-ancestors`
 * would silently reduce to whatever both allow. One owner, one header.
 * See `deploy/nginx/ora.conf`.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/shopify",
  // The app is framed cross-site by Shopify Admin, where a Next.js dev
  // indicator overlay cannot be interacted with anyway.
  devIndicators: false,
}

export default nextConfig
