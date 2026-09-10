/**
 * Backfills `Business.shopifyShopDomain` from the legacy `shopifyStoreUrl`.
 *
 * The embedded app upserts on `shopifyShopDomain`, which is unique and indexed.
 * Tenants connected before the embedded app existed only have
 * `shopifyStoreUrl`, which is neither, so the webhook tenant lookup still
 * carries an unindexed `$or` fallback for them. Once this has run everywhere,
 * that fallback in `ingestion.controller.ts` can be deleted.
 *
 * Run: pnpm --filter server exec ts-node scripts/backfill-shopify-shop-domain.ts
 */
import mongoose from 'mongoose';

const SHOP_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ora';
  await mongoose.connect(uri);

  const businesses = mongoose.connection.collection('businesses');

  const candidates = await businesses
    .find({
      shopifyStoreUrl: { $exists: true, $nin: [null, ''] },
      $or: [
        { shopifyShopDomain: { $exists: false } },
        { shopifyShopDomain: null },
      ],
    })
    .toArray();

  console.log(`Found ${candidates.length} business record(s) to backfill.`);

  let updated = 0;
  let skipped = 0;

  for (const business of candidates) {
    const normalized = String(business.shopifyStoreUrl)
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (!SHOP_PATTERN.test(normalized)) {
      // A custom storefront domain is not a shop domain, and writing one would
      // make the unique index reject a later real install.
      console.warn(
        `Skipping ${business._id}: '${business.shopifyStoreUrl}' is not a myshopify domain.`,
      );
      skipped += 1;
      continue;
    }

    const collision = await businesses.findOne({
      shopifyShopDomain: normalized,
      _id: { $ne: business._id },
    });

    if (collision) {
      console.warn(
        `Skipping ${business._id}: ${normalized} is already held by ${collision._id}.`,
      );
      skipped += 1;
      continue;
    }

    await businesses.updateOne(
      { _id: business._id },
      { $set: { shopifyShopDomain: normalized } },
    );
    updated += 1;
  }

  console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
