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
      config?: { apiKey?: string; shop?: string }
    }
  }
}

/** How long to wait for App Bridge to appear on `window` before giving up. */
const APP_BRIDGE_READY_TIMEOUT_MS = 5000

/**
 * How long to wait for `idToken()` to settle.
 *
 * App Bridge mints a token by messaging the parent Shopify Admin frame. When
 * that handshake cannot complete — the app opened outside Shopify Admin, or the
 * `shopify-api-key` meta not matching the app Admin loaded — the returned
 * promise never settles and never rejects. Unbounded, that is an infinite
 * loading state with nothing in the console.
 */
const ID_TOKEN_TIMEOUT_MS = 8000

/** How long to wait for the ORA API before reporting it unreachable. */
const SESSION_REQUEST_TIMEOUT_MS = 15000

/** Rejects rather than hanging, so a stalled promise surfaces as an error. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  code: string,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new OraSessionError(code, message)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * Shopify Admin always loads this app in an iframe. Detecting a top-level load
 * separates "someone opened the URL directly" — where App Bridge can never work
 * — from a genuine failure inside Admin, and the two need different advice.
 */
export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.top !== window.self
  } catch {
    // A cross-origin parent throws on access, which itself means framed.
    return true
  }
}

/** What the app knows about its own environment, for the UI to display. */
export function collectDiagnostics() {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="shopify-api-key"]',
  )
  return {
    embedded: isEmbedded(),
    appBridgeLoaded: Boolean(window.shopify),
    idTokenAvailable: Boolean(window.shopify?.idToken),
    apiKeyMeta: meta?.content || null,
    shopParam: params.get("shop"),
    hostParam: params.get("host"),
    hasIdTokenParam: Boolean(params.get("id_token")),
    apiBase: API_BASE,
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

async function waitForAppBridge(
  timeoutMs = APP_BRIDGE_READY_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (window.shopify?.idToken) return true

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (window.shopify?.idToken) return true
  }
  return false
}

async function requestSession(): Promise<OraSession> {
  let sessionToken: string | null = null

  // 1. Shopify appends `id_token` on the initial embedded load, so this path
  //    needs no App Bridge handshake at all and is the fastest route in.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    sessionToken = params.get("id_token")
  }

  // 2. Otherwise ask App Bridge, which is only possible inside Shopify Admin.
  if (!sessionToken) {
    if (!isEmbedded()) {
      throw new OraSessionError(
        "NOT_EMBEDDED",
        "This page is open directly rather than inside Shopify Admin, where App Bridge cannot mint a session token. Open the app from your store's Apps menu.",
      )
    }

    const ready = await waitForAppBridge(APP_BRIDGE_READY_TIMEOUT_MS)
    if (!ready || !window.shopify?.idToken) {
      throw new OraSessionError(
        "APP_BRIDGE_UNAVAILABLE",
        "The Shopify App Bridge script did not load. Check that cdn.shopify.com is reachable and that the page has a shopify-api-key meta tag.",
      )
    }

    // Bounded: this promise never settles when the handshake fails.
    sessionToken = await withTimeout(
      window.shopify.idToken(),
      ID_TOKEN_TIMEOUT_MS,
      "APP_BRIDGE_TOKEN_TIMEOUT",
      "App Bridge did not return a session token. The usual cause is the shopify-api-key meta tag not matching the app's Client ID, or the app URL in the Partner Dashboard not matching this page.",
    )
  }

  if (!sessionToken) {
    throw new OraSessionError(
      "SESSION_TOKEN_MISSING",
      "No Shopify session token could be obtained.",
    )
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/shopify/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    // A network-level failure carries no envelope to unwrap.
    throw new OraSessionError(
      "API_UNREACHABLE",
      `Could not reach the ORA API at ${API_BASE}/shopify/session: ${(err as Error).message}`,
    )
  }

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
