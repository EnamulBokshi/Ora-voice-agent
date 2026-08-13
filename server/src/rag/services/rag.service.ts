import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { VectorStoreService } from '../../vector/vector-store.service';
import { EmbeddingService } from '../../vector/embedding.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { EventsService } from '../../events/events.service';
import { EventType } from '../../events/schemas/event.schema';
import { EntityType, SearchResultItem } from '../../vector/interfaces/vector-entry.interface';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { ShopifyConnectorService } from '../../ingestion/services/shopify-connector.service';
import { WooCommerceConnectorService } from '../../ingestion/services/woocommerce-connector.service';
import { ManualConnectorService } from '../../ingestion/services/manual-connector.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

/** Fallback tier label recorded in the RAG_FALLBACK_TRIGGERED event payload. */
export type FallbackTier =
  | 'none'
  | 'mongo_regex'
  | 'live_shopify'
  | 'live_woocommerce'
  | 'live_manual';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly embeddingService: EmbeddingService,
    private readonly productsService: ProductsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly configService: ConfigService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @Optional() private readonly eventsService?: EventsService,
    @Optional() private readonly shopifyConnector?: ShopifyConnectorService,
    @Optional() private readonly wooCommerceConnector?: WooCommerceConnectorService,
    @Optional() private readonly manualConnector?: ManualConnectorService,
  ) {}

  // ---------------------------------------------------------------------------
  // Fix 4: read thresholds from env, fall back to safe defaults
  // ---------------------------------------------------------------------------
  private get productThreshold(): number {
    return parseFloat(
      this.configService.get<string>('RAG_PRODUCT_CONFIDENCE_THRESHOLD') ?? '0.65',
    );
  }

  private get knowledgeThreshold(): number {
    return parseFloat(
      this.configService.get<string>('RAG_KNOWLEDGE_CONFIDENCE_THRESHOLD') ?? '0.60',
    );
  }

  // ---------------------------------------------------------------------------
  // Public search methods
  // ---------------------------------------------------------------------------

  async searchProducts(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number } = {},
  ) {
    const limit = Math.min(options.limit || 5, 5); // candidate cap: max 5
    const threshold =
      options.confidenceThreshold !== undefined
        ? options.confidenceThreshold
        : this.productThreshold;

    // 1. Embed the query (Fix 3: use .vector field)
    const embeddingResult = await this.embeddingService.generateEmbedding(queryText);

    const vectorResults = await this.vectorStoreService.searchVectors(
      businessId,
      embeddingResult.vector,
      { entityType: EntityType.PRODUCT, limit, confidenceThreshold: threshold },
    );

    let fallbackTriggered = false;
    let fallbackTier: FallbackTier = 'none';
    let finalResults: SearchResultItem[] = [];

    if (vectorResults.length > 0) {
      // --- Fast Path: hydrate vector candidates with live product details ---
      finalResults = await Promise.all(
        vectorResults.map(async (res) => {
          try {
            const productData = await this.productsService.findOne(businessId, res.entityId);
            return { ...res, data: productData };
          } catch {
            return res;
          }
        }),
      );
    } else {
      // -----------------------------------------------------------------------
      // Gap A fallback: product exists in Mongo but isn't embedded yet.
      // -----------------------------------------------------------------------
      fallbackTriggered = true;
      const mongoResults = await this.productsService.findAll(businessId, {
        search: queryText,
        limit,
      });

      if (mongoResults.items.length > 0) {
        fallbackTier = 'mongo_regex';

        this.logger.log(
          `[RAG Engine] Gap A (mongo_regex) fallback for query: "${queryText}" (businessId: ${businessId})`,
        );

        finalResults = mongoResults.items.map((prod) => ({
          entityId: prod._id.toString(),
          entityType: EntityType.PRODUCT,
          text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
          score: prod.confidenceScore || 0.7,
          data: prod,
        }));

        // Self-healing: asynchronously embed these Mongo-found products
        for (const prod of mongoResults.items) {
          this.vectorStoreService
            .upsertVector(businessId, {
              entityType: EntityType.PRODUCT,
              entityId: prod._id.toString(),
              text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
              metadata: {
                nativeProductId: prod.nativeProductId,
                price: prod.price,
                category: prod.category,
              },
            })
            .catch((err) =>
              this.logger.error(
                `[Self-Healing RAG] Failed to index product ${prod._id}: ${err.message}`,
              ),
            );
        }
      } else {
        // -------------------------------------------------------------------
        // Gap B fallback: product doesn't exist in Mongo at all yet.
        // Call the merchant's live data source based on connectedPlatform.
        // -------------------------------------------------------------------
        const liveResults = await this.runGapBFallback(businessId, queryText);

        if (liveResults.length > 0) {
          fallbackTier = liveResults[0]._fallbackTier;

          this.logger.log(
            `[RAG Engine] Gap B (${fallbackTier}) fallback resolved query: "${queryText}" (businessId: ${businessId})`,
          );

          finalResults = liveResults.map((prod) => ({
            entityId: prod.nativeProductId,
            entityType: EntityType.PRODUCT,
            text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
            score: prod.confidenceScore || 0.7,
            data: prod,
          }));

          // Self-healing: asynchronously ingest and embed live-found products
          this.ingestAndEmbedLiveProducts(businessId, liveResults).catch((err) =>
            this.logger.error(
              `[Self-Healing RAG] Gap B async ingest failed: ${err.message}`,
            ),
          );
        }
        // If liveResults is empty, finalResults stays [] — "not found" behavior
      }

      // Emit fallback event with tier label (Gap A and Gap B share the same EventType)
      if (this.eventsService) {
        this.eventsService
          .logEvent(businessId, EventType.RAG_FALLBACK_TRIGGERED, {
            queryText,
            fallbackTier,
          })
          .catch((err) =>
            this.logger.error(`Failed to log RAG_FALLBACK_TRIGGERED event: ${err.message}`),
          );
      }
    }

    return {
      query: queryText,
      fallbackTriggered,
      fallbackTier,
      results: finalResults,
    };
  }

  async searchKnowledge(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number } = {},
  ) {
    const limit = options.limit || 5;
    const threshold =
      options.confidenceThreshold !== undefined
        ? options.confidenceThreshold
        : this.knowledgeThreshold;

    // Fix 3: extract .vector from EmbeddingResult
    const embeddingResult = await this.embeddingService.generateEmbedding(queryText);

    const vectorResults = await this.vectorStoreService.searchVectors(
      businessId,
      embeddingResult.vector,
      { entityType: EntityType.KNOWLEDGE_CHUNK, limit, confidenceThreshold: threshold },
    );

    return {
      query: queryText,
      results: vectorResults,
    };
  }

  async searchCombined(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number; entityType?: EntityType } = {},
  ) {
    const fetchProducts = !options.entityType || options.entityType === EntityType.PRODUCT;
    const fetchKnowledge = !options.entityType || options.entityType === EntityType.KNOWLEDGE_CHUNK;

    const [productsRes, knowledgeRes] = await Promise.all([
      fetchProducts
        ? this.searchProducts(businessId, queryText, options)
        : Promise.resolve({ fallbackTriggered: false, fallbackTier: 'none' as const, results: [] }),
      fetchKnowledge
        ? this.searchKnowledge(businessId, queryText, options)
        : Promise.resolve({ results: [] }),
    ]);

    return {
      query: queryText,
      fallbackTriggered: productsRes.fallbackTriggered,
      fallbackTier: productsRes.fallbackTier,
      products: productsRes.results,
      knowledge: knowledgeRes.results,
    };
  }

  async reindexTenant(businessId: string) {
    this.logger.log(`[RAG Engine] Starting bulk re-indexing for tenant ${businessId}...`);

    let indexedProducts = 0;
    let indexedChunks = 0;

    // 1. Index all active products
    const productsRes = await this.productsService.findAll(businessId, { limit: 500 });
    for (const prod of productsRes.items) {
      await this.vectorStoreService.upsertVector(businessId, {
        entityType: EntityType.PRODUCT,
        entityId: prod._id.toString(),
        text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
        metadata: {
          nativeProductId: prod.nativeProductId,
          price: prod.price,
          category: prod.category,
        },
      });
      indexedProducts++;
    }

    // 2. Index all knowledge chunks
    const knowledgeRes = await this.knowledgeService.findAll(businessId, undefined, undefined, { limit: 1000 });
    for (const doc of knowledgeRes.items) {
      const chunks = await this.knowledgeService.findChunksForDoc(
        businessId,
        doc._id.toString(),
      );
      for (const chunk of chunks) {
        await this.vectorStoreService.upsertVector(businessId, {
          entityType: EntityType.KNOWLEDGE_CHUNK,
          entityId: chunk._id.toString(),
          text: chunk.text,
          metadata: {
            knowledgeBaseId: doc._id.toString(),
            docTitle: doc.title,
            docType: doc.docType,
          },
        });
        indexedChunks++;
      }
    }

    return {
      message: 'Tenant bulk re-indexing completed successfully.',
      indexedProducts,
      indexedChunks,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Gap B: call the merchant's live platform (Shopify / WooCommerce / Manual)
   * when the product is absent from MongoDB. Returns raw product payloads with
   * a `_fallbackTier` label attached for event logging.
   * Tier 2/3 merchants have no live query capability — returns [].
   */
  private async runGapBFallback(
    businessId: string,
    queryText: string,
  ): Promise<any[]> {
    const business = await this.businessModel
      .findById(businessId as any)
      .exec();
    const platform = business?.connectedPlatform || 'none';

    this.logger.log(
      `[RAG Engine] Gap B live fallback — platform: ${platform} (businessId: ${businessId}, query: "${queryText}")`,
    );

    let raw: any[] = [];
    let tier: FallbackTier = 'none';

    if (platform === 'shopify' && this.shopifyConnector) {
      raw = await this.shopifyConnector.searchProductsLive(businessId, queryText);
      tier = 'live_shopify';
    } else if (platform === 'woocommerce' && this.wooCommerceConnector) {
      raw = await this.wooCommerceConnector.searchProductsLive(businessId, queryText);
      tier = 'live_woocommerce';
    } else if (platform === 'manual' && this.manualConnector) {
      raw = await this.manualConnector.searchProductsLive(businessId, queryText);
      tier = 'live_manual';
    } else {
      // feed / passive / none — no live query capability
      this.logger.log(
        `[RAG Engine] Gap B not applicable for platform "${platform}" — no live query capability.`,
      );
    }

    // Attach the tier label so the caller can include it in the event payload
    return raw.map((item) => ({ ...item, _fallbackTier: tier }));
  }

  /**
   * Asynchronously batch-sync Gap B live results into MongoDB, then embed each
   * into the vector store so future queries hit the fast RAG path.
   */
  private async ingestAndEmbedLiveProducts(
    businessId: string,
    products: any[],
  ): Promise<void> {
    const cleanProducts = products.map(({ _fallbackTier, ...rest }) => rest);

    // Determine sourceTier from the first product
    const sourceTier = cleanProducts[0]?.sourceTier || SourceTier.TIER1_CONNECTOR;

    await this.productsService.batchSync(businessId, {
      sourceTier,
      products: cleanProducts,
    });

    for (const prod of cleanProducts) {
      await this.vectorStoreService.upsertVector(businessId, {
        entityType: EntityType.PRODUCT,
        entityId: prod.nativeProductId,
        text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
        metadata: {
          nativeProductId: prod.nativeProductId,
          price: prod.price,
          category: prod.category,
        },
      });
    }
  }
}
