/**
 * Normalizes and canonicalizes URLs to prevent redundant crawls and duplicate records.
 */
export class UrlNormalizer {
  private static readonly TRACKING_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'gclsrc',
    'dclid',
    'zanpid',
    'ref',
    'source',
    '_ga',
    '_gl',
    'mc_cid',
    'mc_eid',
    'v', // cache busters
  ]);

  /**
   * Normalizes domain name (e.g. "https://www.MyStore.com/shop/" -> "mystore.com")
   */
  static normalizeDomain(domainOrUrl: string): string {
    if (!domainOrUrl) return '';
    let d = domainOrUrl.trim().toLowerCase();
    d = d.replace(/^https?:\/\//i, '');
    d = d.replace(/\/+.*$/, ''); // strip any path
    d = d.replace(/^www\./i, ''); // standardize www
    return d;
  }

  /**
   * Canonicalizes a full URL:
   * 1. Lowercase hostname & protocol
   * 2. Strip tracking query parameters
   * 3. Sort remaining query parameters
   * 4. Remove URL hash/fragment
   * 5. Strip trailing slash (unless it's just root path)
   */
  static normalizeUrl(rawUrl: string, baseDomain?: string): string | null {
    if (!rawUrl) return null;
    try {
      let resolved = rawUrl.trim();
      if (!/^https?:\/\//i.test(resolved) && baseDomain) {
        resolved = `https://${baseDomain.replace(/\/+$/, '')}/${resolved.replace(/^\/+/, '')}`;
      }

      const parsed = new URL(resolved);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      // Standardize protocol to https
      parsed.protocol = 'https:';
      parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

      // Remove default ports
      if (parsed.port === '80' || parsed.port === '443') {
        parsed.port = '';
      }

      // Filter tracking query params
      const searchParams = new URLSearchParams();
      const keys = Array.from(parsed.searchParams.keys()).sort();
      for (const key of keys) {
        if (!this.TRACKING_PARAMS.has(key.toLowerCase())) {
          const vals = parsed.searchParams.getAll(key);
          for (const val of vals) {
            searchParams.append(key, val);
          }
        }
      }
      parsed.search = searchParams.toString() ? `?${searchParams.toString()}` : '';

      // Strip fragment
      parsed.hash = '';

      // Strip trailing slash on path (unless path is '/')
      let pathname = parsed.pathname.replace(/\/+$/, '');
      if (!pathname) pathname = '/';
      parsed.pathname = pathname;

      return parsed.toString();
    } catch {
      return null;
    }
  }
}
