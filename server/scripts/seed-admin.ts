import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Schema, Document, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

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

// ─── 2. Target SuperAdmin Configuration ──────────────────────────────────────
const adminEmail = (
  process.env.ADMIN_EMAIL ||
  process.env.ADMIN_MAIL ||
  'admin@ora.ai'
)
  .trim()
  .toLowerCase();

const adminPassword = (
  process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASS ||
  'Admin@ora2026!'
).trim();

const adminName = (process.env.ADMIN_NAME || 'Platform SuperAdmin').trim();

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://ora_admin:ora_password_dev@localhost:27017/ora_db?authSource=admin';

// ─── 3. Typed Schemas & Models ──────────────────────────────────────────────
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
}

interface IBusiness extends Document {
  name: string;
  domain?: string;
  publishableKey?: string;
  keyStatus?: string;
  status: string;
  connectedPlatform: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IAdminUser extends Document {
  businessId: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessMongooseSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    publishableKey: { type: String, unique: true, sparse: true, index: true },
    keyStatus: { type: String, default: 'active', enum: ['active', 'suspended'] },
    status: { type: String, default: 'active', enum: ['active', 'suspended', 'pending'] },
    connectedPlatform: { type: String, default: 'none' },
  },
  { timestamps: true, collection: 'businesses' },
);

const AdminUserMongooseSchema = new Schema<IAdminUser>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.OWNER,
      index: true,
    },
    emailVerified: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: 'adminusers' },
);

// ─── 4. Seeding Execution ───────────────────────────────────────────────────
async function seedSuperAdmin(): Promise<void> {
  console.log('---------------------------------------------------------');
  console.log('⚡ ORA Platform — SuperAdmin Seeding & Provisioning');
  console.log('---------------------------------------------------------');
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✔ Connected to MongoDB successfully.');

    const BusinessModel =
      mongoose.models.Business ||
      mongoose.model<IBusiness>('Business', BusinessMongooseSchema);

    const AdminUserModel =
      mongoose.models.AdminUser ||
      mongoose.model<IAdminUser>('AdminUser', AdminUserMongooseSchema);

    // 1. Ensure System Business Tenant exists
    let systemBusiness = await BusinessModel.findOne({ name: 'ORA Platform' }).exec();
    if (!systemBusiness) {
      console.log('Creating System Tenant ("ORA Platform")...');
      systemBusiness = await BusinessModel.create({
        name: 'ORA Platform',
        domain: 'ora.ai',
        publishableKey: 'biz_live_ora_platform_system',
        keyStatus: 'active',
        status: 'active',
        connectedPlatform: 'none',
      });
      console.log(`✔ System Tenant created with ID: ${systemBusiness._id}`);
    } else {
      console.log(`✔ System Tenant exists: ${systemBusiness.name} (ID: ${systemBusiness._id})`);
    }

    // 2. Hash admin password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // 3. Create or update SuperAdmin User
    let adminUser = await AdminUserModel.findOne({ email: adminEmail }).exec();
    if (adminUser) {
      console.log(`Admin user with email "${adminEmail}" already exists. Updating credentials and role...`);
      adminUser.passwordHash = passwordHash;
      adminUser.role = AdminRole.SUPER_ADMIN;
      adminUser.name = adminName;
      adminUser.emailVerified = true;
      adminUser.businessId = systemBusiness._id as Types.ObjectId;
      await adminUser.save();
      console.log(`✔ SuperAdmin user updated successfully.`);
    } else {
      console.log(`Creating new SuperAdmin user: "${adminEmail}"...`);
      adminUser = await AdminUserModel.create({
        businessId: systemBusiness._id,
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: AdminRole.SUPER_ADMIN,
        emailVerified: true,
      });
      console.log(`✔ SuperAdmin user created with ID: ${adminUser._id}`);
    }

    // 4. Create or update AgentConfig for ORA Platform
    const AgentConfigSchema = new Schema(
      {
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
        brandVoiceDescription: { type: String, default: 'Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA.' },
        language: { type: String, default: 'en' },
        businessArchetype: { type: String, default: 'saas' },
        businessSummary: { type: String, default: 'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.' },
        customDirectives: { type: String, default: 'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.' },
        idleTimeoutSeconds: { type: Number, default: 10 },
        discountFloorPercent: { type: Number, default: 10 },
        alwaysOfferProductIds: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true, collection: 'agentconfigs' },
    );

    const AgentConfigModel =
      mongoose.models.AgentConfig ||
      mongoose.model('AgentConfig', AgentConfigSchema);

    let agentConfig = await AgentConfigModel.findOne({ businessId: systemBusiness._id }).exec();
    if (agentConfig) {
      agentConfig.businessArchetype = 'saas';
      agentConfig.businessSummary = 'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.';
      agentConfig.customDirectives = 'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.';
      await agentConfig.save();
      console.log(`✔ AgentConfig updated for ORA Platform (Archetype: saas).`);
    } else {
      await AgentConfigModel.create({
        businessId: systemBusiness._id,
        businessArchetype: 'saas',
        businessSummary: 'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.',
        brandVoiceDescription: 'Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA.',
        customDirectives: 'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.',
      });
      console.log(`✔ AgentConfig created for ORA Platform (Archetype: saas).`);
    }

    console.log('---------------------------------------------------------');
    console.log('🎉 SUPERADMIN PROVISIONED SUCCESSFULLY');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${'*'.repeat(adminPassword.length)}`);
    console.log(`  Role:     ${AdminRole.SUPER_ADMIN}`);
    console.log(`  Name:     ${adminName}`);
    console.log(`  Tenant:   ${systemBusiness.name} (${systemBusiness._id})`);
    console.log(`  Archetype: saas`);
    console.log(`  Verified: true`);
    console.log('---------------------------------------------------------');
  } catch (error: any) {
    console.error('✖ Error during Admin Seeding:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✔ MongoDB connection closed.');
  }
}

seedSuperAdmin();

