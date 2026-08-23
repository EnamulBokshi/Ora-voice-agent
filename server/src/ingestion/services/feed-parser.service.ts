import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { parse as parseCsv } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { ProductsService } from '../../products/products.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class FeedParserService {
  private readonly logger = new Logger(FeedParserService.name);

  constructor(private readonly productsService: ProductsService) {}

  /**
   * Fetches and parses a merchant Google Shopping XML / CSV product feed from a URL
   * or raw string content, normalizes items, and batch-syncs to MongoDB.
   */
  async parseAndIngestFeed(
    businessId: string,
    feedUrl: string,
    rawContent?: string,
  ) {
    this.logger.log(
      `[FeedParserService] Parsing catalog feed from URL '${feedUrl}' for business ${businessId}`,
    );

    let content = rawContent;
    if (!content && feedUrl) {
      try {
        const response = await fetch(feedUrl);
        if (!response.ok) {
          throw new BadRequestException(
            `Failed to fetch catalog feed from URL '${feedUrl}' (HTTP ${response.status}).`,
          );
        }
        content = await response.text();
      } catch (err: any) {
        throw new BadRequestException(
          `Unable to download catalog feed from '${feedUrl}': ${err.message}`,
        );
      }
    }

    if (!content || !content.trim()) {
      throw new BadRequestException('Catalog feed content is empty.');
    }

    const items = this.extractFeedItems(content);

    if (items.length === 0) {
      throw new BadRequestException(
        'No valid product items could be extracted from the feed.',
      );
    }

    const mappedProducts = items.map((item, idx) => {
      const nativeProductId = String(
        item.id || item.g_id || item.guid || item.sku || `feed_${Date.now()}_${idx + 1}`,
      );
      const name = String(item.title || item.name || item.g_title || 'Untitled Product');
      const description = String(item.description || item.g_description || '');
      const rawPrice = String(item.price || item.g_price || '0');
      const priceNum = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
      const currency = rawPrice.match(/[A-Z]{3}/)?.[0] || 'USD';
      const category = String(item.product_type || item.g_product_type || item.category || 'General');
      const rawAvail = String(item.availability || item.g_availability || 'in stock').toLowerCase();

      return {
        nativeProductId,
        name,
        description,
        price: priceNum,
        currency,
        stockQuantity: rawAvail.includes('in stock') ? 50 : 0,
        availability: rawAvail.includes('in stock')
          ? ProductAvailability.IN_STOCK
          : ProductAvailability.OUT_OF_STOCK,
        category,
        sourceTier: SourceTier.TIER2_FEED,
        confidenceScore: 0.7,
      };
    });

    return this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER2_FEED,
      products: mappedProducts,
    });
  }

  private extractFeedItems(content: string): Array<Record<string, any>> {
    const trimmed = content.trim();

    // 1. Parse XML RSS / Atom Google Merchant Feed
    if (trimmed.startsWith('<') || trimmed.includes('<rss') || trimmed.includes('<feed')) {
      try {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          trimValues: true,
          cdataPropName: '__cdata',
        });
        const parsed = parser.parse(content);

        // RSS 2.0: parsed.rss.channel.item | Atom: parsed.feed.entry
        let rawItems =
          parsed?.rss?.channel?.item ||
          parsed?.channel?.item ||
          parsed?.feed?.entry ||
          parsed?.items?.item ||
          [];

        if (!Array.isArray(rawItems)) {
          rawItems = [rawItems];
        }

        const items = rawItems
          .map((item: any) => {
            const itemObj: Record<string, any> = {};
            for (const [key, rawVal] of Object.entries(item)) {
              const cleanKey = key.replace(/^g:/i, 'g_');
              let val: any = rawVal;
              if (val && typeof val === 'object' && val.__cdata !== undefined) {
                val = val.__cdata;
              } else if (val && typeof val === 'object' && val['#text'] !== undefined) {
                val = val['#text'];
              }
              itemObj[cleanKey] = typeof val === 'string' ? val.trim() : val;
            }
            return itemObj;
          })
          .filter((itemObj: any) => itemObj.title || itemObj.id || itemObj.g_id);

        if (items.length > 0) {
          return items;
        }
      } catch (err: any) {
        this.logger.warn(
          `[FeedParserService] fast-xml-parser note: ${err.message}. Trying fallback parser.`,
        );
      }
    }

    // 2. Parse CSV Feed
    try {
      return parseCsv(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return [];
    }
  }
}
