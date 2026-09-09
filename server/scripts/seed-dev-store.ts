import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Schema, Document } from 'mongoose';

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

// ─── 2. Guard: never provision a well-known key against production ──────────
if (process.env.NODE_ENV === 'production') {
  console.error(
    '✖ Refusing to seed the dev playground store with NODE_ENV=production.',
  );
  process.exit(1);
}

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://ora_admin:ora_password_dev@localhost:27017/ora_db?authSource=admin';

const storeName = process.env.DEV_STORE_NAME || 'Dev Playground Store';
const publishableKey =
  process.env.DEV_PUBLISHABLE_KEY || 'biz_live_mock_key_12345';

/**
 * The secret key is a real credential in the local database rather than a
 * literal recognised by DualAuthGuard, so it is provisioned here and printed
 * once. Set DEV_SECRET_API_KEY to keep it stable across re-seeds.
 */
const secretApiKey =
  process.env.DEV_SECRET_API_KEY ||
  `ora_sk_dev_${crypto.randomBytes(16).toString('hex')}`;

// ─── 3. Typed Schema & Model ────────────────────────────────────────────────
interface IBusiness extends Document {
  name: string;
  domain?: string;
  publishableKey?: string;
  secretApiKey?: string;
  keyStatus?: string;
  status: string;
  connectedPlatform: string;
}

const BusinessMongooseSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    publishableKey: { type: String, unique: true, sparse: true, index: true },
    secretApiKey: { type: String, unique: true, sparse: true, index: true },
    keyStatus: { type: String, default: 'active' },
    status: { type: String, default: 'active' },
    connectedPlatform: { type: String, default: 'none' },
  },
  { timestamps: true, collection: 'businesses' },
);

// ─── 4. Seeding Execution ───────────────────────────────────────────────────
async function seedDevStore(): Promise<void> {
  console.log('---------------------------------------------------------');
  console.log('⚡ ORA Platform — Dev Playground Store Seeding');
  console.log('---------------------------------------------------------');
  console.log(
    `Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`,
  );

  try {
    await mongoose.connect(mongoUri);
    console.log('✔ Connected to MongoDB successfully.');

    const BusinessModel =
      mongoose.models.Business ||
      mongoose.model<IBusiness>('Business', BusinessMongooseSchema);

    const business = await BusinessModel.findOneAndUpdate(
      { publishableKey },
      {
        name: storeName,
        publishableKey,
        secretApiKey,
        keyStatus: 'active',
        status: 'active',
        connectedPlatform: 'none',
      },
      { upsert: true, new: true },
    ).exec();

    console.log('---------------------------------------------------------');
    console.log('🎉 DEV PLAYGROUND STORE PROVISIONED');
    console.log(`  Tenant:          ${business.name} (${business._id})`);
    console.log(`  Publishable key: ${publishableKey}   (public, widget only)`);
    console.log(`  Secret API key:  ${secretApiKey}`);
    console.log('');
    console.log('  Call the REST API with:');
    console.log(`    X-API-Key: ${secretApiKey}`);
    console.log('---------------------------------------------------------');
  } catch (error: any) {
    console.error('✖ Error during Dev Store Seeding:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✔ MongoDB connection closed.');
  }
}

seedDevStore();
