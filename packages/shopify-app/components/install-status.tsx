"use client"

import { useEffect, useState } from "react"
import { getOraSession, type OraSession } from "@/lib/session-client"

/**
 * Exercises the session bridge on mount and reports the result.
 *
 * On a first load this is what triggers the install on the server: token
 * exchange, tenant provisioning, webhook registration, and the catalog sync
 * enqueue all happen behind `POST /shopify/session`, so `installed: true`
 * distinguishes a first run from an ordinary page load.
 */
export function InstallStatus() {
  const [session, setSession] = useState<OraSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getOraSession()
      .then((result) => {
        if (!cancelled) setSession(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div role="alert" style={{ color: "#DC2626" }}>
        Could not establish an ORA session: {error}
      </div>
    )
  }

  if (!session) {
    return <div style={{ color: "#6B7280" }}>Connecting to ORA…</div>
  }

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
