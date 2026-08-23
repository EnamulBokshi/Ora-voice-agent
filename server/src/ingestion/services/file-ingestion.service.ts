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
  nativeProductId: ['sku', 'id', 'product id', 'productid', 'item code', 'itemcode', 'code', 'product sku', 'product_id', 'item_id', 'barcode', 'upc'],
  name: ['name', 'title', 'product name', 'productname', 'product', 'product title', 'item name', 'itemname', 'item', 'product_title', 'product_name', 'model', 'article'],
  price: ['price', 'cost', 'amount', 'mrp', 'selling price', 'sale price', 'unit price', 'unitprice', 'tk', 'bdt', 'taka', 'rate', 'price_bdt', 'price_usd', 'retail price'],
  description: ['description', 'desc', 'details', 'specs', 'specifications', 'product description', 'productdescription', 'summary', 'about', 'features'],
  category: ['category', 'type', 'department', 'product type', 'producttype', 'product category', 'productcategory', 'genre', 'group', 'collection'],
  stockQuantity: ['stock', 'quantity', 'inventory', 'qty', 'stock quantity', 'stockquantity', 'available', 'in stock', 'count', 'amount in stock', 'pieces', 'pcs'],
  images: ['image', 'image url', 'imageurl', 'img', 'photo', 'images', 'image link', 'imagelink', 'picture', 'picture url', 'thumbnail', 'photo url'],
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
      rows = await this.parseFile(file.buffer, ext, mimeType);
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
    this.logger.log(`[FileIngestion] Headers detected from file: ${JSON.stringify(headers)}`);
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
      limit: 1000,
      search: undefined,
    });

    const embeddedNativeIds = new Set(products.map((p) => p.nativeProductId));
    const toEmbed = syncedProducts.items.filter((p) =>
      embeddedNativeIds.has(p.nativeProductId),
    );

    // Embed products into Gemini Vector Index with bulk batch embedding
    let embeddedCount = 0;
    const batchEntries = toEmbed.map((prod) => {
      const specsStr = (prod as any).attributes
        ? `Specifications: ${Object.entries((prod as any).attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}.`
        : '';
      const brandStr = (prod as any).brand ? `Brand: ${(prod as any).brand}.` : '';

      const richText = [
        `Product: ${prod.name}.`,
        brandStr,
        `Category: ${prod.category || 'General'}.`,
        `Price: ${prod.price} ${prod.currency}.`,
        prod.description ? `Description: ${prod.description}.` : '',
        specsStr,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        entityType: EntityType.PRODUCT,
        entityId: prod._id.toString(),
        text: richText.trim(),
        metadata: {
          nativeProductId: prod.nativeProductId,
          name: prod.name,
          brand: (prod as any).brand,
          price: prod.price,
          currency: prod.currency,
          category: prod.category,
          stockQuantity: prod.stockQuantity,
        },
      };
    });

    try {
      await this.vectorStoreService.upsertBatchVectors(businessId, batchEntries);
      embeddedCount = batchEntries.length;
    } catch (err: any) {
      this.logger.error(`[FileIngestion] Bulk vector embedding error: ${err.message}`);
    }

    this.logger.log(
      `[FileIngestion] Ingestion complete: ${syncResult.upsertedCount + syncResult.modifiedCount} saved, ${embeddedCount} vector embedded.`,
    );

    return {
      totalParsed: rows.length,
      ingested: syncResult.upsertedCount + syncResult.modifiedCount,
      embedded: embeddedCount,
      errors,
      detectedMapping: mapping,
    };
  }

  private getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private async parseFile(
    buffer: Buffer,
    ext: string,
    mimeType: string,
  ): Promise<Record<string, any>[]> {
    if (ext === 'csv' || ext === 'tsv' || mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
      return this.parseDelimited(buffer, ext === 'tsv' ? '\t' : undefined);
    }

    if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return this.parseXlsx(buffer);
    }

    if (ext === 'json' || mimeType === 'application/json') {
      return this.parseJson(buffer);
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

  private parseJson(buffer: Buffer): Record<string, any>[] {
    const content = buffer.toString('utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.products)) return parsed.products;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.data)) return parsed.data;
    return [parsed];
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

  private async parsePdf(buffer: Buffer): Promise<Record<string, any>[]> {
    const rows: Record<string, any>[] = [];

    // Strategy 1: Grid table extraction using PDFParse.getTable()
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfModule = require('pdf-parse');
      if (pdfModule?.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const tableResult = await parser.getTable();
        if (tableResult?.pages) {
          for (const page of tableResult.pages) {
            if (page.tables && page.tables.length > 0) {
              for (const tbl of page.tables) {
                if (Array.isArray(tbl) && tbl.length >= 2) {
                  const rawHeaders = tbl[0].map((h: any) => String(h || '').trim());
                  const headers = rawHeaders.map((h: string, idx: number) => h || `column_${idx}`);

                  for (let r = 1; r < tbl.length; r++) {
                    const rowCells = tbl[r];
                    if (
                      Array.isArray(rowCells) &&
                      rowCells.some((c: any) => String(c || '').trim() !== '')
                    ) {
                      const rowObj: Record<string, any> = {};
                      headers.forEach((h: string, idx: number) => {
                        rowObj[h] = String(rowCells[idx] || '').trim();
                      });
                      rows.push(rowObj);
                    }
                  }
                }
              }
            }
          }
        }
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    } catch (err: any) {
      this.logger.warn(`[FileIngestion] PDF table extraction fallback: ${err.message}`);
    }

    if (rows.length > 0) {
      this.logger.log(`[FileIngestion] Extracted ${rows.length} rows from PDF table structure.`);
      return rows;
    }

    // Strategy 2: Text stream extraction fallback
    let text = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfModule = require('pdf-parse');
      if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        text = data?.text || '';
      } else if (pdfModule?.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const data = await parser.getText();
        text = data?.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } else if (typeof pdfModule?.default === 'function') {
        const data = await pdfModule.default(buffer);
        text = data?.text || '';
      }
    } catch (err: any) {
      this.logger.error(`[FileIngestion] PDF text fallback failed: ${err.message}`);
      throw new Error(`PDF text extraction failed: ${err.message}`);
    }

    if (!text.trim()) {
      return [];
    }

    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return [];
    }

    // Strategy 2A: Delimited line detection (\t, |, ,, ;)
    const delimiter = this.detectDelimiter(lines.slice(0, 5));
    if (delimiter) {
      const headers = lines[0].split(delimiter).map((h: string) => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v: string) => v.trim());
        if (values.length >= 2) {
          const row: Record<string, any> = {};
          headers.forEach((header, idx) => {
            row[header || `column_${idx}`] = values[idx] || '';
          });
          rows.push(row);
        }
      }
      if (rows.length > 0) return rows;
    }

    // Strategy 2B: Multi-space column splitting
    const headerTokens = lines[0].split(/\s{2,}|\t/).map((t: string) => t.trim()).filter(Boolean);
    if (headerTokens.length >= 2) {
      for (let i = 1; i < lines.length; i++) {
        const tokens = lines[i].split(/\s{2,}|\t/).map((t: string) => t.trim()).filter(Boolean);
        if (tokens.length >= 2) {
          const row: Record<string, any> = {};
          headerTokens.forEach((h: string, idx: number) => {
            row[h || `column_${idx}`] = tokens[idx] || '';
          });
          rows.push(row);
        }
      }
      if (rows.length > 0) return rows;
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
    const usedHeaders = new Set<string>();

    const clean = (h: string) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    // Priority 1: Exact matches
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (mapping[field]) continue;
      for (const h of headers) {
        if (usedHeaders.has(h)) continue;
        const normalized = clean(h);
        if (aliases.some((alias) => normalized === alias.toLowerCase().trim())) {
          mapping[field] = h;
          usedHeaders.add(h);
          break;
        }
      }
    }

    // Priority 2: Safe substring matches (safe aliases with length >= 3)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (mapping[field]) continue;
      for (const h of headers) {
        if (usedHeaders.has(h)) continue;
        const normalized = clean(h);
        const safeAliases = aliases.filter((a) => a.length >= 3);
        const match = safeAliases.some((alias) => {
          const a = alias.toLowerCase().trim();
          return normalized === a || normalized.includes(a) || a.includes(normalized);
        });
        if (match) {
          mapping[field] = h;
          usedHeaders.add(h);
          break;
        }
      }
    }

    // Priority 3: Fallback for 'name' if still missing
    if (!mapping['name']) {
      for (const h of headers) {
        if (usedHeaders.has(h)) continue;
        const norm = clean(h);
        if (norm.includes('prod') || norm.includes('item') || norm.includes('title') || norm.includes('name')) {
          mapping['name'] = h;
          usedHeaders.add(h);
          break;
        }
      }
    }

    // If still no name matched, use the first non-ID, non-price column
    if (!mapping['name'] && headers.length > 0) {
      const candidate = headers.find((h) => h !== mapping['nativeProductId'] && h !== mapping['price']) || headers[0];
      mapping['name'] = candidate;
      usedHeaders.add(candidate);
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

    // 1. Product Name extraction with robust fallback
    let name = getValue('name');
    if (!name || String(name).trim() === '') {
      const textCandidate = Object.entries(row).find(
        ([k, v]) =>
          k !== mapping['nativeProductId'] &&
          k !== mapping['price'] &&
          typeof v === 'string' &&
          v.trim().length >= 3,
      );
      if (textCandidate) {
        name = textCandidate[1];
      } else {
        name = `Product ${rowIndex + 1}`;
      }
    }

    // 2. Price and Currency extraction (supports ৳, $, Tk, BDT, commas, decimals, trailing /-)
    const rawPrice = getValue('price');
    const rawPriceStr = rawPrice !== undefined ? String(rawPrice).trim() : '';

    let currency = getValue('currency');
    if (!currency) {
      if (rawPriceStr.includes('৳') || rawPriceStr.includes('BDT') || rawPriceStr.toLowerCase().includes('tk')) {
        currency = 'BDT';
      } else if (rawPriceStr.includes('€') || rawPriceStr.includes('EUR')) {
        currency = 'EUR';
      } else if (rawPriceStr.includes('£') || rawPriceStr.includes('GBP')) {
        currency = 'GBP';
      } else {
        currency = 'USD';
      }
    }

    const cleanedPriceStr = rawPriceStr
      .replace(/\/-\s*$/, '')
      .replace(/,/g, '')
      .replace(/[^0-9.]/g, '');
    const parsedPrice = cleanedPriceStr ? parseFloat(cleanedPriceStr) : 0;

    // 3. SKU / Native Product ID extraction with deterministic fallback
    let nativeProductId = getValue('nativeProductId');
    if (!nativeProductId || String(nativeProductId).trim() === '') {
      const sanitizedName = String(name).toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
      nativeProductId = `sku_${sanitizedName || 'item'}_${rowIndex + 1}`;
    }

    // 4. Stock Quantity extraction
    const rawStock = getValue('stockQuantity');
    const parsedStock =
      rawStock !== undefined ? parseInt(String(rawStock).replace(/[^0-9-]/g, ''), 10) : 10;
    const finalStock = isNaN(parsedStock) ? 10 : parsedStock;

    // 5. Availability determination
    const availabilityRaw = getValue('availability');
    let availability = this.parseAvailability(String(availabilityRaw || ''));
    if (finalStock <= 0) {
      availability = ProductAvailability.OUT_OF_STOCK;
    }

    // 6. Custom extra columns into attributes
    const mappedColumnNames = new Set(Object.values(mapping));
    const attributes: Record<string, any> = {};
    for (const [col, val] of Object.entries(row)) {
      if (!mappedColumnNames.has(col) && val !== undefined && String(val).trim() !== '') {
        attributes[col] = String(val).trim();
      }
    }

    // 7. Description composition
    let description = getValue('description') ? String(getValue('description')).trim() : '';
    if (!description) {
      const descParts: string[] = [];
      const cat = getValue('category');
      if (cat) descParts.push(`Category: ${cat}`);
      if (Object.keys(attributes).length > 0) {
        descParts.push(
          Object.entries(attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', '),
        );
      }
      description = descParts.join(' | ') || String(name);
    }

    const imagesRaw = getValue('images');
    const images = imagesRaw
      ? String(imagesRaw)
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return {
      nativeProductId: String(nativeProductId).trim(),
      name: String(name).trim(),
      description,
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      currency: String(currency).trim(),
      stockQuantity: finalStock,
      availability,
      category: getValue('category') ? String(getValue('category')).trim() : 'General',
      images,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
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
