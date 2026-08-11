import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { ManualIngestDto } from '../dto/manual-ingest.dto';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class ManualConnectorService {
  private readonly logger = new Logger(ManualConnectorService.name);

  constructor(private readonly productsService: ProductsService) {}

  async processManualMapping(businessId: string, dto: ManualIngestDto) {
    const { rawPayload, fieldMapping } = dto;

    this.logger.log(
      `[ManualConnectorService] Processing custom field mapping for business ${businessId}`,
    );

    const nativeProductId = String(rawPayload[fieldMapping.idField] || `custom_${Date.now()}`);
    const name = String(rawPayload[fieldMapping.nameField] || 'Untitled Product');
    const price = parseFloat(rawPayload[fieldMapping.priceField] || '0');
    const description = fieldMapping.descriptionField
      ? String(rawPayload[fieldMapping.descriptionField] || '')
      : '';
    const category = fieldMapping.categoryField
      ? String(rawPayload[fieldMapping.categoryField] || 'General')
      : 'General';

    return this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER4_MANUAL,
      products: [
        {
          nativeProductId,
          name,
          description,
          price,
          currency: 'USD',
          stockQuantity: 5,
          availability: ProductAvailability.IN_STOCK,
          category,
          sourceTier: SourceTier.TIER4_MANUAL,
          confidenceScore: 0.2,
        },
      ],
    });
  }
}
