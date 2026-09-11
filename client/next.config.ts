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
}

export default nextConfig

