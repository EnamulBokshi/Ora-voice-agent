import * as crypto from 'crypto';

/**
 * Computes deterministic SHA-256 hashes to detect content changes and avoid
 * redundant database writes and expensive vector re-embeddings.
 */
export class ContentHasher {
  /**
   * Generates SHA-256 hash from text or markdown
   */
  static hashText(content: string): string {
    if (!content) return '';
    const normalized = content.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Generates SHA-256 hash from a product payload
   */
  static hashProduct(product: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    stockQuantity?: number;
    availability?: string;
    category?: string;
    images?: string[];
  }): string {
    const signature = [
      product.name || '',
      product.description || '',
      product.price !== undefined ? String(product.price) : '',
      product.currency || '',
      product.stockQuantity !== undefined ? String(product.stockQuantity) : '',
      product.availability || '',
      product.category || '',
      (product.images || []).join(','),
    ].join('|||');

    return crypto.createHash('sha256').update(signature, 'utf8').digest('hex');
  }
}
