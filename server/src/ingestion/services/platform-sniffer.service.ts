import { Injectable, Logger } from '@nestjs/common';
import { PlatformDetectionResult } from '../types/ingestion.types';
import { UrlNormalizer } from '../utils/url-normalizer.util';

const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = 'ORA-Sync/1.0 (+https://ora.ai/bot; Storefront Intelligence)';

/**
 * Detects which e-commerce/storefront platform a merchant domain runs on.
 * Probes public unauthenticated endpoints to decide whether to use fast JSON
 * paths (Shopify, WooCommerce) or fall back to generic sitemap/HTML crawling.
 */
@Injectable()
export class PlatformSnifferService {
  private readonly logger = new Logger(PlatformSnifferService.name);

  async detect(domain: string): Promise<PlatformDetectionResult> {
    const normalizedDomain = UrlNormalizer.normalizeDomain(domain);

    const shopify = await this.probeShopify(normalizedDomain);
    if (shopify) return shopify;

    const woo = await this.probeWooCommerce(normalizedDomain);
    if (woo) return woo;

    return {
      platform: 'custom',
      domain: normalizedDomain,
      confidence: 'low',
      evidence: ['No Shopify or WooCommerce signatures found; using generic sitemap/HTML crawl'],
    };
  }

  private async probeShopify(domain: string): Promise<PlatformDetectionResult | null> {
    try {
      const res = await this.fetchWithTimeout(`https://${domain}/products.json?limit=1`);
      if (!res.ok) return null;

      const evidence: string[] = [];
      const shopIdHeader = res.headers.get('x-shopid') || res.headers.get('x-shardid');
      if (shopIdHeader) evidence.push(`Shopify header present: ${shopIdHeader}`);

      const body = await res.json().catch(() => null);
      const hasProductsArray = body && Array.isArray(body.products);
      if (hasProductsArray) evidence.push('/products.json returned a valid products array');

      if (shopIdHeader || hasProductsArray) {
        return {
          platform: 'shopify',
          domain,
          confidence: shopIdHeader && hasProductsArray ? 'high' : 'low',
          evidence,
        };
      }
      return null;
    } catch (err: any) {
      this.logger.debug(`Shopify probe failed for ${domain}: ${err.message}`);
      return null;
    }
  }

  private async probeWooCommerce(domain: string): Promise<PlatformDetectionResult | null> {
    try {
      const res = await this.fetchWithTimeout(
        `https://${domain}/wp-json/wc/store/v1/products?per_page=1`,
      );
      if (!res.ok) return null;

      const body = await res.json().catch(() => null);
      if (Array.isArray(body)) {
        return {
          platform: 'woocommerce',
          domain,
          confidence: 'high',
          evidence: ['/wp-json/wc/store/v1/products returned valid WooCommerce store catalog array'],
        };
      }
      return null;
    } catch (err: any) {
      this.logger.debug(`WooCommerce probe failed for ${domain}: ${err.message}`);
      return null;
    }
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
