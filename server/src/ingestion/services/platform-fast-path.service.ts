import { Injectable, Logger } from '@nestjs/common';
import { ExtractedKnowledgeDoc, ExtractedProduct } from '../types/ingestion.types';
import { ContentHasher } from '../utils/content-hasher.util';
import { UrlNormalizer } from '../utils/url-normalizer.util';

const USER_AGENT = 'ORA-Sync/1.0 (+https://ora.ai/bot; Storefront Intelligence)';
const PAGE_SIZE = 250; // Shopify's max per_page for /products.json

/**
 * Direct calls to platform-native public JSON APIs. No HTML parsing required.
 * Handles Shopify /products.json & /policies.json and WooCommerce Store & Pages API.
 */
@Injectable()
export class PlatformFastPathService {
  private readonly logger = new Logger(PlatformFastPathService.name);

  async fetchShopifyProducts(domain: string): Promise<ExtractedProduct[]> {
    const all: ExtractedProduct[] = [];
    const proto = UrlNormalizer.getProtocol(domain);
    let page = 1;

    while (page <= 40) {
      // 40 * 250 = 10,000 product hard cap
      const res = await this.get(`${proto}://${domain}/products.json?limit=${PAGE_SIZE}&page=${page}`);
      if (!res) break;

      const body = await res.json().catch(() => null);
      const products: any[] = body?.products ?? [];
      if (products.length === 0) break;

      for (const p of products) {
        all.push(this.mapShopifyProduct(p, domain));
      }

      if (products.length < PAGE_SIZE) break;
      page += 1;
    }

    this.logger.log(`[FastPath:Shopify] Fetched ${all.length} products for ${domain}`);
    return all;
  }

  async fetchShopifyPolicies(domain: string): Promise<ExtractedKnowledgeDoc[]> {
    const proto = UrlNormalizer.getProtocol(domain);
    const res = await this.get(`${proto}://${domain}/policies.json`);
    if (!res) return [];

    const body = await res.json().catch(() => null);
    const policies: any[] = body?.policies ?? [];

    return policies
      .filter((p) => p.body && p.title)
      .map((p) => {
        const sourceUrl = UrlNormalizer.normalizeUrl(p.url, domain) || `${proto}://${domain}/policies`;
        const markdown = this.stripHtml(p.body) || p.body;
        return {
          sourceUrl,
          category: 'policy' as const,
          title: p.title,
          markdown,
          contentHash: ContentHasher.hashText(markdown),
        };
      });
  }

  async fetchWooCommerceProducts(domain: string): Promise<ExtractedProduct[]> {
    const all: ExtractedProduct[] = [];
    const proto = UrlNormalizer.getProtocol(domain);
    let page = 1;

    while (page <= 40) {
      const res = await this.get(
        `${proto}://${domain}/wp-json/wc/store/v1/products?per_page=${PAGE_SIZE}&page=${page}`,
      );
      if (!res) break;

      const products: any[] = await res.json().catch(() => []);
      if (!Array.isArray(products) || products.length === 0) break;

      for (const p of products) {
        all.push(this.mapWooProduct(p, domain));
      }

      if (products.length < PAGE_SIZE) break;
      page += 1;
    }

    this.logger.log(`[FastPath:WooCommerce] Fetched ${all.length} products for ${domain}`);
    return all;
  }

  async fetchWooCommercePages(domain: string): Promise<ExtractedKnowledgeDoc[]> {
    const proto = UrlNormalizer.getProtocol(domain);
    const res = await this.get(`${proto}://${domain}/wp-json/wp/v2/pages?per_page=100`);
    if (!res) return [];

    const pages: any[] = await res.json().catch(() => []);
    if (!Array.isArray(pages)) return [];

    return pages
      .filter((p) => p.content?.rendered)
      .map((p) => {
        const sourceUrl = UrlNormalizer.normalizeUrl(p.link, domain) || `${proto}://${domain}`;
        const markdown = this.stripHtml(p.content.rendered) || p.content.rendered;
        return {
          sourceUrl,
          category: this.classifyWpPageSlug(p.slug),
          title: this.stripHtml(p.title?.rendered) || p.slug,
          markdown,
          contentHash: ContentHasher.hashText(markdown),
        };
      });
  }

  private classifyWpPageSlug(slug: string): 'policy' | 'faq' | 'general' | 'services' | 'pricing' {
    if (/refund|shipping|privacy|terms|legal/i.test(slug)) return 'policy';
    if (/faq|help/i.test(slug)) return 'faq';
    if (/service|solutions|offerings/i.test(slug)) return 'services';
    if (/pricing|plans/i.test(slug)) return 'pricing';
    return 'general';
  }

  private mapShopifyProduct(p: any, domain: string): ExtractedProduct {
    const firstVariant = p.variants?.[0];
    const sourceUrl = UrlNormalizer.normalizeUrl(`https://${domain}/products/${p.handle}`) || `https://${domain}/products/${p.handle}`;
    const description = this.stripHtml(p.body_html);
    const price = firstVariant?.price ? Number(firstVariant.price) : undefined;
    const images = (p.images ?? []).map((img: any) => img.src).filter(Boolean);
    const availability = firstVariant?.available ? 'in_stock' : 'out_of_stock';

    const contentHash = ContentHasher.hashProduct({
      name: p.title,
      description,
      price,
      availability,
      images,
    });

    return {
      sourceUrl,
      externalId: String(p.id),
      title: p.title,
      description,
      price,
      currency: undefined,
      images,
      availability,
      variants: (p.variants ?? []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        price: v.price ? Number(v.price) : undefined,
        sku: v.sku,
        available: v.available,
      })),
      contentHash,
      raw: p,
    };
  }

  private mapWooProduct(p: any, domain: string): ExtractedProduct {
    const sourceUrl = UrlNormalizer.normalizeUrl(p.permalink || `https://${domain}/?p=${p.id}`) || `https://${domain}/?p=${p.id}`;
    const description = this.stripHtml(p.description || p.short_description);
    const price = p.prices?.price ? Number(p.prices.price) / 100 : undefined;
    const currency = p.prices?.currency_code;
    const images = (p.images ?? []).map((img: any) => img.src).filter(Boolean);
    const availability = p.is_in_stock ? 'in_stock' : 'out_of_stock';

    const contentHash = ContentHasher.hashProduct({
      name: p.name,
      description,
      price,
      currency,
      availability,
      images,
    });

    return {
      sourceUrl,
      externalId: String(p.id),
      title: p.name,
      description,
      price,
      currency,
      images,
      availability,
      variants: (p.variations ?? []).map((v: any) => ({ id: String(v.id) })),
      contentHash,
      raw: p,
    };
  }

  private stripHtml(html?: string): string | undefined {
    if (!html) return undefined;
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async get(url: string): Promise<Response | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.debug(`Fast-path GET ${url} returned status ${res.status}`);
        return null;
      }
      return res;
    } catch (err: any) {
      this.logger.debug(`Fast-path GET ${url} failed: ${err.message}`);
      return null;
    }
  }
}
