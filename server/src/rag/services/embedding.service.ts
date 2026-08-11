import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates 768-dimensional normalized text vector embeddings.
   * Fallbacks to deterministic term-hashing vectorizer if API key is unconfigured.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (apiKey) {
      try {
        // Production Gemini Embedding API integration point (text-embedding-004)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text }] },
            }),
          },
        );

        if (response.ok) {
          const data: any = await response.json();
          if (data.embedding?.values) {
            return this.normalizeVector(data.embedding.values);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Gemini Embedding API call failed: ${err.message}. Using fallback vectorizer.`);
      }
    }

    // Fallback deterministic vector generator for local testing
    return this.generateFallbackVector(text);
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
