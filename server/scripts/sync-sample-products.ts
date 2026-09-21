import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import mongoose, { Schema, Document, Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import Redis from 'ioredis';
import { mapShopifyVariants } from '../src/common/utils/shopify-variant.util';
import { ShopifyTokenService } from '../src/common/shopify-token/shopify-token.service';
import { SHOPIFY_API_VERSION } from '../src/shopify/shopify.constants';

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

/**
 * Which tenant this catalogue belongs to.
 *
 * It was a hardcoded literal, and this script deletes every product the tenant owns
 * before writing. Pointing that at the wrong business, or at a Shopify tenant whose
 * catalogue came from the connector, destroys real data. Pass it explicitly:
 *
 *   ts-node scripts/sync-sample-products.ts --business=<mongo id>
 *   SAMPLE_SYNC_BUSINESS_ID=<mongo id> ts-node scripts/sync-sample-products.ts
 */
const DEFAULT_BUSINESS_ID = '6aa529b2e227d1425876c1db';

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const rawBusinessId =
  readFlag('business') || process.env.SAMPLE_SYNC_BUSINESS_ID || DEFAULT_BUSINESS_ID;

if (!Types.ObjectId.isValid(rawBusinessId)) {
  console.error(`Not a Mongo ObjectId: ${rawBusinessId}`);
  process.exit(1);
}

const targetBusinessId = new Types.ObjectId(rawBusinessId);

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

/**
 * Enough of the Business shape for `ShopifyTokenService` to read the stored tokens and
 * write refreshed ones back. `strict: false` keeps every other field untouched on save.
 */
const BusinessSchema = new Schema({}, { strict: false, collection: 'businesses' });

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

/**
 * Must produce vectors the running server can compare against.
 *
 * A stored vector is only meaningful next to a query vector from the same model, so the
 * model and the output dimensionality are read from the same env var EmbeddingService
 * uses and default to the same value. This was pinned to `text-embedding-004`, which
 * Google has retired: every call 404'd, the silent fallback wrote term-hash vectors,
 * and searches embedded with gemini-embedding-001 could not match them.
 */
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'models/gemini-embedding-001';

async function getEmbedding(text: string): Promise<{ vector: number[]; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY || (process.env.GEMINI_API_KEYS || '').split(/[\r\n,]+/)[0];
  const fullModel = EMBEDDING_MODEL.startsWith('models/')
    ? EMBEDDING_MODEL
    : `models/${EMBEDDING_MODEL}`;
  const modelPath = fullModel.replace('models/', '');

  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: fullModel,
            content: { parts: [{ text }] },
            outputDimensionality: 768,
          }),
        },
      );
      if (res.ok) {
        const data: any = await res.json();
        if (data.embedding?.values) {
          return {
            vector: normalizeVector(data.embedding.values),
            model: modelPath,
          };
        }
      } else {
        // A silent fallback here writes vectors nothing can search. Say why.
        const body = await res.text().catch(() => '');
        console.warn(
          `Gemini embedding returned ${res.status} for ${modelPath}: ${body.slice(0, 200)}`,
        );
      }
    } catch (err: any) {
      console.warn('Gemini embedding failed, using fallback hash:', err.message);
    }
  } else {
    console.warn('No GEMINI_API_KEY; falling back to term-hash vectors.');
  }

  return {
    vector: generateFallbackVector(text),
    model: 'fallback-term-hash',
  };
}

// ─── 4. Shopify Variant Resolution ──────────────────────────────────────────

/**
 * Why this exists.
 *
 * A Shopify cart is keyed by variant id, and POST /cart/add.js answers 404 for anything
 * else. A Shopify product-import CSV carries no variant ids at all: Shopify mints them
 * when the CSV is imported. A catalogue written straight from the CSV therefore gives
 * the voice agent nothing it can put in a shopper's cart, and every add silently misses
 * the storefront while the agent says the item is in the cart.
 *
 * So for a Shopify tenant the ids are read back from the Admin API and matched onto the
 * CSV rows before anything is written.
 */
interface AdminVariant {
  id: number | string;
  sku?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface AdminProduct {
  id: number | string;
  handle: string;
  variants?: AdminVariant[];
}

/** Match key for a variant: its option values, lower-cased and order-sensitive. */
function optionKey(values: (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase())
    .join(' / ');
}

async function fetchShopifyCatalogue(
  shopDomain: string,
  accessToken: string,
): Promise<Map<string, AdminProduct>> {
  const byHandle = new Map<string, AdminProduct>();
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;

  while (url) {
    const response: Response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(
        `Shopify products.json returned HTTP ${response.status}. Cannot resolve variant ids.`,
      );
    }
    const body = (await response.json()) as { products?: AdminProduct[] };
    for (const product of body.products || []) {
      if (product.handle) byHandle.set(product.handle, product);
    }

    const link = response.headers.get('link');
    const next = link
      ?.split(',')
      .find((part) => part.includes('rel="next"'))
      ?.match(/[?&]page_info=([^&>]+)/);
    url = next
      ? `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&page_info=${next[1]}`
      : null;
  }

  return byHandle;
}

/**
 * Reads variant ids from the public storefront instead of the Admin API.
 *
 * `/products/<handle>.js` carries the same numeric variant ids the Ajax cart needs and
 * requires no app credentials, which matters when the offline token has expired and
 * only the merchant can mint a new one. A store that is still password-protected —
 * every dev store — hands out a session cookie in exchange for the storefront password,
 * so that is posted first.
 *
 * Read-only, and the ids are public to any shopper on the storefront.
 */
async function fetchStorefrontCatalogue(
  shopDomain: string,
  password: string,
  handles: string[],
): Promise<Map<string, AdminProduct>> {
  const cookies: string[] = [];

  const rememberCookies = (response: Response) => {
    const raw = (response.headers as any).getSetCookie?.() as string[] | undefined;
    for (const cookie of raw || []) {
      const pair = cookie.split(';')[0];
      const name = pair.split('=')[0];
      const existing = cookies.findIndex((c) => c.split('=')[0] === name);
      if (existing >= 0) cookies[existing] = pair;
      else cookies.push(pair);
    }
  };

  const body = new URLSearchParams({
    form_type: 'storefront_password',
    utf8: '✓',
    password,
  });

  const unlock = await fetch(`https://${shopDomain}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  rememberCookies(unlock);

  // Shopify answers a correct password with a 302 to the storefront and a wrong one by
  // re-rendering /password with 200 and an error.
  if (unlock.status !== 302) {
    throw new Error(
      `Storefront password rejected by ${shopDomain} (HTTP ${unlock.status}).`,
    );
  }

  const byHandle = new Map<string, AdminProduct>();
  for (const handle of handles) {
    const response = await fetch(`https://${shopDomain}/products/${handle}.js`, {
      headers: { Cookie: cookies.join('; '), Accept: 'application/json' },
      redirect: 'manual',
    });
    rememberCookies(response);

    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(
        `Storefront returned HTTP ${response.status} for /products/${handle}.js.`,
      );
    }

    const product = (await response.json()) as AdminProduct;
    if (product?.id) byHandle.set(handle, { ...product, handle });
  }

  return byHandle;
}

/**
 * Writes the real Shopify variant id onto every parsed CSV variant.
 *
 * Matches on SKU first — the one field a merchant controls on both sides — and falls
 * back to the option values. Returns the rows it could not match, so the caller can
 * refuse to write a catalogue the agent could not sell from.
 */
function attachShopifyIds(
  productsByHandle: Record<string, any>,
  adminByHandle: Map<string, AdminProduct>,
): string[] {
  const unresolved: string[] = [];

  for (const [handle, product] of Object.entries<any>(productsByHandle)) {
    const adminProduct = adminByHandle.get(handle);
    if (!adminProduct) {
      unresolved.push(`${handle}: not present in the Shopify store`);
      continue;
    }

    product.shopifyProductId = String(adminProduct.id);
    const adminVariants = adminProduct.variants || [];
    const bySku = new Map<string, AdminVariant>();
    const byOptions = new Map<string, AdminVariant>();
    for (const variant of adminVariants) {
      if (variant.sku) bySku.set(variant.sku.trim().toLowerCase(), variant);
      byOptions.set(optionKey([variant.option1, variant.option2, variant.option3]), variant);
    }

    for (const variant of product.variants) {
      const match =
        (variant.sku && bySku.get(String(variant.sku).trim().toLowerCase())) ||
        byOptions.get(optionKey([variant.option1Value, variant.option2Value]));

      if (match) {
        variant.variantId = String(match.id);
      } else {
        unresolved.push(
          `${handle}: no Shopify variant for SKU ${variant.sku || '(none)'} / ${optionKey([variant.option1Value, variant.option2Value]) || '(no options)'}`,
        );
      }
    }
  }

  return unresolved;
}

/**
 * The `attributes.shopify` shape the voice agent reads.
 *
 * Built through `mapShopifyVariants`, the same function the connector sync uses, so the
 * two writers cannot drift into different shapes. That is what went wrong before: this
 * script invented its own shape with no `variantId` and no `title`, and
 * `resolveCartVariant` then matched a spoken "medium" against `undefined`.
 */
function buildShopifyAttributes(handle: string, product: any) {
  return mapShopifyVariants({
    handle,
    options: [
      product.variants[0]?.option1Name,
      product.variants[0]?.option2Name,
    ]
      .filter(Boolean)
      .map((name: string) => ({ name })),
    variants: product.variants.map((variant: any) => ({
      // On a non-Shopify tenant there is no storefront cart, and ORA's own cart is
      // authoritative; the SKU is then a stable per-line identifier. On a Shopify
      // tenant `variantId` is always the real numeric id by this point.
      id: variant.variantId || variant.sku || `${handle}-${optionKey([variant.option1Value, variant.option2Value])}`,
      title:
        [variant.option1Value, variant.option2Value].filter(Boolean).join(' / ') ||
        'Default Title',
      price: String(variant.price),
      sku: variant.sku,
      inventory_management: variant.inventoryTracker || 'shopify',
      inventory_policy: variant.inventoryPolicy || 'deny',
      inventory_quantity: variant.stockQuantity,
      option1: variant.option1Value || null,
      option2: variant.option2Value || null,
      option3: null,
    })),
  });
}

// ─── 5. Main Sync Routine ───────────────────────────────────────────────────
async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  const VectorIndexModel = mongoose.models.VectorIndex || mongoose.model('VectorIndex', VectorIndexSchema);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  // 1. Read and parse sample_products_catalog.csv
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
      inventoryTracker: row['Variant Inventory Tracker'] || null,
      inventoryPolicy: row['Variant Inventory Policy'] || null,
      option1Name: row['Option1 Name'] || null,
      option1Value: row['Option1 Value'] || null,
      option2Name: row['Option2 Name'] || null,
      option2Value: row['Option2 Value'] || null,
      // Filled from the Shopify Admin API below on a Shopify tenant. A CSV never
      // carries variant ids, and without one the item cannot enter a storefront cart.
      variantId: null as string | null,
    });
  }

  console.log(`Parsed ${Object.keys(productsByHandle).length} unique products with full variants.`);

  // 2. On a Shopify tenant, resolve real variant ids before touching anything
  const business: any = await db
    .collection('businesses')
    .findOne({ _id: targetBusinessId });

  if (!business) {
    throw new Error(`No business ${targetBusinessId}. Pass --business=<id>.`);
  }

  const shopifyInstalled =
    Boolean(business.shopifyShopDomain) &&
    (!business.shopifyUninstalledAt ||
      (business.shopifyInstalledAt &&
        new Date(business.shopifyInstalledAt) > new Date(business.shopifyUninstalledAt)));
  const isShopifyTenant = business.platform === 'shopify' || shopifyInstalled;

  if (isShopifyTenant) {
    console.log(
      `Business ${targetBusinessId} is a Shopify tenant (${business.shopifyShopDomain}). Resolving live variant ids...`,
    );

    if (hasFlag('allow-unsynced')) {
      console.warn(
        'WARNING: --allow-unsynced. Variants written without Shopify ids cannot reach the storefront cart, and add_to_cart will refuse them.',
      );
    } else {
      if (!business.shopifyShopDomain) {
        throw new Error('This tenant has no shopifyShopDomain to read variant ids from.');
      }

      const storefrontPassword =
        readFlag('storefront-password') || process.env.SAMPLE_SYNC_STOREFRONT_PASSWORD;

      let adminByHandle: Map<string, AdminProduct>;
      if (storefrontPassword) {
        console.log('Reading variant ids from the public storefront.');
        adminByHandle = await fetchStorefrontCatalogue(
          business.shopifyShopDomain,
          storefrontPassword,
          Object.keys(productsByHandle),
        );
      } else {
        // Offline access tokens expire in about an hour, so the stored one is almost
        // always stale by the time a script runs. Go through the same refresh-aware
        // service every server caller uses, and let it write the rotated pair back.
        const BusinessModel: any =
          mongoose.models.Business || mongoose.model('Business', BusinessSchema);
        const businessDoc = await BusinessModel.findById(targetBusinessId).exec();
        const tokenService = new ShopifyTokenService(
          { get: (key: string) => process.env[key] } as any,
          BusinessModel as any,
        );
        const accessToken = await tokenService.getValidAccessTokenFor(businessDoc as any);

        if (!accessToken) {
          throw new Error(
            'This Shopify tenant has no usable access token, so variant ids cannot be resolved. ' +
              'Open the app in Shopify Admin to restore Admin API access, or pass ' +
              '--storefront-password=<password> to read the ids from the storefront instead.',
          );
        }

        adminByHandle = await fetchShopifyCatalogue(
          business.shopifyShopDomain,
          accessToken,
        );
      }
      console.log(`Read ${adminByHandle.size} products from ${business.shopifyShopDomain}.`);

      const unresolved = attachShopifyIds(productsByHandle, adminByHandle);
      if (unresolved.length > 0) {
        console.error('Cannot resolve every variant against the live store:');
        for (const problem of unresolved) console.error(`  - ${problem}`);
        throw new Error(
          'Refusing to write a catalogue the voice agent could not sell from. ' +
            'Import sample_products_catalog.csv into the store first, or re-run with --allow-unsynced.',
        );
      }
    }
  }

  // 3. Clean out stale products for this store, now that the write is known to be good
  console.log(`Purging old products for business ${targetBusinessId}...`);
  const deletedProducts = await ProductModel.deleteMany({ businessId: targetBusinessId });
  console.log(`Deleted ${deletedProducts.deletedCount} old product records.`);

  const deletedVectors = await VectorIndexModel.deleteMany({
    businessId: targetBusinessId,
    entityType: 'product',
  });
  console.log(`Deleted ${deletedVectors.deletedCount} old vector indexes.`);

  // 4. Ingest each product into MongoDB and create Vector Embedding
  for (const [handle, p] of Object.entries(productsByHandle)) {
    const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stockQuantity, 0);
    const minPrice = Math.min(...p.variants.map((v: any) => v.price));

    const productDoc = await ProductModel.create({
      businessId: targetBusinessId,
      // The connector keys products by Shopify's numeric product id; match it so a
      // later connector sync updates these rows instead of duplicating them.
      nativeProductId: p.shopifyProductId || handle,
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
        shopify: buildShopifyAttributes(handle, p),
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
        nativeProductId: p.shopifyProductId || handle,
        handle,
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

  // 5. Update AgentConfig with accurate businessSummary and avoidances
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

  // 6. Invalidate Redis Instruction Cache
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
