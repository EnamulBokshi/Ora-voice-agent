/**
 * Migrates merchant credentials to their protected form:
 *
 *   1. `secretApiKey` (plaintext)        -> `secretApiKeyHash` + `secretApiKeyHint`
 *   2. `shopifyAccessToken`,             -> AES-256-GCM ciphertext
 *      `woocommerceConsumerKey`,
 *      `woocommerceConsumerSecret`,
 *      `woocommerceWebhookSecret`
 *
 * A plaintext secret key cannot be recovered afterwards, which is the point:
 * keys already in use keep working because the hash authenticates them, and
 * the plaintext column is emptied.
 *
 * Run with `pnpm run migrate:hash-keys`. Re-running is safe.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { ApiKeyUtil } from '../src/common/utils/api-key.util';
import { BusinessCredentialsUtil } from '../src/common/utils/business-credentials.util';

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

const dryRun = process.argv.includes('--dry-run');

const ENCRYPTED_FIELDS = [
  'shopifyAccessToken',
  'woocommerceConsumerKey',
  'woocommerceConsumerSecret',
  'woocommerceWebhookSecret',
] as const;

async function migrate(): Promise<void> {
  console.log('---------------------------------------------------------');
  console.log('⚡ ORA Platform — Credential Protection Migration');
  if (dryRun) console.log('   (dry run: no documents will be written)');
  console.log('---------------------------------------------------------');
  console.log(
    `Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`,
  );

  if (!process.env.ENCRYPTION_SECRET) {
    console.warn(
      '⚠ ENCRYPTION_SECRET is not set. Connector credentials would be encrypted with the development key.',
    );
    if (process.env.NODE_ENV === 'production') {
      console.error('✖ Refusing to run against production without it.');
      process.exit(1);
    }
  }

  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB successfully.');

  const businesses = mongoose.connection.collection('businesses');

  let hashed = 0;
  let alreadyHashed = 0;
  let encrypted = 0;
  let conflicted = 0;

  try {
    const cursor = businesses.find({});

    while (await cursor.hasNext()) {
      const doc: any = await cursor.next();
      if (!doc) continue;

      const set: Record<string, any> = {};
      const unset: Record<string, ''> = {};

      // ── 1. Secret API key -> hash + hint ──────────────────────────────────
      if (typeof doc.secretApiKey === 'string' && doc.secretApiKey) {
        const hash = ApiKeyUtil.hash(doc.secretApiKey);

        // A hash collision across tenants would break the unique index, so
        // check before claiming the value.
        const owner = await businesses.findOne({ secretApiKeyHash: hash });

        if (owner && String(owner._id) !== String(doc._id)) {
          console.error(
            `✖ Business ${doc._id} shares a secret key with ${owner._id}. Left untouched; rotate one of them.`,
          );
          conflicted++;
        } else {
          if (!doc.secretApiKeyHash) {
            set.secretApiKeyHash = hash;
            set.secretApiKeyHint = ApiKeyUtil.hint(doc.secretApiKey);
            hashed++;
          } else {
            alreadyHashed++;
          }
          unset.secretApiKey = '';
        }
      }

      // ── 2. Connector credentials -> encrypted at rest ─────────────────────
      for (const field of ENCRYPTED_FIELDS) {
        const value = doc[field];
        if (
          typeof value === 'string' &&
          value &&
          !BusinessCredentialsUtil.isEncrypted(value)
        ) {
          set[field] = BusinessCredentialsUtil.protect(value);
          encrypted++;
        }
      }

      if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
        continue;
      }

      if (dryRun) {
        console.log(
          `  would update ${doc._id}: set [${Object.keys(set).join(', ')}] unset [${Object.keys(unset).join(', ')}]`,
        );
        continue;
      }

      const update: Record<string, any> = {};
      if (Object.keys(set).length > 0) update.$set = set;
      if (Object.keys(unset).length > 0) update.$unset = unset;

      await businesses.updateOne({ _id: doc._id }, update);
    }

    await businesses
      .createIndex({ secretApiKeyHash: 1 }, { unique: true, sparse: true })
      .catch((err) =>
        console.warn(`⚠ Could not create the secretApiKeyHash index: ${err.message}`),
      );

    console.log('---------------------------------------------------------');
    console.log('🎉 MIGRATION COMPLETE');
    console.log(`  Secret keys hashed:            ${hashed}`);
    console.log(`  Secret keys already hashed:    ${alreadyHashed}`);
    console.log(`  Connector values encrypted:    ${encrypted}`);
    console.log(`  Conflicting keys left alone:   ${conflicted}`);
    console.log('---------------------------------------------------------');

    if (conflicted > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error('✖ Error during migration:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✔ MongoDB connection closed.');
  }
}

migrate();
