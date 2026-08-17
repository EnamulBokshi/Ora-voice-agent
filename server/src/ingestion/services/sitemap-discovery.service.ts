import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
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
    const primaryProto = UrlNormalizer.getProtocol(domain);
    const protocols = primaryProto === 'https' ? ['https', 'http'] : ['http', 'https'];

    const seen = new Set<string>();
    const results: DiscoveredUrl[] = [];

    // 1. Candidate sitemap paths across candidate protocols
    for (const proto of protocols) {
      const candidateSitemaps = [
        `${proto}://${normalizedDomain}/sitemap.xml`,
        `${proto}://${normalizedDomain}/sitemap_index.xml`,
        `${proto}://${normalizedDomain}/sitemap_products_1.xml`,
        `${proto}://${normalizedDomain}/sitemap_pages_1.xml`,
      ];

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
      if (results.length > 0) break;

      // 2. Check robots.txt for Sitemap directives
      const robotsSitemaps = await this.findSitemapsInRobotsTxt(`${proto}://${normalizedDomain}/robots.txt`);
      for (const sitemapUrl of robotsSitemaps) {
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
      if (results.length > 0) break;
    }

    // 3. Fallback Homepage Link Spidering (if no sitemap.xml exists)
    if (results.length === 0) {
      this.logger.warn(`No valid sitemap discovered for ${domain}; falling back to homepage link spidering`);
      const homepageUrls = await this.spiderHomepageLinks(normalizedDomain, primaryProto);
      for (const rawUrl of homepageUrls) {
        const canonical = UrlNormalizer.normalizeUrl(rawUrl, normalizedDomain);
        if (!canonical || seen.has(canonical)) continue;

        seen.add(canonical);
        results.push({
          url: canonical,
          kind: this.classify(canonical),
          sourceHint: 'spider',
        });

        if (results.length >= MAX_URLS_PER_DOMAIN) break;
      }
    }

    this.logger.log(`[SitemapDiscovery] Found ${results.length} canonical URLs for ${domain}`);
    return results;
  }

  private async findSitemapsInRobotsTxt(robotsUrl: string): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return [];
      const text = await res.text();
      const sitemaps: string[] = [];
      const lines = text.split('\n');
      for (const line of lines) {
        const match = line.match(/^sitemap:\s*(https?:\/\/[^\s#]+)/i);
        if (match && match[1]) {
          sitemaps.push(match[1].trim());
        }
      }
      return sitemaps;
    } catch {
      return [];
    }
  }

  private async spiderHomepageLinks(domain: string, proto: string): Promise<string[]> {
    const urls: string[] = [];
    const rootUrl = `${proto}://${domain}`;
    urls.push(rootUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(rootUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return urls;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')?.trim();
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }

        const canonical = UrlNormalizer.normalizeUrl(href, domain);
        if (canonical && (canonical.includes(domain) || UrlNormalizer.isLocalDomain(domain))) {
          urls.push(canonical);
        }
      });
    } catch (err: any) {
      this.logger.debug(`Homepage spidering failed for ${rootUrl}: ${err.message}`);
    }

    return Array.from(new Set(urls));
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

