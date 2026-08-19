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
   * Checks if domain or host is local development.
   */
  static isLocalDomain(domain: string): boolean {
    if (!domain) return false;
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];
    const hostWithoutPort = clean.split(':')[0];
    return (
      hostWithoutPort === 'localhost' ||
      hostWithoutPort === '127.0.0.1' ||
      hostWithoutPort === '0.0.0.0' ||
      hostWithoutPort.endsWith('.local') ||
      hostWithoutPort.endsWith('.test')
    );
  }

  /**
   * Determines protocol for domain (http for local, https for public, or explicit prefix).
   */
  static getProtocol(domainOrUrl: string): 'http' | 'https' {
    if (!domainOrUrl) return 'https';
    const trimmed = domainOrUrl.trim().toLowerCase();
    if (trimmed.startsWith('http://')) return 'http';
    if (trimmed.startsWith('https://')) return 'https';
    return this.isLocalDomain(trimmed) ? 'http' : 'https';
  }

  /**
   * Normalizes domain name (e.g. "https://www.MyStore.com/shop/" -> "mystore.com")
   * Preserves port numbers (e.g. "localhost:777")
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

      // Sanitize accidental "undefined" or "null" base prefix from buggy sitemaps (e.g. "undefined/products/1")
      if (baseDomain) {
        resolved = resolved.replace(/^(?:https?:\/\/)?[^/]*undefined\/?/i, '/');
        resolved = resolved.replace(/^undefined\/?/i, '/');
        resolved = resolved.replace(/^null\/?/i, '/');
      }

      const baseProto = baseDomain ? this.getProtocol(baseDomain) : 'https';
      if (!/^https?:\/\//i.test(resolved) && baseDomain) {
        resolved = `${baseProto}://${baseDomain.replace(/\/+$/, '')}/${resolved.replace(/^\/+/, '')}`;
      }

      const parsed = new URL(resolved);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      const isLocal = this.isLocalDomain(parsed.hostname);
      if (!isLocal && parsed.protocol === 'http:' && !baseDomain) {
        // Standardize public domain protocol to https
        parsed.protocol = 'https:';
      }

      // If crawling a local environment (e.g. localhost:3001), rewrite sitemap production URLs to target local host & port
      if (baseDomain && this.isLocalDomain(baseDomain)) {
        const targetClean = baseDomain.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];
        const [targetHost, targetPort] = targetClean.split(':');
        parsed.protocol = this.getProtocol(baseDomain) + ':';
        parsed.hostname = targetHost;
        parsed.port = targetPort || '';
      } else {
        parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      }

      // Remove default ports
      if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
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

