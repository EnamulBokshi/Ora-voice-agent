import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { DiscoveredUrl, DiscoveredUrlKind } from '../types/ingestion.types';
import { UrlNormalizer } from '../utils/url-normalizer.util';

const USER_AGENT = 'ORA-Sync/1.0 (+https://ora.ai/bot; Storefront Intelligence)';
const MAX_URLS_PER_DOMAIN = 5000;
const MAX_SITEMAP_DEPTH = 2;

const POLICY_PATTERNS = [
  /\/policies?\//i,
  /refund/i,
  /shipping-policy/i,
  /terms-of-service/i,
  /privacy-policy/i,
  /terms-and-conditions/i,
  /return-policy/i,
  /legal/i,
];

const FAQ_PATTERNS = [/\/faq/i, /frequently-asked/i, /help-center/i, /knowledge-base/i];
const PRODUCT_PATTERNS = [/\/products?\//i, /\/product\//i, /\/shop\//i, /\/item\//i, /\/p\//i];

@Injectable()
export class SitemapDiscoveryService {
  private readonly logger = new Logger(SitemapDiscoveryService.name);
  private readonly xmlParser = new XMLParser({ ignoreAttributes: false });

  async discover(domain: string): Promise<DiscoveredUrl[]> {
    const normalizedDomain = UrlNormalizer.normalizeDomain(domain);
    const candidateSitemaps = [
      `https://${normalizedDomain}/sitemap.xml`,
      `https://${normalizedDomain}/sitemap_index.xml`,
      `https://${normalizedDomain}/sitemap_products_1.xml`,
      `https://${normalizedDomain}/sitemap_pages_1.xml`,
    ];

    const seen = new Set<string>();
    const results: DiscoveredUrl[] = [];

    for (const sitemapUrl of candidateSitemaps) {
      const urls = await this.crawlSitemap(sitemapUrl, 0);
      for (const rawUrl of urls) {
        const canonical = UrlNormalizer.normalizeUrl(rawUrl, normalizedDomain);
        if (!canonical || seen.has(canonical)) continue;

        seen.add(canonical);
        results.push({
          url: canonical,
          kind: this.classify(canonical),
          sourceHint: 'sitemap',
        });

        if (results.length >= MAX_URLS_PER_DOMAIN) break;
      }
      if (results.length > 0) break;
    }

    if (results.length === 0) {
      this.logger.warn(`No valid sitemap discovered for ${domain}; crawler should use homepage fallback`);
    } else {
      this.logger.log(`[SitemapDiscovery] Found ${results.length} canonical URLs for ${domain}`);
    }

    return results;
  }

  private async crawlSitemap(url: string, depth: number): Promise<string[]> {
    if (depth > MAX_SITEMAP_DEPTH) return [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml, text/xml, */*' },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return [];

      const xml = await res.text();
      const parsed = this.xmlParser.parse(xml);

      // Sitemap index: <sitemapindex><sitemap><loc>...
      if (parsed.sitemapindex?.sitemap) {
        const children = this.toArray(parsed.sitemapindex.sitemap);
        const childUrls: string[] = [];
        for (const child of children) {
          if (child.loc) {
            const nested = await this.crawlSitemap(child.loc, depth + 1);
            childUrls.push(...nested);
          }
        }
        return childUrls;
      }

      // Standard urlset: <urlset><url><loc>...
      if (parsed.urlset?.url) {
        const entries = this.toArray(parsed.urlset.url);
        return entries.map((e: { loc: string }) => e.loc).filter(Boolean);
      }

      return [];
    } catch (err: any) {
      this.logger.debug(`Sitemap fetch failed for ${url}: ${err.message}`);
      return [];
    }
  }

  private toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
  }

  private classify(url: string): DiscoveredUrlKind {
    if (POLICY_PATTERNS.some((p) => p.test(url))) return 'policy';
    if (FAQ_PATTERNS.some((p) => p.test(url))) return 'faq';
    if (PRODUCT_PATTERNS.some((p) => p.test(url))) return 'product';
    return 'page';
  }
}
