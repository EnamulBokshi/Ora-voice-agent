export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
}

export interface SessionBusiness {
  id: string;
  name: string;
  domain?: string;
  publishableKey?: string | null;
  shopifyShopDomain?: string | null;
}

export interface UnifiedSession {
  accessToken: string;
  refreshToken?: string;
  business?: SessionBusiness;
  user?: SessionUser;
  installed?: boolean;
}

export interface SessionStrategy {
  /**
   * Retrieves a valid access token.
   * Returns null if unauthenticated.
   */
  getToken(forceRefresh?: boolean): Promise<string | null>;

  /**
   * Refreshes the access token when 401 Unauthorized occurs.
   * Returns the new access token, or null if refresh failed.
   */
  refresh(): Promise<string | null>;

  /**
   * Clears the active session state.
   */
  clear(): void;

  /**
   * Returns the cached or requested unified session metadata.
   */
  getSession(forceRefresh?: boolean): Promise<UnifiedSession | null>;
}
