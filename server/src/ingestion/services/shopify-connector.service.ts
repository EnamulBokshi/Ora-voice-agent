import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../../products/products.service';
import { RedisService } from '../../common/redis/redis.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class ShopifyConnectorService {
  private readonly logger = new Logger(ShopifyConnectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly redisService: RedisService,
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

    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader),
    );
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
}
