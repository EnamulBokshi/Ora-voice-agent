import { InstallStatus } from "@/components/install-status"

/**
 * Server component by convention (see client/AGENTS.md: no "use client" in a
 * page). Everything that touches App Bridge is a client component, because App
 * Bridge only exists in the browser.
 */
export default function ShopifyAppHome() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ORA Voice AI</h1>
      <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>
        Your store is connected to ORA. Catalog changes sync automatically.
      </p>
      <InstallStatus />
    </main>
  )
}
