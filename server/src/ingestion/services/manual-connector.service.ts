import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from '../../products/products.service';
import { ManualIngestDto } from '../dto/manual-ingest.dto';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';

@Injectable()
export class ManualConnectorService {
  private readonly logger = new Logger(ManualConnectorService.name);

  constructor(
    private readonly productsService: ProductsService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

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
          confidenceScore: 0.5,
        },
      ],
    });
  }

  /**
   * Gap B live fallback: call the merchant's configured custom endpoint to search for
   * products not yet in MongoDB (ingestion lag). Supports two modes:
   *   - search_only: GET {endpointUrl}?search={query}
   *   - id_lookup:   GET {endpointUrl}?id={query}
   * Returns [] if endpointUrl is not configured or the call fails.
   */
  async searchProductsLive(businessId: string, query: string): Promise<any[]> {
    const business = await this.businessModel.findById(businessId as any).exec();
    if (!business?.manualEndpointUrl) {
      this.logger.warn(
        `[ManualConnector] No manual endpoint URL configured for business ${businessId} — Gap B live search skipped.`,
      );
      return [];
    }

    const mode = business.manualEndpointMode || 'search_only';
    const paramKey = mode === 'id_lookup' ? 'id' : 'search';
    const url = `${business.manualEndpointUrl.replace(/\/$/, '')}?${paramKey}=${encodeURIComponent(query)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(business.manualEndpointHeaders || {}),
    };

    try {
      this.logger.log(
        `[ManualConnector] Gap B live search (mode=${mode}): GET ${url}`,
      );

      const response = await fetch(url, { headers });

      if (!response.ok) {
        this.logger.warn(
          `[ManualConnector] Manual endpoint returned HTTP ${response.status} for business ${businessId}.`,
        );
        return [];
      }

      const data: any = await response.json();
      const raw: any[] = Array.isArray(data) ? data : (data.products || data.items || [data]);

      return raw.map((item: any) => ({
        nativeProductId: String(item.id || item.nativeProductId || `manual_${Date.now()}`),
        name: item.name || item.title || 'Untitled Product',
        description: item.description || '',
        price: parseFloat(item.price || '0'),
        currency: 'USD',
        stockQuantity: item.stockQuantity || item.stock_quantity || 5,
        availability:
          (item.availability || item.stock_status) === 'out_of_stock' ||
          (item.availability || item.stock_status) === 'outofstock'
            ? ProductAvailability.OUT_OF_STOCK
            : ProductAvailability.IN_STOCK,
        category: item.category || 'General',
        sourceTier: SourceTier.TIER4_MANUAL,
        confidenceScore: 0.5,
        images: item.images || [],
      }));
    } catch (err: any) {
      this.logger.error(
        `[ManualConnector] Gap B live search failed for business ${businessId}: ${err.message}`,
      );
      return [];
    }
  }
}
