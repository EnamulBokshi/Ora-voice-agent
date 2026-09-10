"use client"

import { useCallback, useEffect, useState } from "react"
import {
  clearOraSession,
  collectDiagnostics,
  getOraSession,
  OraSessionError,
  type OraSession,
} from "@/lib/session-client"

type Diagnostics = ReturnType<typeof collectDiagnostics>

/**
 * Exercises the session bridge on mount and reports the result.
 *
 * On a first load this is what triggers the install on the server: token
 * exchange, tenant provisioning, webhook registration, and the catalog sync
 * enqueue all happen behind `POST /shopify/session`, so `installed: true`
 * distinguishes a first run from an ordinary page load.
 *
 * Every failure path renders something. An embedded app that cannot get a token
 * used to sit on "Connecting…" forever, because `idToken()` neither resolves
 * nor rejects when App Bridge cannot reach the parent frame — so the state
 * machine here is explicit and the diagnostics are on screen rather than only
 * in the console.
 */
export function InstallStatus() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [session, setSession] = useState<OraSession | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  )
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(null)

  const connect = useCallback(async (force = false) => {
    setState("loading")
    setError(null)
    if (force) clearOraSession()

    try {
      const result = await getOraSession(force)
      setSession(result)
      setState("ready")
    } catch (err) {
      const code =
        err instanceof OraSessionError ? err.code : "UNEXPECTED_ERROR"
      setError({ code, message: (err as Error).message })
      setDiagnostics(collectDiagnostics())
      setState("error")
      console.error("[InstallStatus] Session failed:", code, err)
    }
  }, [])

  useEffect(() => {
    // Tells the watchdog in app/layout.tsx that React reached this point, so it
    // stays quiet. Without a signal it cannot tell a slow session exchange from
    // a client bundle that never mounted.
    const w = window as unknown as { __ORA__?: { mounted: boolean } }
    if (w.__ORA__) w.__ORA__.mounted = true

    void connect()
  }, [connect])

  if (state === "loading") {
    return (
      <div style={{ color: "#6B7280" }}>
        Connecting to ORA…
        <div style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}>
          This should take a moment. If it does not finish, the reason will
          appear here.
        </div>
      </div>
    )
  }

  if (state === "error" && error) {
    return (
      <div role="alert">
        <p style={{ color: "#DC2626", fontWeight: 600, marginBottom: "0.25rem" }}>
          Could not establish an ORA session
        </p>
        <p style={{ marginTop: 0 }}>{error.message}</p>
        <p style={{ color: "#6B7280", fontSize: "0.8125rem" }}>
          Code: <code>{error.code}</code>
        </p>

        <button
          onClick={() => void connect(true)}
          style={{
            padding: "0.5rem 0.875rem",
            border: "1px solid #E5E7EB",
            borderRadius: "0.375rem",
            background: "#111111",
            color: "#FAFAFA",
            cursor: "pointer",
          }}
        >
          Try again
        </button>

        {diagnostics && (
          <details style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", color: "#6B7280" }}>
              Diagnostics
            </summary>
            <pre
              style={{
                background: "#F7F8F7",
                border: "1px solid #E5E7EB",
                borderRadius: "0.375rem",
                padding: "0.75rem",
                fontSize: "0.75rem",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        )}
      </div>
    )
  }

  if (!session) return null

  return (
    <div>
      <p>
        <strong>{session.business.name}</strong> is connected
        {session.installed ? " — setting up your catalog now." : "."}
      </p>
      <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>
        Signed in as {session.user.email} ({session.user.role})
      </p>
    </div>
  )
}
