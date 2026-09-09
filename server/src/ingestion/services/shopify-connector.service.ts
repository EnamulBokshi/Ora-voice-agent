import { Injectable, Logger, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../../products/products.service';
import { RedisService } from '../../common/redis/redis.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { VectorStoreService } from '../../vector/vector-store.service';
import { EntityType } from '../../vector/interfaces/vector-entry.interface';

@Injectable()
export class ShopifyConnectorService {
  private readonly logger = new Logger(ShopifyConnectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly redisService: RedisService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @Optional()
    private readonly vectorStoreService?: VectorStoreService,
  ) {}

  verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
    const secret =
      this.configService.get<string>('SHOPIFY_API_SECRET') ||
      'ora_shopify_secret_dev_key';

    if (!hmacHeader) return false;

    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const expectedBuffer = Buffer.from(calculatedHmac);
    const providedBuffer = Buffer.from(hmacHeader);

    // timingSafeEqual throws RangeError on a length mismatch, which would
    // surface as a 500 instead of a rejected webhook.
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  async processWebhook(
    businessId: string,
    topic: string,
    webhookId: string,
    payload: any,
  ) {
    const redisKey = `webhook:shopify:${webhookId}`;
    const alreadyProcessed = await this.redisService.getClient().get(redisKey);
    if (alreadyProcessed) {
      this.logger.log(
        `[ShopifyConnector] Duplicate webhook skipped (ID: ${webhookId})`,
      );
      return { status: 'duplicate_skipped' };
    }

    await this.redisService
      .getClient()
      .set(redisKey, '1', 'EX', 24 * 60 * 60);

    this.logger.log(
      `[ShopifyConnector] Processing topic '${topic}' for business ${businessId}`,
    );

    switch (topic) {
      case 'products/create':
      case 'products/update':
        await this.handleProductUpsert(businessId, payload);
        break;
      case 'products/delete':
        await this.handleProductDelete(businessId, payload);
        break;
      case 'inventory_levels/update':
        await this.handleInventoryUpdate(businessId, payload);
        break;
      default:
        this.logger.warn(`[ShopifyConnector] Unhandled topic: ${topic}`);
    }

    return { status: 'processed', topic };
  }

  private async handleProductUpsert(businessId: string, payload: any) {
    const nativeProductId = String(payload.id);
    const variant = payload.variants && payload.variants[0] ? payload.variants[0] : {};

    await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: [
        {
          nativeProductId,
          name: payload.title || 'Untitled Product',
          description: payload.body_html || '',
          price: parseFloat(variant.price || '0'),
          currency: 'USD',
          stockQuantity: variant.inventory_quantity || 0,
          availability:
            (variant.inventory_quantity || 0) > 0
              ? ProductAvailability.IN_STOCK
              : ProductAvailability.OUT_OF_STOCK,
          category: payload.product_type || 'General',
          sourceTier: SourceTier.TIER1_CONNECTOR,
          confidenceScore: 1.0,
          images: payload.images ? payload.images.map((img: any) => img.src) : [],
        },
      ],
    });

    // Auto-embed into VectorIndex for instant RAG search availability
    if (this.vectorStoreService) {
      try {
        const pDoc = await this.productsService.findOne(businessId, nativeProductId).catch(() => null);
        if (pDoc) {
          const text = `${pDoc.name} ${pDoc.description || ''} ${pDoc.category || ''}`.trim();
          await this.vectorStoreService.upsertVector(businessId, {
            entityType: EntityType.PRODUCT,
            entityId: pDoc._id.toString(),
            text,
            metadata: {
              nativeProductId: pDoc.nativeProductId,
              price: pDoc.price,
              category: pDoc.category,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `[ShopifyConnector] Auto-embedding failed for product ${nativeProductId}: ${err.message}`,
        );
      }
    }
  }

  private async handleProductDelete(businessId: string, payload: any) {
    const nativeProductId = String(payload.id);
    const existing = await this.productsService.findAll(businessId, { limit: 100 });
    const match = existing.items.find((p) => p.nativeProductId === nativeProductId);
    if (match) {
      await this.productsService.remove(businessId, match._id.toString());
    }
  }

  private async handleInventoryUpdate(businessId: string, payload: any) {
    const nativeProductId = String(payload.inventory_item_id);
    const existing = await this.productsService.findAll(businessId, { limit: 100 });
    const match = existing.items.find((p) => p.nativeProductId === nativeProductId);
    if (match) {
      await this.productsService.update(businessId, match._id.toString(), {
        stockQuantity: payload.available,
        availability:
          payload.available > 0
            ? ProductAvailability.IN_STOCK
            : ProductAvailability.OUT_OF_STOCK,
      });
    }
  }

  /**
   * Gap B live fallback: query the merchant's Shopify store directly for products
   * matching the given search terms. Used when products don't yet exist in MongoDB
   * (ingestion lag). Returns [] if credentials are missing or the API call fails.
   */
  async searchProductsLive(businessId: string, query: string): Promise<any[]> {
    const business = await this.businessModel.findById(businessId as any).exec();
    if (!business?.shopifyStoreUrl || !business?.shopifyAccessToken) {
      this.logger.warn(
        `[ShopifyConnector] No Shopify credentials configured for business ${businessId} — Gap B live search skipped.`,
      );
      return [];
    }

    const storeUrl = business.shopifyStoreUrl.replace(/\/$/, '');
    const url = `${storeUrl}/admin/api/2024-01/products.json?title=${encodeURIComponent(query)}&limit=5&status=active`;

    try {
      this.logger.log(
        `[ShopifyConnector] Gap B live search: GET ${storeUrl}/admin/api/2024-01/products.json?title=${query}`,
      );

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': business.shopifyAccessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `[ShopifyConnector] Shopify live search returned HTTP ${response.status} for business ${businessId}.`,
        );
        return [];
      }

      const data: any = await response.json();
      const products: any[] = data.products || [];

      return products.map((p: any) => {
        const variant = p.variants?.[0] || {};
        return {
          nativeProductId: String(p.id),
          name: p.title || 'Untitled Product',
          description: p.body_html || '',
          price: parseFloat(variant.price || '0'),
          currency: 'USD',
          stockQuantity: variant.inventory_quantity || 0,
          availability:
            (variant.inventory_quantity || 0) > 0
              ? ProductAvailability.IN_STOCK
              : ProductAvailability.OUT_OF_STOCK,
          category: p.product_type || 'General',
          sourceTier: SourceTier.TIER1_CONNECTOR,
          confidenceScore: 1.0,
          images: p.images ? p.images.map((img: any) => img.src) : [],
        };
      });
    } catch (err: any) {
      this.logger.error(
        `[ShopifyConnector] Gap B live search failed for business ${businessId}: ${err.message}`,
      );
      return [];
    }
  }
}

