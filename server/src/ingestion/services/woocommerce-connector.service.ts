import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class WooCommerceConnectorService {
  private readonly logger = new Logger(WooCommerceConnectorService.name);

  constructor(private readonly productsService: ProductsService) {}

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

    return this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: mappedProducts,
    });
  }
}
