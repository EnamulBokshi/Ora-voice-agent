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
import { SHOPIFY_API_VERSION } from '../../shopify/shopify.constants';
import { ShopifyTokenService } from '../../common/shopify-token/shopify-token.service';
import { mapShopifyVariants } from '../../common/utils/shopify-variant.util';

@Injectable()
export class ShopifyConnectorService {
  private readonly logger = new Logger(ShopifyConnectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly redisService: RedisService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly tokenService: ShopifyTokenService,
    @Optional()
    private readonly vectorStoreService?: VectorStoreService,
  ) {}

  verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
    // No fallback secret: an unset SHOPIFY_API_SECRET must fail every
    // verification rather than accept a signature anyone can compute.
    const secret = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!secret) {
      this.logger.error(
        `[ShopifyConnector] SHOPIFY_API_SECRET is not configured, so no webhook signature can be verified.`,
      );
      return false;
    }

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
      case 'app/uninstalled':
        await this.handleAppUninstalled(businessId);
        break;
      default:
        this.logger.warn(`[ShopifyConnector] Unhandled topic: ${topic}`);
    }

    return { status: 'processed', topic };
  }

  /**
   * Shopify sends `app/uninstalled` once, after the merchant removes the app.
   * The stored access token is dead at that point, so it is cleared rather than
   * left encrypted at rest, and the tenant is suspended so its API keys stop
   * authenticating. Catalog and conversation data are deliberately kept — a
   * reinstall restores the store, and `shop/redact` is the topic that deletes.
   */
  private async handleAppUninstalled(businessId: string) {
    await this.businessModel
      .updateOne(
        { _id: businessId as any },
        {
          $set: {
            status: 'suspended',
            keyStatus: 'suspended',
            connectedPlatform: 'none',
            shopifyUninstalledAt: new Date(),
          },
          $unset: { shopifyAccessToken: '' },
        },
      )
      .exec();

    this.logger.log(
      `[ShopifyConnector] App uninstalled for business ${businessId}; access token cleared and tenant suspended.`,
    );
  }

  private async handleProductUpsert(businessId: string, payload: any) {
    const nativeProductId = String(payload.id);
    const variant = payload.variants && payload.variants[0] ? payload.variants[0] : {};

    await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: [
        {
          nativeProductId,
          // Dot path so a sync never clobbers merchant overrides in `attributes`.
          'attributes.shopify': mapShopifyVariants(payload),
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
      ] as any,
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
    const business = await this.businessModel
      .findById(businessId as any)
      .select('+shopifyAccessToken +shopifyRefreshToken')
      .exec();

    const accessToken = business
      ? await this.tokenService.getValidAccessTokenFor(business)
      : undefined;

    if (!business?.shopifyStoreUrl || !accessToken) {
      this.logger.warn(
        `[ShopifyConnector] No Shopify credentials configured for business ${businessId} — Gap B live search skipped.`,
      );
      return [];
    }

    const storeUrl = business.shopifyStoreUrl.replace(/\/$/, '');
    const cleanTerms = (query || '')
      .replace(/[^\w\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    // 1. Try Shopify Admin GraphQL product search first (supports full-text wildcard across title & tags)
    try {
      const gqlQuery =
        cleanTerms.length > 0
          ? `status:ACTIVE AND (${cleanTerms.map((t) => `title:*${t}* OR tag:*${t}*`).join(' OR ')})`
          : 'status:ACTIVE';

      const graphqlEndpoint = `${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
      const gqlResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query SearchProducts($query: String!) {
            products(first: 5, query: $query) {
              edges {
                node {
                  id
                  title
                  descriptionHtml
                  productType
                  images(first: 3) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price
                        availableForSale
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          }`,
          variables: { query: gqlQuery },
        }),
      });

      if (gqlResponse.ok) {
        const gqlData: any = await gqlResponse.json();
        const edges = gqlData?.data?.products?.edges || [];
        if (edges.length > 0) {
          return edges.map(({ node }: any) => {
            const rawGqlId = node.id || '';
            const numericId = rawGqlId.split('/').pop() || rawGqlId;
            const variantEdges = node.variants?.edges || [];
            const firstVariant = variantEdges[0]?.node || {};
            const variants = variantEdges.map(({ node: v }: any) => {
              const vId = (v.id || '').split('/').pop() || v.id;
              return {
                variantId: vId,
                title: v.title,
                price: parseFloat(v.price || '0'),
                available: v.availableForSale ?? true,
                inventoryQuantity: v.inventoryQuantity ?? 0,
              };
            });

            return {
              nativeProductId: String(numericId),
              'attributes.shopify': {
                variants,
                requiresVariantSelection: variants.length > 1,
              },
              name: node.title || 'Untitled Product',
              description: node.descriptionHtml || '',
              price: parseFloat(firstVariant.price || '0'),
              currency: 'USD',
              stockQuantity: firstVariant.inventoryQuantity || 0,
              availability:
                (firstVariant.inventoryQuantity || 0) > 0 || firstVariant.availableForSale
                  ? ProductAvailability.IN_STOCK
                  : ProductAvailability.OUT_OF_STOCK,
              category: node.productType || 'General',
              sourceTier: SourceTier.TIER1_CONNECTOR,
              confidenceScore: 1.0,
              images: (node.images?.edges || []).map(({ node: img }: any) => img.url),
            };
          });
        }
      }
    } catch (gqlErr: any) {
      this.logger.warn(
        `[ShopifyConnector] GraphQL live search notice for business ${businessId}: ${gqlErr.message}`,
      );
    }

    // 2. Fallback to REST search if GraphQL yields no candidates
    const restUrl = `${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=5&status=active${cleanTerms[0] ? `&title=${encodeURIComponent(cleanTerms[0])}` : ''}`;
    try {
      this.logger.log(
        `[ShopifyConnector] Gap B live REST search fallback: GET ${restUrl}`,
      );

      const response = await fetch(restUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
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
          'attributes.shopify': mapShopifyVariants(p),
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

