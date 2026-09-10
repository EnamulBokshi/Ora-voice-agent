/**
 * Bridges Shopify App Bridge session tokens to ORA sessions.
 *
 * Two token lifetimes are in play. A Shopify App Bridge session token lives
 * about a minute and is minted on demand by App Bridge. An ORA access token
 * lives 15 minutes and is what every ORA API expects. This module trades the
 * first for the second and keeps the result in memory only — the app is framed
 * cross-site by Shopify Admin, where cookies are unreliable or blocked, and a
 * token in `localStorage` would outlive the tab that earned it.
 */

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>
    }
  }
}

export interface OraSession {
  accessToken: string
  refreshToken: string
  business: {
    id: string
    name: string
    domain?: string
    publishableKey?: string | null
    shopifyShopDomain?: string | null
  }
  user: {
    id: string
    name: string
    email: string
    role: string
    emailVerified: boolean
  }
  installed: boolean
}

/** The ORA response envelope every endpoint is wrapped in. */
type OraEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; correlationId?: string } }

export class OraSessionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "OraSessionError"
  }
}

/**
 * Relative by default. The embedded app is served from the same origin as the
 * API (nginx routes `/shopify` here and `/api/` to the NestJS container), so a
 * relative base keeps every call same-origin — no CORS, no preflight, and
 * nothing to reconfigure when the domain changes.
 *
 * Only set NEXT_PUBLIC_ORA_API_URL to an absolute origin if the app is ever
 * split onto its own host, and then the API's CORS allowlist has to include it.
 */
const API_BASE = process.env.NEXT_PUBLIC_ORA_API_URL || "/api/v1"

let cachedSession: OraSession | null = null
let inFlight: Promise<OraSession> | null = null

/**
 * Unwraps the ORA envelope. `TransformInterceptor` wraps every successful
 * response as `{ success: true, data }`, and `AllExceptionsFilter` wraps every
 * failure as `{ success: false, error }`, so nothing here sees a bare payload.
 */
async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as OraEnvelope<T>

  if (!body || typeof body !== "object" || !("success" in body)) {
    throw new OraSessionError(
      "MALFORMED_RESPONSE",
      "The ORA API returned an unrecognized response shape.",
    )
  }

  if (!body.success) {
    throw new OraSessionError(body.error.code, body.error.message)
  }

  return body.data
}

async function requestSession(): Promise<OraSession> {
  if (!window.shopify?.idToken) {
    throw new OraSessionError(
      "APP_BRIDGE_UNAVAILABLE",
      "Shopify App Bridge is not loaded, so no session token can be minted.",
    )
  }

  const sessionToken = await window.shopify.idToken()

  const response = await fetch(`${API_BASE}/shopify/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
  })

  return unwrap<OraSession>(response)
}

/**
 * Returns a usable ORA session, reusing the cached one when present.
 *
 * Concurrent callers share one request: several components mounting at once
 * would otherwise each mint a session token and each hit the install path.
 */
export async function getOraSession(forceRefresh = false): Promise<OraSession> {
  if (!forceRefresh && cachedSession) return cachedSession
  if (inFlight) return inFlight

  inFlight = requestSession()
    .then((session) => {
      cachedSession = session
      return session
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/**
 * Calls an ORA endpoint with the current session, retrying once on 401 with a
 * freshly minted token. The retry covers the ordinary case of an ORA access
 * token expiring while the app sits open.
 */
export async function oraFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await getOraSession()

  const call = (token: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

  let response = await call(session.accessToken)

  if (response.status === 401) {
    const refreshed = await getOraSession(true)
    response = await call(refreshed.accessToken)
  }

  return unwrap<T>(response)
}

/** Drops the cached session. For sign-out and for tests. */
export function clearOraSession(): void {
  cachedSession = null
}
