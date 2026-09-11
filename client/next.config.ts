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
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "*.tryora.live"],
    },
  },
};

export default nextConfig;

