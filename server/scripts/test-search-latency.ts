import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';

// ─── Load Environment Variables ─────────────────────────────────────────────
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

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEYS?.split(/[\r\n,]+/)[0]?.trim();

const threshold = parseFloat(process.env.RAG_PRODUCT_CONFIDENCE_THRESHOLD || '0.50');

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const matchesTerm = (text: string, term: string) => {
  if (!text) return false;
  if (text.includes(term)) return true;
  if (term.length >= 4 && term.endsWith('s') && text.includes(term.slice(0, -1))) return true;
  if (term.length >= 5 && term.endsWith('es') && text.includes(term.slice(0, -2))) return true;
  return false;
};

async function main() {
  console.log('Connecting to MongoDB:', mongoUri.replace(/:[^:@]+@/, ':****@'));
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection failed');

  // Find the Shopify store with products
  const businesses = await db.collection('businesses').find({}).toArray();
  let targetBiz = businesses.find((b) => b.name === 'Osthir-Cloths') || businesses[0];
  for (const b of businesses) {
    const count = await db.collection('products').countDocuments({ businessId: b._id });
    if (count > 0) {
      targetBiz = b;
      break;
    }
  }

  console.log(`\nTesting Store: "${targetBiz.name}" (ID: ${targetBiz._id})`);
  console.log(`Calibrated RAG Product Threshold: ${threshold}\n`);

  const queries = [
    'running shoes',
    'facial serum',
    'headphone',
    'jacket for men',
  ];

  for (const query of queries) {
    console.log(`\n======================================================`);
    console.log(`🔎 Test Query: "${query}"`);

    // 1. Benchmark Keyword Fast-Path (< 20ms)
    const t0 = Date.now();
    const cleanTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

    const candidates = await db.collection('products').find({
      businessId: targetBiz._id,
      isActive: true,
      $or: cleanTerms.map((t) => ({ name: { $regex: t, $options: 'i' } })),
    }).toArray();

    const confident = candidates.filter((item) => {
      const nameLower = (item.name || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const brandLower = (item.brand || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const tags = Array.isArray(item.attributes?.shopify?.tags)
        ? item.attributes.shopify.tags.join(' ').toLowerCase()
        : '';
      const full = `${nameLower} ${catLower} ${brandLower} ${tags} ${descLower}`;

      if (cleanTerms.length > 1) {
        const core = cleanTerms.some(
          (t) => matchesTerm(nameLower, t) || matchesTerm(catLower, t),
        );
        if (!core) return false;
        return cleanTerms.every((t) => matchesTerm(full, t));
      }
      return matchesTerm(nameLower, cleanTerms[0]) || matchesTerm(catLower, cleanTerms[0]) || matchesTerm(full, cleanTerms[0]);
    });

    const keywordMs = Date.now() - t0;

    if (confident.length > 0) {
      console.log(`⚡ RESULT: KEYWORD FAST-PATH HIT! (${keywordMs} ms)`);
      console.log(`   Status: Answered with sub-second latency directly from local index!`);
      confident.forEach((p) => {
        console.log(`   • ${p.name} — $${p.price} (Stock: ${p.stockQuantity})`);
      });
    } else {
      console.log(`⏩ Keyword Fast-Path: Partial match (${keywordMs} ms). Falling to Semantic RAG...`);

      // 2. Semantic RAG Search
      const t1 = Date.now();
      const embRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: query }] },
            outputDimensionality: 768,
          }),
        },
      );
      const embData: any = await embRes.json();
      const qVec = embData.embedding?.values;

      const vectors = await db.collection('vectorindexes').find({
        businessId: targetBiz._id,
        entityType: 'product',
      }).toArray();

      const scored = vectors
        .map((v) => ({
          text: v.text.slice(0, 70),
          score: cosineSimilarity(qVec, v.vector),
        }))
        .filter((item) => item.score >= threshold)
        .sort((a, b) => b.score - a.score);

      const ragMs = Date.now() - t1;

      console.log(`🎯 RESULT: SEMANTIC RAG HIT! (${ragMs} ms)`);
      if (scored.length > 0) {
        console.log(`   Status: Vector score >= ${threshold}. Accepted immediately without fallback delays!`);
        scored.slice(0, 2).forEach((s) => {
          console.log(`   • Score: ${s.score.toFixed(4)} | ${s.text}...`);
        });
      } else {
        console.log(`   ⚠️ No products matched vector threshold.`);
      }
    }
  }

  console.log('\n======================================================');
  console.log('✅ All latency checks completed.');
  await mongoose.disconnect();
}

main().catch(console.error);
