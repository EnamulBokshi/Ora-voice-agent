import { Injectable, Logger, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../../products/products.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { VectorStoreService } from '../../vector/vector-store.service';
import { EntityType } from '../../vector/interfaces/vector-entry.interface';

@Injectable()
export class WooCommerceConnectorService {
  private readonly logger = new Logger(WooCommerceConnectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @Optional()
    private readonly vectorStoreService?: VectorStoreService,
  ) {}

  verifyWebhookHmac(rawBody: Buffer, signatureHeader: string): boolean {
    const secret =
      this.configService.get<string>('WOOCOMMERCE_WEBHOOK_SECRET') ||
      'ora_woocommerce_secret_dev_key';

    if (!signatureHeader) return false;

    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const expectedBuffer = Buffer.from(calculatedHmac);
    const providedBuffer = Buffer.from(signatureHeader);

    // timingSafeEqual throws RangeError on a length mismatch, which would
    // surface as a 500 instead of a rejected webhook.
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }


  async syncProducts(businessId: string, woocommerceProducts: any[]) {
    this.logger.log(
      `[WooCommerceConnector] Syncing ${woocommerceProducts.length} products for business ${businessId}`,
    );

    const mappedProducts = woocommerceProducts.map((p) => ({
      nativeProductId: String(p.id),
      name: p.name || 'Untitled Product',
      description: p.description || '',
      price: parseFloat(p.price || '0'),
      currency: 'USD',
      stockQuantity: p.stock_quantity || 0,
      availability:
        p.stock_status === 'instock'
          ? ProductAvailability.IN_STOCK
          : ProductAvailability.OUT_OF_STOCK,
      category: p.categories && p.categories[0] ? p.categories[0].name : 'General',
      sourceTier: SourceTier.TIER1_CONNECTOR,
      confidenceScore: 1.0,
      images: p.images ? p.images.map((img: any) => img.src) : [],
    }));

    const result = await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: mappedProducts,
    });

    // Auto-embed into VectorIndex for instant RAG search availability
    if (this.vectorStoreService && mappedProducts.length > 0) {
      try {
        const nativeIds = mappedProducts.map((p) => p.nativeProductId);
        const syncedDocs = await this.productsService.findManyByIds(businessId, nativeIds).catch(() => []);
        for (const pDoc of syncedDocs) {
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
          }).catch((err) =>
            this.logger.warn(`[WooCommerceConnector] Auto-embedding failed for product ${pDoc.nativeProductId}: ${err.message}`),
          );
        }
      } catch (err: any) {
        this.logger.warn(`[WooCommerceConnector] Bulk vector embedding failed: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Gap B live fallback: query the merchant's WooCommerce REST API directly for products
   * matching the given search terms. Used when products don't yet exist in MongoDB
   * (ingestion lag). Returns [] if credentials are missing or the API call fails.
   */
  async searchProductsLive(businessId: string, query: string): Promise<any[]> {
    const business = await this.businessModel.findById(businessId as any).exec();
    if (
      !business?.woocommerceStoreUrl ||
      !business?.woocommerceConsumerKey ||
      !business?.woocommerceConsumerSecret
    ) {
      this.logger.warn(
        `[WooCommerceConnector] No WooCommerce credentials configured for business ${businessId} — Gap B live search skipped.`,
      );
      return [];
    }

    const storeUrl = business.woocommerceStoreUrl.replace(/\/$/, '');
    const url = `${storeUrl}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=5&status=publish`;
    const credentials = Buffer.from(
      `${business.woocommerceConsumerKey}:${business.woocommerceConsumerSecret}`,
    ).toString('base64');

    try {
      this.logger.log(
        `[WooCommerceConnector] Gap B live search: GET ${storeUrl}/wp-json/wc/v3/products?search=${query}`,
      );

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `[WooCommerceConnector] WooCommerce live search returned HTTP ${response.status} for business ${businessId}.`,
        );
        return [];
      }

      const products: any[] = await response.json();

      return products.map((p: any) => ({
        nativeProductId: String(p.id),
        name: p.name || 'Untitled Product',
        description: p.description || '',
        price: parseFloat(p.price || '0'),
        currency: 'USD',
        stockQuantity: p.stock_quantity || 0,
        availability:
          p.stock_status === 'instock'
            ? ProductAvailability.IN_STOCK
            : ProductAvailability.OUT_OF_STOCK,
        category: p.categories?.[0]?.name || 'General',
        sourceTier: SourceTier.TIER1_CONNECTOR,
        confidenceScore: 1.0,
        images: p.images ? p.images.map((img: any) => img.src) : [],
      }));
    } catch (err: any) {
      this.logger.error(
        `[WooCommerceConnector] Gap B live search failed for business ${businessId}: ${err.message}`,
      );
      return [];
    }
  }
}
