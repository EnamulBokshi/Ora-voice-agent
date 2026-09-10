import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "ORA Voice AI",
  description: "ORA voice sales agent for your Shopify store.",
}

/**
 * App Bridge must load from Shopify's CDN in the document head, before any app
 * code runs — it is what mints the session tokens `lib/session-client.ts`
 * exchanges, and Shopify requires the script tag for an embedded app to be
 * accepted for listing.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
