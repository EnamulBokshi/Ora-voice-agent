import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FloatingOrbWidget } from "@/components/marketing/floating-orb-widget"
import { cn } from "@/lib/utils"

/** Body — clean, readable, industry-standard for product UIs */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

/** Headings — geometric/techy, great for AI/SaaS brands */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

/** Mono — badges, code snippets, status chips */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
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

