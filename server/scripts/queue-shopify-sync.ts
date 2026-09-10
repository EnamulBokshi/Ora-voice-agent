/**
 * Queues the initial Shopify catalog import for an already-installed store.
 *
 * Provisioning enqueues this automatically, but that enqueue is deliberately
 * non-fatal: if it fails, the store is still installed and usable, and the
 * install branch will not run again because the Business already exists. This
 * script is the recovery path the error log points at.
 *
 * Run: pnpm --filter server exec ts-node scripts/queue-shopify-sync.ts <shop-domain>
 */
import { Queue } from 'bullmq';
import mongoose from 'mongoose';

const SHOPIFY_SYNC_QUEUE = 'shopify-catalog-sync';

async function main() {
  const shopArg = process.argv[2];
  if (!shopArg) {
    console.error('Usage: ts-node scripts/queue-shopify-sync.ts <shop>.myshopify.com');
    process.exit(1);
  }

  const shopDomain = shopArg
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ora';
  await mongoose.connect(mongoUri);

  const business = await mongoose.connection
    .collection('businesses')
    .findOne({ shopifyShopDomain: shopDomain });

  if (!business) {
    console.error(`No installed store found for ${shopDomain}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const queue = new Queue(SHOPIFY_SYNC_QUEUE, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    },
  });

  // Same job id the provisioning path uses, so this replaces a pending job
  // rather than adding a duplicate walk of the catalog. BullMQ rejects a custom
  // id containing ':'.
  const job = await queue.add(
    'initial-catalog-sync',
    { businessId: business._id.toString(), shopDomain },
    {
      jobId: `initial-sync-${shopDomain}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    },
  );

  console.log(
    `Queued catalog sync for ${shopDomain} (business ${business._id.toString()}), job ${job.id}.`,
  );
  console.log('The running server picks it up; watch for a [ShopifySync] log line.');

  await queue.close();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
