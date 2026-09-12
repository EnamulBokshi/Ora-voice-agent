import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  /**
   * `shopify app dev` serves the embedded app through a Cloudflare tunnel, so
   * every dev request arrives cross-origin. Without this, Next refuses
   * cross-origin access to anything under `/_next` — the HMR websocket and the
   * client chunks alike — and the browser is left with server-rendered HTML
   * that never hydrates. React never mounts, so the embedded app sits on its
   * loading state and the only clue is a console warning naming this option.
   *
   * Dev-only; ignored in a production build. Carried over from the retired
   * packages/shopify-app, whose Next config owned this before the embedded app
   * moved into this client.
   */
  allowedDevOrigins: ["*.trycloudflare.com", "*.tryora.live"],
  async headers() {
    return [
      {
        source: "/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, Accept" },
        ],
      },
      // ── Widget cache policy ───────────────────────────────────────────────
      // Previously nothing set Cache-Control here at all, so how long a stale
      // widget survived was decided by browser heuristics and whatever CDN sat in
      // front — which is why fixed bugs came back intermittently for returning
      // visitors. The rules below make it deterministic.

      // Content-hashed bundles: the filename changes whenever the bytes change,
      // so these can be cached forever. This is what makes updates instant.
      {
        source: "/widget/v2/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // The manifest and the unhashed fallback keep their URLs across releases, so
      // they must be revalidated every time or they would pin visitors to old code.
      {
        source: "/widget/latest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/widget/widget.latest.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      // Loader entrypoints are the URLs merchants paste into their storefront, so
      // they can never be hashed. Short cache: long enough to avoid a fetch on every
      // page view, short enough that a loader fix rolls out the same day.
      {
        source: "/widget/loader.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
      {
        source: "/widget/ora-widget.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
      {
        // The dashboard, admin console, and marketing site must never be
        // framable. The widget, audio-processor, and /shopify paths are excluded:
        // /shopify is framed by Shopify Admin and governed by nginx frame-ancestors.
        //
        // `shopify$` matters as much as `shopify/`. The app URL Shopify Admin
        // frames is exactly `/shopify`, with no trailing slash, so excluding
        // only the prefixed form leaves the entry page with
        // `X-Frame-Options: DENY` and a blank iframe in Admin with nothing in
        // the logs. Verify with:
        //   curl -sI http://127.0.0.1:<port>/shopify | grep -i frame
        source: "/:path((?!widget/|audio-processors/|shopify$|shopify/).*)",
        missing: [
          { type: "query", key: "shop" },
          { type: "query", key: "embedded" },
        ],
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/audio-processors/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, Accept" },
          // The AudioWorklet processor is loaded by URL and its filename is not
          // content-hashed, so it needs revalidation for the same reason latest.json
          // does: without this, a browser holding an older copy keeps using it and a
          // fix to the capture path never reaches that visitor.
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "*.tryora.live"],
    },
  },
  async rewrites() {
    const backendUrl = process.env.NESTJS_BACKEND_URL || 'http://127.0.0.1:5000';
    return [
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;

