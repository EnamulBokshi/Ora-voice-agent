import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from './embedding.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { EntityType, SearchResultItem } from '../interfaces/vector-entry.interface';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly embeddingService: EmbeddingService,
    private readonly productsService: ProductsService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async searchProducts(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number } = {},
  ) {
    const limit = Math.min(options.limit || 5, 5); // Candidate cap: max 5
    const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.65;

    const queryVector = await this.embeddingService.generateEmbedding(queryText);

    const vectorResults = await this.vectorStoreService.searchVectors(
      businessId,
      queryVector,
      {
        entityType: EntityType.PRODUCT,
        limit,
        confidenceThreshold: threshold,
      },
    );

    let fallbackTriggered = false;
    let finalResults: SearchResultItem[] = [];

    if (vectorResults.length === 0) {
      // Step 2a: Zero / Low-confidence fallback
      fallbackTriggered = true;
      this.logger.log(`[RAG Engine] RAG_FALLBACK_TRIGGERED for query: "${queryText}" (businessId: ${businessId})`);

      const fallbackProducts = await this.productsService.findAll(businessId, {
        search: queryText,
        limit,
      });

      finalResults = fallbackProducts.items.map((prod) => ({
        entityId: prod._id.toString(),
        entityType: EntityType.PRODUCT,
        text: `${prod.name} ${prod.description || ''} ${prod.category || ''}`.trim(),
        score: prod.confidenceScore || 0.7,
        data: prod,
      }));

      // Self-healing catalog: Asynchronously queue live-found products for vector embedding
      for (const prod of fallbackProducts.items) {
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
            this.logger.error(`[Self-Healing RAG] Failed to index product ${prod._id}: ${err.message}`),
          );
      }
    } else {
      // Hydrate candidate vector results with live product details
      finalResults = await Promise.all(
        vectorResults.map(async (res) => {
          try {
            const productData = await this.productsService.findOne(businessId, res.entityId);
            return {
              ...res,
              data: productData,
            };
          } catch {
            return res;
          }
        }),
      );
    }

    return {
      query: queryText,
      fallbackTriggered,
      results: finalResults,
    };
  }

  async searchKnowledge(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number } = {},
  ) {
    const limit = options.limit || 5;
    const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.60;

    const queryVector = await this.embeddingService.generateEmbedding(queryText);

    const vectorResults = await this.vectorStoreService.searchVectors(
      businessId,
      queryVector,
      {
        entityType: EntityType.KNOWLEDGE_CHUNK,
        limit,
        confidenceThreshold: threshold,
      },
    );

    return {
      query: queryText,
      results: vectorResults,
    };
  }

  async searchCombined(
    businessId: string,
    queryText: string,
    options: { limit?: number; confidenceThreshold?: number } = {},
  ) {
    const [productsRes, knowledgeRes] = await Promise.all([
      this.searchProducts(businessId, queryText, options),
      this.searchKnowledge(businessId, queryText, options),
    ]);

    return {
      query: queryText,
      fallbackTriggered: productsRes.fallbackTriggered,
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
    const knowledgeDocs = await this.knowledgeService.findAll(businessId);
    for (const doc of knowledgeDocs) {
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
}
