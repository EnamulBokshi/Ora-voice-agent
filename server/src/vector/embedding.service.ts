import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import * as crypto from 'crypto';

export interface EmbeddingResult {
  vector: number[];
  /** e.g. "text-embedding-004" or "fallback-term-hash" */
  embeddingModel: string;
  /** e.g. "gemini-v1" or "deterministic-v1" */
  embeddingVersion: string;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  /**
   * Returns the currently active embedding model name (e.g. "text-embedding-004" or "fallback-term-hash").
   */
  getActiveModelName(): string {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      const rawModel =
        this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
        'models/text-embedding-004';
      const fullModel = rawModel.startsWith('models/')
        ? rawModel
        : `models/${rawModel}`;
      return fullModel.replace('models/', '');
    }
    return 'fallback-term-hash';
  }

  /**
   * Generates 768-dimensional normalized text vector embeddings.
   * Returns the vector alongside the model name and version that produced it.
   * Checks Redis L1 cache first before issuing external API requests.
   * Fallbacks to deterministic term-hashing vectorizer if API key is unconfigured.
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const trimmed = text.trim();
    const textHash = crypto
      .createHash('sha256')
      .update(trimmed)
      .digest('hex');
    const cacheKey = `embed:cache:${textHash}`;

    // 1. Check Redis Hot Cache first (< 2ms)
    if (this.redisService) {
      try {
        const cached = await this.redisService.getClient().get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as EmbeddingResult;
        }
      } catch (err: any) {
        // Cache miss or non-fatal Redis error
      }
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (apiKey) {
      try {
        const rawModel =
          this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
          'models/text-embedding-004';
        const fullModel = rawModel.startsWith('models/')
          ? rawModel
          : `models/${rawModel}`;
        const modelPath = fullModel.replace('models/', '');

        // Production Gemini Embedding API integration point
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: fullModel,
              content: { parts: [{ text: trimmed }] },
            }),
          },
        );

        if (response.ok) {
          const data: any = await response.json();
          if (data.embedding?.values) {
            const result: EmbeddingResult = {
              vector: this.normalizeVector(data.embedding.values),
              embeddingModel: modelPath,
              embeddingVersion: 'gemini-v1',
            };

            // Cache in Redis with 24-hour TTL (86400 seconds)
            if (this.redisService) {
              this.redisService
                .getClient()
                .set(cacheKey, JSON.stringify(result), 'EX', 86400)
                .catch(() => {});
            }

            return result;
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Gemini Embedding API call failed: ${err.message}. Using fallback vectorizer.`,
        );
      }
    }

    // Fallback deterministic vector generator for local testing
    return {
      vector: this.generateFallbackVector(text),
      embeddingModel: 'fallback-term-hash',
      embeddingVersion: 'deterministic-v1',
    };
  }

  /**
   * Generates embeddings in batch using Gemini's batchEmbedContents API.
   * Leverages Redis cache for already computed embeddings and only sends uncached items.
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    const results: Array<EmbeddingResult | null> = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];

    // 1. Check Redis cache for each text
    if (this.redisService) {
      await Promise.all(
        texts.map(async (text, idx) => {
          const trimmed = text.trim();
          const textHash = crypto.createHash('sha256').update(trimmed).digest('hex');
          const cacheKey = `embed:cache:${textHash}`;
          try {
            const cached = await this.redisService!.getClient().get(cacheKey);
            if (cached) {
              results[idx] = JSON.parse(cached) as EmbeddingResult;
            } else {
              uncachedIndices.push(idx);
            }
          } catch {
            uncachedIndices.push(idx);
          }
        }),
      );
    } else {
      texts.forEach((_, idx) => uncachedIndices.push(idx));
    }

    if (uncachedIndices.length === 0) {
      return results as EmbeddingResult[];
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        const rawModel =
          this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
          'models/text-embedding-004';
        const fullModel = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
        const modelPath = fullModel.replace('models/', '');

        // Chunk into max 100 requests per Gemini batchEmbedContents call
        const chunkSize = 100;
        for (let c = 0; c < uncachedIndices.length; c += chunkSize) {
          const batchIndices = uncachedIndices.slice(c, c + chunkSize);
          const requests = batchIndices.map((idx) => ({
            model: fullModel,
            content: { parts: [{ text: texts[idx].trim() }] },
          }));

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:batchEmbedContents?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests }),
            },
          );

          if (response.ok) {
            const data: any = await response.json();
            const embeddings: any[] = data.embeddings || [];
            for (let i = 0; i < batchIndices.length; i++) {
              const origIdx = batchIndices[i];
              if (embeddings[i]?.values) {
                const itemResult: EmbeddingResult = {
                  vector: this.normalizeVector(embeddings[i].values),
                  embeddingModel: modelPath,
                  embeddingVersion: 'gemini-v1',
                };
                results[origIdx] = itemResult;

                if (this.redisService) {
                  const textHash = crypto.createHash('sha256').update(texts[origIdx].trim()).digest('hex');
                  this.redisService
                    .getClient()
                    .set(`embed:cache:${textHash}`, JSON.stringify(itemResult), 'EX', 86400)
                    .catch(() => {});
                }
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Gemini batchEmbedContents failed: ${err.message}. Falling back to single/fallback.`);
      }
    }

    // Fill any remaining unassigned results with individual or fallback vector
    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        results[i] = await this.generateEmbedding(texts[i]);
      }
    }

    return results as EmbeddingResult[];
  }

  /**
   * Computes cosine similarity score between two normalized vectors (0.0 to 1.0)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, similarity));
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vector : vector.map((val) => val / norm);
  }

  private generateFallbackVector(text: string, dimensions = 768): number[] {
    const vector = new Array(dimensions).fill(0);
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dimensions;
      vector[index] += 1;
    }

    return this.normalizeVector(vector);
  }
}
