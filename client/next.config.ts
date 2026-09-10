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
        // framable. The Shopify embedded app is the only ORA surface that is,
        // and it is a separate package (packages/shopify-app) with its own
        // frame-ancestors policy precisely so this rule can stay absolute.
        //
        // The widget and audio-processor paths are deliberately excluded: they
        // are loaded cross-origin by merchant storefronts by design.
        source: "/:path((?!widget/|audio-processors/).*)",
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

