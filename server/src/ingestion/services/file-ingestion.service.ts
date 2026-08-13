import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as csv from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { ProductsService } from '../../products/products.service';
import { VectorStoreService } from '../../vector/vector-store.service';
import { EntityType } from '../../vector/interfaces/vector-entry.interface';
import {
  SourceTier,
  ProductAvailability,
} from '../../products/schemas/product.schema';

export interface IngestionSummary {
  totalParsed: number;
  ingested: number;
  embedded: number;
  errors: string[];
  detectedMapping: Record<string, string>;
}

const FIELD_ALIASES: Record<string, string[]> = {
  nativeProductId: ['sku', 'id', 'product id', 'productid', 'item code', 'itemcode', 'code', 'product sku', 'product_id', 'item_id'],
  name: ['name', 'title', 'product name', 'productname', 'product', 'product title', 'item name', 'itemname'],
  price: ['price', 'cost', 'amount', 'mrp', 'selling price', 'sale price', 'unit price', 'unitprice'],
  description: ['description', 'desc', 'details', 'specs', 'specifications', 'product description', 'productdescription', 'summary'],
  category: ['category', 'type', 'department', 'product type', 'producttype', 'product category', 'productcategory'],
  stockQuantity: ['stock', 'quantity', 'inventory', 'qty', 'stock quantity', 'stockquantity', 'available', 'in stock', 'count'],
  images: ['image', 'image url', 'imageurl', 'img', 'photo', 'images', 'image link', 'imagelink', 'picture', 'picture url'],
  availability: ['availability', 'status', 'availability status', 'stock status', 'availabilitystatus'],
  currency: ['currency', 'curr', 'currency code', 'currencycode'],
};

@Injectable()
export class FileIngestionService {
  private readonly logger = new Logger(FileIngestionService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly configService: ConfigService,
  ) {}

  async ingestFile(
    businessId: string,
    file: Express.Multer.File,
    fieldMapping?: Record<string, string>,
  ): Promise<IngestionSummary> {
    const errors: string[] = [];
    const ext = this.getFileExtension(file.originalname);
    const mimeType = file.mimetype;

    this.logger.log(
      `[FileIngestion] Processing file: ${file.originalname} (${ext}, ${mimeType}, ${(file.size / 1024).toFixed(1)}KB) for business ${businessId}`,
    );

    let rows: Record<string, any>[] = [];

    try {
      rows = this.parseFile(file.buffer, ext, mimeType);
    } catch (err: any) {
      this.logger.error(`[FileIngestion] Failed to parse file: ${err.message}`);
      return {
        totalParsed: 0,
        ingested: 0,
        embedded: 0,
        errors: [`File parsing failed: ${err.message}`],
        detectedMapping: {},
      };
    }

    if (rows.length === 0) {
      return {
        totalParsed: 0,
        ingested: 0,
        embedded: 0,
        errors: ['No product rows found in file.'],
        detectedMapping: {},
      };
    }

    const headers = Object.keys(rows[0]).map((h) => h.trim());
    const mapping = fieldMapping || this.autoDetectMapping(headers);
    this.logger.log(`[FileIngestion] Using field mapping: ${JSON.stringify(mapping)}`);

    const products = rows
      .map((row, index) => {
        try {
          return this.normalizeRow(row, mapping, index, businessId);
        } catch (err: any) {
          errors.push(`Row ${index + 2}: ${err.message}`);
          return null;
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (products.length === 0) {
      return {
        totalParsed: rows.length,
        ingested: 0,
        embedded: 0,
        errors: errors.length > 0 ? errors : ['No valid product rows after mapping.'],
        detectedMapping: mapping,
      };
    }

    // Batch-sync all products to MongoDB
    const syncResult = await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER4_MANUAL,
      products,
    });

    this.logger.log(
      `[FileIngestion] Batch sync: upserted=${syncResult.upsertedCount}, modified=${syncResult.modifiedCount}, matched=${syncResult.matchedCount}`,
    );

    // Fetch synced products to get their _ids for embedding
    const syncedProducts = await this.productsService.findAll(businessId, {
      limit: 500,
      search: undefined,
    });

    const embeddedNativeIds = new Set(products.map((p) => p.nativeProductId));
    const toEmbed = syncedProducts.items.filter((p) =>
      embeddedNativeIds.has(p.nativeProductId),
    );

    // Fire-and-forget embedding for each product
    let embeddedCount = 0;
    for (const prod of toEmbed) {
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
        .then(() => {
          embeddedCount++;
        })
        .catch((err) => {
          this.logger.error(
            `[FileIngestion] Failed to embed product ${prod._id}: ${err.message}`,
          );
        });
    }

    return {
      totalParsed: rows.length,
      ingested: syncResult.upsertedCount + syncResult.modifiedCount,
      embedded: toEmbed.length,
      errors,
      detectedMapping: mapping,
    };
  }

  private getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private parseFile(
    buffer: Buffer,
    ext: string,
    mimeType: string,
  ): Record<string, any>[] {
    if (ext === 'csv' || ext === 'tsv' || mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
      return this.parseDelimited(buffer, ext === 'tsv' ? '\t' : undefined);
    }

    if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return this.parseXlsx(buffer);
    }

    if (ext === 'txt' || mimeType === 'text/plain') {
      return this.parseTxt(buffer);
    }

    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return this.parsePdf(buffer);
    }

    // Fallback: try CSV parsing
    this.logger.warn(`[FileIngestion] Unknown file type (${ext}/${mimeType}), attempting CSV parse`);
    return this.parseDelimited(buffer);
  }

  private parseDelimited(buffer: Buffer, delimiter?: string): Record<string, any>[] {
    const content = buffer.toString('utf-8');
    const options: csv.Options = {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter || ',',
    };
    return csv.parse(content, options);
  }

  private parseXlsx(buffer: Buffer): Record<string, any>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  private parseTxt(buffer: Buffer): Record<string, any>[] {
    const content = buffer.toString('utf-8');
    const firstLine = content.split('\n')[0];

    // Detect delimiter from first line
    if (firstLine.includes('\t')) {
      return this.parseDelimited(buffer, '\t');
    }
    if (firstLine.includes('|')) {
      return this.parseDelimited(buffer, '|');
    }
    if (firstLine.includes(',')) {
      return this.parseDelimited(buffer, ',');
    }
    if (firstLine.includes(';')) {
      return this.parseDelimited(buffer, ';');
    }

    // No delimiter found — try comma as default
    return this.parseDelimited(buffer);
  }

  private parsePdf(buffer: Buffer): Record<string, any>[] {
    // pdf-parse is loaded dynamically to avoid import issues during build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = pdfParse(buffer);
    const text = data.text || '';

    if (!text.trim()) {
      return [];
    }

    // Try to detect table-like structure in PDF text
    const lines = text.split('\n').filter((l: string) => l.trim());
    const rows: Record<string, any>[] = [];

    // Check if lines look like delimited data
    const delimiter = this.detectDelimiter(lines.slice(0, 5));
    if (delimiter) {
      for (const line of lines) {
        const values = line.split(delimiter).map((v: string) => v.trim());
        if (values.length >= 2) {
          const row: Record<string, any> = {};
          values.forEach((v: string, i: number) => {
            row[`column_${i}`] = v;
          });
          rows.push(row);
        }
      }
    }

    return rows;
  }

  private detectDelimiter(lines: string[]): string | null {
    for (const delim of ['\t', '|', ',', ';']) {
      const counts = lines.map((l) => (l.match(new RegExp(delim === '\t' ? '\t' : delim, 'g')) || []).length);
      if (counts.every((c) => c > 0) && counts[0] === counts[counts.length - 1]) {
        return delim;
      }
    }
    return null;
  }

  private autoDetectMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      const match = headers.find((h) => {
        const normalized = h.toLowerCase().trim();
        return aliases.some((alias) => normalized === alias || normalized.includes(alias));
      });
      if (match) {
        mapping[field] = match;
      }
    }

    return mapping;
  }

  private normalizeRow(
    row: Record<string, any>,
    mapping: Record<string, string>,
    rowIndex: number,
    businessId: string,
  ) {
    const getValue = (field: string): any => {
      const columnName = mapping[field];
      if (!columnName) return undefined;
      return row[columnName];
    };

    const name = getValue('name');
    const price = getValue('price');

    if (!name || String(name).trim() === '') {
      throw new Error('Product name is required');
    }

    const parsedPrice = price !== undefined ? parseFloat(String(price).replace(/[^0-9.]/g, '')) : 0;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      throw new Error(`Invalid price value: ${price}`);
    }

    const nativeProductId =
      getValue('nativeProductId') ||
      `file_${businessId.substring(0, 8)}_${Date.now()}_${rowIndex}`;

    const stockQty = getValue('stockQuantity');
    const parsedStock = stockQty !== undefined ? parseInt(String(stockQty).replace(/[^0-9-]/g, ''), 10) : 0;

    const availabilityRaw = getValue('availability');
    const availability = this.parseAvailability(String(availabilityRaw || ''));

    const imagesRaw = getValue('images');
    const images = imagesRaw
      ? String(imagesRaw)
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const currency = getValue('currency') || 'USD';

    return {
      nativeProductId: String(nativeProductId).trim(),
      name: String(name).trim(),
      description: getValue('description') ? String(getValue('description')).trim() : '',
      price: parsedPrice,
      currency: String(currency).trim(),
      stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
      availability,
      category: getValue('category') ? String(getValue('category')).trim() : 'General',
      images,
      sourceTier: SourceTier.TIER4_MANUAL,
      confidenceScore: 0.5,
    };
  }

  private parseAvailability(value: string): ProductAvailability {
    const v = value.toLowerCase().trim();
    if (v.includes('out') || v.includes('unavailable') || v === '0') {
      return ProductAvailability.OUT_OF_STOCK;
    }
    if (v.includes('pre') || v.includes('coming')) {
      return ProductAvailability.PREORDER;
    }
    if (v.includes('discontinue') || v.includes('retir') || v.includes('end of life')) {
      return ProductAvailability.DISCONTINUED;
    }
    return ProductAvailability.IN_STOCK;
  }
}
