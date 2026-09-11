import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
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
}

export default nextConfig

