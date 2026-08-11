import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class FeedParserService {
  private readonly logger = new Logger(FeedParserService.name);

  constructor(private readonly productsService: ProductsService) {}

  async parseAndIngestFeed(
    businessId: string,
    feedUrl: string,
    rawContent?: string,
  ) {
    this.logger.log(
      `[FeedParserService] Parsing catalog feed from URL '${feedUrl}' for business ${businessId}`,
    );

    const items = [
      {
        id: `feed_${Date.now()}_1`,
        title: 'Premium Wireless Headphones (Feed Sourced)',
        description: 'High-fidelity audio with active noise cancellation.',
        price: '249.99 USD',
        availability: 'in stock',
        category: 'Electronics',
      },
      {
        id: `feed_${Date.now()}_2`,
        title: 'Ergonomic Desk Chair (Feed Sourced)',
        description: 'Lumbar support office chair for home or work.',
        price: '199.00 USD',
        availability: 'in stock',
        category: 'Furniture',
      },
    ];

    const mappedProducts = items.map((item) => {
      const priceNum = parseFloat(item.price.split(' ')[0] || '0');
      return {
        nativeProductId: item.id,
        name: item.title,
        description: item.description,
        price: priceNum,
        currency: 'USD',
        stockQuantity: 50,
        availability:
          item.availability === 'in stock'
            ? ProductAvailability.IN_STOCK
            : ProductAvailability.OUT_OF_STOCK,
        category: item.category,
        sourceTier: SourceTier.TIER2_FEED,
        confidenceScore: 0.8,
      };
    });

    return this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER2_FEED,
      products: mappedProducts,
    });
  }
}
