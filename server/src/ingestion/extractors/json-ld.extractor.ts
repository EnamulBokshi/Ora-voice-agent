import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ExtractedProduct } from '../types/ingestion.types';
import { ContentHasher } from '../utils/content-hasher.util';
import { UrlNormalizer } from '../utils/url-normalizer.util';

/**
 * Extracts Schema.org Product JSON-LD (and OpenGraph fallback) from a page's HTML.
 * Used for custom storefronts (Next.js, Magento, BigCommerce, etc.) without native JSON endpoints.
 */
@Injectable()
export class JsonLdExtractor {
  private readonly logger = new Logger(JsonLdExtractor.name);

  extractProduct(html: string, sourceUrl: string): ExtractedProduct | null {
    const normalizedUrl = UrlNormalizer.normalizeUrl(sourceUrl) || sourceUrl;
    const $ = cheerio.load(html);

    const fromJsonLd = this.extractFromJsonLd($, normalizedUrl);
    if (fromJsonLd) return fromJsonLd;

    return this.extractFromOpenGraph($, normalizedUrl);
  }

  private extractFromJsonLd($: cheerio.CheerioAPI, sourceUrl: string): ExtractedProduct | null {
    const scripts = $('script[type="application/ld+json"]');

    for (const el of scripts.toArray()) {
      const raw = $(el).contents().text();
      if (!raw) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const flattened = candidates.flatMap((c: any) =>
        c && Array.isArray(c['@graph']) ? c['@graph'] : [c],
      );

      const productNode = flattened.find((node: any) => this.isProductType(node?.['@type']));
      if (productNode) {
        return this.mapJsonLdProduct(productNode, sourceUrl);
      }
    }

    return null;
  }

  private isProductType(type: unknown): boolean {
    if (!type) return false;
    const types = Array.isArray(type) ? type : [type];
    return types.some((t) => typeof t === 'string' && t.toLowerCase() === 'product');
  }

  private mapJsonLdProduct(node: any, sourceUrl: string): ExtractedProduct {
    const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;

    let images: string[] = [];
    if (Array.isArray(node.image)) {
      images = node.image.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean);
    } else if (typeof node.image === 'string') {
      images = [node.image];
    } else if (node.image?.url) {
      images = [node.image.url];
    }

    const price = offer?.price !== undefined ? Number(offer.price) : undefined;
    const currency = offer?.priceCurrency || undefined;
    const title = node.name || 'Untitled product';
    const description = typeof node.description === 'string' ? node.description : undefined;
    const availability = this.mapAvailability(offer?.availability);

    const contentHash = ContentHasher.hashProduct({
      name: title,
      description,
      price,
      currency,
      availability,
      images,
    });

    return {
      sourceUrl,
      externalId: node.sku || node.productID || undefined,
      title,
      description,
      price,
      currency,
      images,
      availability,
      contentHash,
      raw: node,
    };
  }

  private mapAvailability(availability: unknown): ExtractedProduct['availability'] {
    if (typeof availability !== 'string') return 'unknown';
    if (/instock/i.test(availability)) return 'in_stock';
    if (/outofstock/i.test(availability)) return 'out_of_stock';
    return 'unknown';
  }

  private extractFromOpenGraph($: cheerio.CheerioAPI, sourceUrl: string): ExtractedProduct | null {
    const title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
    if (!title) return null;

    const price = $('meta[property="og:price:amount"]').attr('content') || $('meta[property="product:price:amount"]').attr('content');
    const currency = $('meta[property="og:price:currency"]').attr('content') || $('meta[property="product:price:currency"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');

    const numPrice = price ? Number(price) : undefined;
    const images = image ? [image] : [];

    const contentHash = ContentHasher.hashProduct({
      name: title,
      description,
      price: numPrice,
      currency,
      images,
    });

    return {
      sourceUrl,
      title,
      description,
      price: numPrice,
      currency,
      images,
      availability: 'unknown',
      contentHash,
    };
  }
}
