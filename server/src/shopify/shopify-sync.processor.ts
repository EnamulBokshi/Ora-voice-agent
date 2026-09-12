import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';

import { ProductsService } from '../products/products.service';
import { VectorStoreService } from '../vector/vector-store.service';
import { EntityType } from '../vector/interfaces/vector-entry.interface';
import { ShopifyTokenService } from '../common/shopify-token/shopify-token.service';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductAvailability,
  SourceTier,
} from '../products/schemas/product.schema';
import {
  SHOPIFY_API_VERSION,
  SHOPIFY_SYNC_PAGE_SIZE,
  SHOPIFY_SYNC_QUEUE,
} from './shopify.constants';

interface ShopifySyncJobData {
  businessId: string;
  shopDomain: string;
}

/**
 * Walks a newly installed store's whole catalog once.
 *
 * The webhook path embeds one product at a time — `batchSync` then a `findOne`
 * and an `upsertVector` per product (see `shopify-connector.service.ts`). That
 * shape is fine for a single webhook and wrong for an initial import, so this
 * worker keeps the page as the unit of work: one `batchSync` per page, one
 * query to read the saved documents back, then embedding across the page.
 *
 * `ProductsService.batchSync` does a Mongo `bulkWrite` and a RAG cache
 * invalidation and nothing else, so the embedding step here is not optional.
 */
@Processor(SHOPIFY_SYNC_QUEUE, { concurrency: 2 })
export class ShopifySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ShopifySyncProcessor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly tokenService: ShopifyTokenService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {
    super();
  }

  async process(job: Job<ShopifySyncJobData>): Promise<{
    pages: number;
    products: number;
    embedded: number;
  }> {
    const { businessId, shopDomain } = job.data;

    const business = await this.businessModel
      .findById(businessId)
      .select('+shopifyAccessToken +shopifyRefreshToken')
      .exec();

    // An initial import can start an hour after the install, by which time an
    // expiring offline token is dead. Refresh before the first page.
    const accessToken = business
      ? await this.tokenService.getValidAccessTokenFor(business)
      : undefined;

    if (!business || !accessToken) {
      this.logger.warn(
        `[ShopifySync] No access token for business ${businessId}; catalog sync skipped.`,
      );
      return { pages: 0, products: 0, embedded: 0 };
    }

    let pageInfo: string | null = null;
    let pages = 0;
    let products = 0;
    let embedded = 0;

    do {
      const page = await this.fetchPage(shopDomain, accessToken, pageInfo);
      if (!page.products.length) break;

      pages += 1;
      products += page.products.length;
      embedded += await this.persistPage(businessId, page.products);

      pageInfo = page.nextPageInfo;

      await job.updateProgress({ pages, products });
    } while (pageInfo);

    this.logger.log(
      `[ShopifySync] ${shopDomain}: ${products} product(s) across ${pages} page(s), ${embedded} embedded.`,
    );

    return { pages, products, embedded };
  }

  /**
   * One page of the REST catalog. Shopify pages the Admin API through the
   * `Link` header rather than an offset, so the cursor is read back out of it.
   */
  private async fetchPage(
    shopDomain: string,
    accessToken: string,
    pageInfo: string | null,
  ): Promise<{ products: any[]; nextPageInfo: string | null }> {
    const params = new URLSearchParams({
      limit: String(SHOPIFY_SYNC_PAGE_SIZE),
    });
    if (pageInfo) {
      // `page_info` carries its own filters; sending others alongside is an error.
      params.set('page_info', pageInfo);
    }

    const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params.toString()}`;
    const response = await this.requestWithBackoff(url, accessToken);

    const body = (await response.json()) as { products?: any[] };

    return {
      products: body.products || [],
      nextPageInfo: this.nextPageInfoFrom(response.headers.get('link')),
    };
  }

  /**
   * Shopify answers 429 with a `Retry-After`, and an initial import is exactly
   * the workload that hits it. Honour the header rather than failing the job.
   */
  private async requestWithBackoff(
    url: string,
    accessToken: string,
    attempt = 0,
  ): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get('retry-after') || '2');
      const delayMs = Math.max(retryAfter * 1000, 1000) * (attempt + 1);
      this.logger.warn(
        `[ShopifySync] Rate limited; retrying in ${delayMs}ms (attempt ${attempt + 1}).`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.requestWithBackoff(url, accessToken, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(
        `Shopify products.json returned HTTP ${response.status} for ${url}.`,
      );
    }

    return response;
  }

  private nextPageInfoFrom(linkHeader: string | null): string | null {
    if (!linkHeader) return null;

    for (const part of linkHeader.split(',')) {
      if (!part.includes('rel="next"')) continue;
      const match = part.match(/[?&]page_info=([^&>]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    return null;
  }

  /**
   * Upserts a page, then embeds it. The saved documents are read back in one
   * query because embedding needs the ORA `_id`, which `batchSync` does not
   * return.
   */
  private async persistPage(
    businessId: string,
    shopifyProducts: any[],
  ): Promise<number> {
    const products = shopifyProducts.map((product) => {
      const variant = product.variants?.[0] || {};
      const inventory = variant.inventory_quantity || 0;

      return {
        nativeProductId: String(product.id),
        name: product.title || 'Untitled Product',
        description: (product.body_html || '').replace(/<[^>]*>?/gm, ''),
        price: parseFloat(variant.price || '0'),
        currency: 'USD',
        stockQuantity: inventory,
        // Derived from inventory, never from Shopify's publication `status`.
        availability:
          inventory > 0
            ? ProductAvailability.IN_STOCK
            : ProductAvailability.OUT_OF_STOCK,
        category: product.product_type || 'General',
        brand: product.vendor,
        sourceTier: SourceTier.TIER1_CONNECTOR,
        confidenceScore: 1.0,
        images: (product.images || []).map((image: any) => image.src),
      };
    });

    await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: products as any,
    });

    const nativeIds = products.map((product) => product.nativeProductId);
    const saved = await this.productModel
      .find({ businessId: businessId as any, nativeProductId: { $in: nativeIds } })
      .select('_id name description category price nativeProductId')
      .exec();

    let embedded = 0;

    for (const product of saved) {
      try {
        const text = `${product.name} ${product.description || ''} ${product.category || ''}`.trim();
        await this.vectorStoreService.upsertVector(businessId, {
          entityType: EntityType.PRODUCT,
          entityId: product._id.toString(),
          text,
          metadata: {
            nativeProductId: product.nativeProductId,
            price: product.price,
            category: product.category,
          },
        });
        embedded += 1;
      } catch (err: any) {
        // One product failing to embed must not abandon the rest of the page;
        // it stays searchable through the non-vector path.
        this.logger.warn(
          `[ShopifySync] Embedding failed for product ${product.nativeProductId}: ${err.message}`,
        );
      }
    }

    return embedded;
  }
}
