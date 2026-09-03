import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FloatingOrbWidget } from "@/components/marketing/floating-orb-widget"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  metadataBase: new URL("https://tryora.live"),
  title: {
    default: "ORA | The AI Sales Brain for Every Merchant",
    template: "%s | ORA",
  },
  description:
    "ORA automates your e-commerce sales conversations, recovers abandoned carts, and turns every shopper interaction into revenue 24/7.",
  applicationName: "ORA",
  authors: [{ name: "ORA Team", url: "https://tryora.live" }],
  generator: "Next.js",
  keywords: [
    "AI sales agent",
    "voice commerce",
    "cart recovery",
    "e-commerce automation",
    "Shopify voice AI",
    "WooCommerce sales agent",
    "bKash automated checkout",
    "conversational commerce",
    "real-time AI voice",
    "ORA",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
}

/** Body: clean, readable, industry-standard for product UIs */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

/** Headings: geometric/techy, great for AI/SaaS brands */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

/** Mono: badges, code snippets, status chips */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

/** Editorial Serif: headlines, metrics, luxury SaaS accents */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        inter.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable,
        newsreader.variable,
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Suspense fallback={null}>
            <FloatingOrbWidget />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
