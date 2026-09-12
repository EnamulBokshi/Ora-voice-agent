/**
 * Shopify's `/admin/oauth/access_token` error bodies are not safe to log or to
 * return.
 *
 * A failed token exchange can echo the request back, and that request carries
 * the App Bridge session token as `subject_token`, plus `client_secret`. Both
 * are live credentials. This narrows an error body down to the two fields that
 * actually say what went wrong, and scrubs credential-shaped substrings out of
 * those.
 */
export class ShopifyOAuthError {
  /** `<header>.<payload>.<signature>` — a session token. */
  private static readonly JWT_PATTERN =
    /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g;

  /** Shopify access tokens: `shpat_`, `shpua_`, `shppa_`, `shpca_`, `shpss_`. */
  private static readonly ACCESS_TOKEN_PATTERN = /\bshp[a-z]{2}_[A-Za-z0-9]+/g;

  /** Anything spelled like a secret assignment, in JSON or query form. */
  private static readonly SECRET_FIELD_PATTERN =
    /("?\b(?:client_secret|subject_token|refresh_token|access_token|code)\b"?\s*[:=]\s*"?)[^",&\s}]+/gi;

  private static readonly MAX_LENGTH = 300;

  /** Removes credentials from a string and caps its length. */
  static scrub(text: string): string {
    if (!text) return '';
    return text
      .replace(this.SECRET_FIELD_PATTERN, '$1[REDACTED]')
      .replace(this.JWT_PATTERN, '[REDACTED_JWT]')
      .replace(this.ACCESS_TOKEN_PATTERN, '[REDACTED_TOKEN]')
      .slice(0, this.MAX_LENGTH);
  }

  /**
   * Turns a raw OAuth error body into a one-line summary that is safe to log.
   *
   * A JSON body is reduced to `error` and `error_description`, which are the
   * only fields Shopify documents. Anything else — an HTML error page, a
   * request echo — is scrubbed as free text, because its shape is unknown.
   */
  static summarize(body: string): string {
    if (!body) return 'no response body';

    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        const code = typeof parsed.error === 'string' ? parsed.error : '';
        const description =
          typeof parsed.error_description === 'string'
            ? parsed.error_description
            : '';
        const summary = [code, description].filter(Boolean).join(': ');
        return summary ? this.scrub(summary) : 'unrecognized error body';
      }
    } catch {
      // Not JSON. Fall through to the free-text path.
    }

    return this.scrub(body);
  }
}
