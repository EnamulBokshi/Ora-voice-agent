import { SessionStrategy, UnifiedSession } from './types';

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
      config?: { apiKey?: string; shop?: string };
    };
  }
}

const APP_BRIDGE_READY_TIMEOUT_MS = 5000;
const ID_TOKEN_TIMEOUT_MS = 8000;
const SESSION_REQUEST_TIMEOUT_MS = 15000;

export class OraSessionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OraSessionError';
  }
}

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
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

let cachedSession: UnifiedSession | null = null;
let inFlight: Promise<UnifiedSession> | null = null;

async function unwrap<T>(response: Response): Promise<T> {
  const body = await response.json();

  if (!body || typeof body !== 'object' || !('success' in body)) {
    throw new OraSessionError(
      'MALFORMED_RESPONSE',
      'The ORA API returned an unrecognized response shape.',
    );
  }

  if (!body.success) {
    throw new OraSessionError(body.error.code, body.error.message);
  }

  return body.data;
}

async function waitForAppBridge(
  timeoutMs = APP_BRIDGE_READY_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.shopify?.idToken) return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (window.shopify?.idToken) return true;
  }
  return false;
}

async function requestSession(): Promise<UnifiedSession> {
  let sessionToken: string | null = null;

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    sessionToken = params.get('id_token');
  }

  if (!sessionToken) {
    if (!isEmbedded()) {
      throw new OraSessionError(
        'NOT_EMBEDDED',
        'This page is open directly rather than inside Shopify Admin, where App Bridge cannot mint a session token.',
      );
    }

    const ready = await waitForAppBridge(APP_BRIDGE_READY_TIMEOUT_MS);
    if (!ready || !window.shopify?.idToken) {
      throw new OraSessionError(
        'APP_BRIDGE_UNAVAILABLE',
        'The Shopify App Bridge script did not load. Check that cdn.shopify.com is reachable and that the page has a shopify-api-key meta tag.',
      );
    }

    sessionToken = await withTimeout(
      window.shopify.idToken(),
      ID_TOKEN_TIMEOUT_MS,
      'APP_BRIDGE_TOKEN_TIMEOUT',
      'App Bridge did not return a session token.',
    );
  }

  if (!sessionToken) {
    throw new OraSessionError(
      'SESSION_TOKEN_MISSING',
      'No Shopify session token could be obtained.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/shopify/session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new OraSessionError(
      'API_UNREACHABLE',
      `Could not reach the ORA API at ${API_BASE}/shopify/session: ${(err as Error).message}`,
    );
  }

  return unwrap<UnifiedSession>(response);
}

export async function getShopifySession(forceRefresh = false): Promise<UnifiedSession> {
  if (!forceRefresh && cachedSession) return cachedSession;
  if (inFlight) return inFlight;

  inFlight = requestSession()
    .then((session) => {
      cachedSession = session;
      return session;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export class ShopifySessionStrategy implements SessionStrategy {
  async getToken(forceRefresh = false): Promise<string | null> {
    try {
      const session = await getShopifySession(forceRefresh);
      return session.accessToken;
    } catch {
      return null;
    }
  }

  async refresh(): Promise<string | null> {
    return this.getToken(true);
  }

  clear(): void {
    cachedSession = null;
  }

  async getSession(forceRefresh = false): Promise<UnifiedSession | null> {
    try {
      return await getShopifySession(forceRefresh);
    } catch {
      return null;
    }
  }
}
