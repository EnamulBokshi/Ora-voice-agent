import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import mongoose, { Schema, Document, Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import Redis from 'ioredis';

// ─── 1. Load Environment Variables ──────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://ora_admin:ora_password_dev@localhost:27017/ora_db?authSource=admin';

const targetBusinessId = new Types.ObjectId('6aa529b2e227d1425876c1db');

// ─── 2. Schemas ─────────────────────────────────────────────────────────────
const ProductSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, required: true, index: true },
    nativeProductId: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD', trim: true },
    availability: { type: String, default: 'in_stock' },
    stockQuantity: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    category: { type: String, trim: true, index: true },
    brand: { type: String, trim: true, index: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    sourceTier: { type: String, default: 'tier1_connector' },
    confidenceScore: { type: Number, default: 1.0 },
    lastVerifiedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    isEmbedded: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'products' },
);

const VectorIndexSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, required: true, index: true },
    archetype: { type: String, required: false },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    vector: { type: [Number], required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    embeddingModel: { type: String, trim: true },
    embeddingVersion: { type: String, trim: true },
  },
  { timestamps: true, collection: 'vectorindexes' },
);

// ─── 3. Embedding Helper ────────────────────────────────────────────────────
function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map((val) => val / norm);
}

function generateFallbackVector(text: string): number[] {
  const vector = new Array(768).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const word of words) {
    const hash = crypto.createHash('sha256').update(word).digest();
    for (let i = 0; i < 768; i++) {
      const byte = hash[i % hash.length];
      vector[i] += (byte - 128) / 128;
    }
  }
  return normalizeVector(vector);
}

async function getEmbedding(text: string): Promise<{ vector: number[]; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY || (process.env.GEMINI_API_KEYS || '').split(/[\r\n,]+/)[0];
  if (apiKey) {
    try {
      const res = await fetch(
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
      if (res.ok) {
        const data: any = await res.json();
        if (data.embedding?.values) {
          return {
            vector: normalizeVector(data.embedding.values),
            model: 'text-embedding-004',
          };
        }
      }
    } catch (err: any) {
      console.warn('Gemini embedding failed, using fallback hash:', err.message);
    }
  }
  return {
    vector: generateFallbackVector(text),
    model: 'fallback-term-hash',
  };
}

// ─── 4. Main Sync Routine ───────────────────────────────────────────────────
async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  const VectorIndexModel = mongoose.models.VectorIndex || mongoose.model('VectorIndex', VectorIndexSchema);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  // 1. Clean out stale dummy/crawled products for this store
  console.log(`Purging old stale products for business ${targetBusinessId}...`);
  const deletedProducts = await ProductModel.deleteMany({ businessId: targetBusinessId });
  console.log(`Deleted ${deletedProducts.deletedCount} old product records.`);

  const deletedVectors = await VectorIndexModel.deleteMany({
    businessId: targetBusinessId,
    entityType: 'product',
  });
  console.log(`Deleted ${deletedVectors.deletedCount} old vector indexes.`);

  // 2. Read and parse sample_products_catalog.csv
  const csvPath = path.resolve(__dirname, '../../sample_products_catalog.csv');
  console.log(`Reading catalog from: ${csvPath}...`);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const productsByHandle: Record<string, any> = {};
  for (const row of records) {
    const handle = row['Handle'];
    if (!productsByHandle[handle]) {
      // Strip HTML for clean voice and vector text
      const cleanDesc = (row['Body (HTML)'] || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      productsByHandle[handle] = {
        handle,
        title: row['Title'],
        description: cleanDesc,
        vendor: row['Vendor'] || 'ORA Essentials',
        type: row['Type'] || 'General',
        tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()) : [],
        images: [],
        variants: [],
      };
    }

    if (row['Image Src'] && !productsByHandle[handle].images.includes(row['Image Src'])) {
      productsByHandle[handle].images.push(row['Image Src']);
    }

    productsByHandle[handle].variants.push({
      sku: row['Variant SKU'],
      price: parseFloat(row['Variant Price'] || '0'),
      compareAtPrice: row['Variant Compare At Price'] ? parseFloat(row['Variant Compare At Price']) : null,
      stockQuantity: parseInt(row['Variant Inventory Qty'] || '0', 10),
      option1Name: row['Option1 Name'] || null,
      option1Value: row['Option1 Value'] || null,
      option2Name: row['Option2 Name'] || null,
      option2Value: row['Option2 Value'] || null,
    });
  }

  console.log(`Parsed ${Object.keys(productsByHandle).length} unique products with full variants.`);

  // 3. Ingest each product into MongoDB and create Vector Embedding
  for (const [handle, p] of Object.entries(productsByHandle)) {
    const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stockQuantity, 0);
    const minPrice = Math.min(...p.variants.map((v: any) => v.price));

    const productDoc = await ProductModel.create({
      businessId: targetBusinessId,
      nativeProductId: handle,
      name: p.title,
      description: p.description,
      price: minPrice,
      currency: 'USD',
      availability: totalStock > 0 ? 'in_stock' : 'out_of_stock',
      stockQuantity: totalStock,
      images: p.images,
      category: p.type,
      brand: p.vendor,
      attributes: {
        shopify: {
          variants: p.variants,
          options: [
            ...new Set(
              p.variants
                .flatMap((v: any) => [v.option1Name, v.option2Name])
                .filter(Boolean),
            ),
          ],
        },
        tags: p.tags,
      },
      sourceTier: 'tier1_connector',
      confidenceScore: 1.0,
      lastVerifiedAt: new Date(),
      isActive: true,
      isEmbedded: true,
    });

    console.log(`✔ Created Product: ${productDoc.name} ($${minPrice}, stock: ${totalStock})`);

    // Create rich text for vector embedding
    const variantsText = p.variants
      .map(
        (v: any) =>
          `Option: ${[v.option1Value, v.option2Value].filter(Boolean).join(' / ')} (Price: $${v.price}, Stock: ${v.stockQuantity})`,
      )
      .join('; ');

    const richText = [
      `Product: ${productDoc.name}.`,
      `Brand: ${productDoc.brand}.`,
      `Category: ${productDoc.category}.`,
      `Price: $${productDoc.price} USD.`,
      `Availability: ${productDoc.availability} (${totalStock} in stock).`,
      `Description: ${productDoc.description}.`,
      `Variants & Sizing: ${variantsText}.`,
      `Tags: ${p.tags.join(', ')}.`,
    ].join(' ');

    const embedding = await getEmbedding(richText);

    await VectorIndexModel.create({
      businessId: targetBusinessId,
      entityType: 'product',
      entityId: productDoc._id.toString(),
      text: richText,
      vector: embedding.vector,
      metadata: {
        nativeProductId: handle,
        name: productDoc.name,
        brand: productDoc.brand,
        price: productDoc.price,
        currency: 'USD',
        category: productDoc.category,
        stockQuantity: totalStock,
      },
      embeddingModel: embedding.model,
      embeddingVersion: 'v1',
    });

    console.log(`  └─ Vector embedded with ${embedding.model}`);
  }

  // 4. Update AgentConfig with accurate businessSummary and avoidances
  console.log('Updating AgentConfig with modern luxury catalog identity...');
  await db.collection('agentconfigs').updateOne(
    { businessId: targetBusinessId },
    {
      $set: {
        businessSummary:
          'Osthir Cloths is an avant-garde modern technical apparel and luxury lifestyle store. Our catalog includes: Aura Heavyweight Oversized Hoodies (480 GSM French Terry), Apex Minimalist Bomber Jackets (Japanese water-resistant micro-twill with PrimaLoft), Cyber-Shades 2077 Polarized Sunglasses (Grade 5 Titanium), Nomad Waterproof Trail Running Shoes (eVent waterproof membrane and Vibram Megagrip), Titanium EDC Carabiner Keychains, ORA Wave Pro Active Noise-Cancelling Headphones (Hi-Res beryllium drivers, 42dB hybrid ANC), Botanical Restorative Facial Serums, and Ethiopian Yirgacheffe Specialty Coffee beans.',
        brandVoiceDescription:
          'Sophisticated, knowledgeable, modern luxury streetwear and lifestyle concierge. Enthusiastic, direct, concise, and helpful.',
        avoidances:
          'Do NOT mention Bangladeshi traditional clothing such as gamcha, lungi, or shari. The store sells modern technical apparel, premium sneakers, audio headphones, titanium EDC accessories, and specialty coffee.',
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // 5. Invalidate Redis Instruction Cache
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = Number(process.env.REDIS_PORT) || 6379;
  try {
    const redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: process.env.REDIS_PASSWORD || undefined,
    });
    const keys = await redis.keys(`*${targetBusinessId}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Flushed ${keys.length} cached Redis keys for business.`);
    }
    await redis.quit();
  } catch (err: any) {
    console.warn('Redis cache clear note:', err.message);
  }

  console.log('🎉 CATALOG SYNCHRONIZATION COMPLETE!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error during catalog sync:', err);
  process.exit(1);
});
