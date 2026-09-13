/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

// ─── 1. Load Environment Variables ──────────────────────────────────────────
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  if (!fs.existsSync(envPath)) {
    continue;
  }
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of envConfig.split('\n')) {
    // Strip a trailing CR so a CRLF-authored .env does not append "\r" to
    // every value — a Mongo URI with a trailing CR fails to connect.
    const trimmed = rawLine.replace(/\r$/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const line = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const idx = line.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
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

// ─── 2. Target SuperAdmin Configuration ──────────────────────────────────────
const DEFAULT_ADMIN_PASSWORD = 'Admin@ora2026!';

/**
 * The system tenant is identified by this sentinel publishable key, not by its
 * name. `AdminService.seedSuperAdminOnStartup()` uses the same key; looking the
 * tenant up by name alone lets a renamed tenant slip through and the insert
 * then fails on the unique `publishableKey` index.
 */
const SYSTEM_PUBLISHABLE_KEY = 'biz_live_ora_platform_system';
const SYSTEM_BUSINESS_NAME = 'ORA Platform';
const SYSTEM_BUSINESS_DOMAIN = 'tryora.live';

const SYSTEM_BRAND_VOICE =
  'Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA.';
const SYSTEM_BUSINESS_SUMMARY =
  'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.';
const SYSTEM_DIRECTIVES =
  'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.';

const adminEmail = (
  process.env.ADMIN_EMAIL ||
  process.env.ADMIN_MAIL ||
  'ora.admin@tryora.live'
)
  .trim()
  .toLowerCase();

const adminPassword = (
  process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASS ||
  DEFAULT_ADMIN_PASSWORD
).trim();

const adminName = (process.env.ADMIN_NAME || 'Platform SuperAdmin').trim();

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://ora_admin:ora_password_dev@localhost:27017/ora_db?authSource=admin';

// ─── 3. Typed Schemas & Models ──────────────────────────────────────────────
// These mirror server/src/**/schemas so the script runs in a bare container
// without bootstrapping Nest. Keep them in sync with the real schemas.
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
  USER = 'user',
}

interface IBusiness {
  name: string;
  domain?: string;
  publishableKey?: string | null;
  keyStatus?: string;
  status?: string;
  isWidgetActive?: boolean;
  connectedPlatform?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IAdminUser {
  businessId: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  emailVerified: boolean;
  otpAttemptCount: number;
  pendingOtpHash?: string;
  otpExpiresAt?: Date;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  shopifyStaffUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IAgentConfig {
  businessId: Types.ObjectId;
  brandVoiceDescription?: string;
  language?: string;
  businessArchetype?: string;
  businessSummary?: string;
  customDirectives?: string;
  systemPrompt?: string;
  greetingMessage?: string;
  avoidances?: string;
  idleTimeoutSeconds?: number;
  discountFloorPercent?: number;
  alwaysOfferProductIds?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BusinessMongooseSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    publishableKey: { type: String, unique: true, sparse: true },
    keyStatus: {
      type: String,
      default: 'active',
      enum: ['active', 'suspended', 'revoked', 'none'],
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['active', 'suspended', 'pending'],
    },
    isWidgetActive: { type: Boolean, default: true },
    connectedPlatform: {
      type: String,
      default: 'none',
      enum: ['shopify', 'woocommerce', 'feed', 'passive', 'manual', 'none'],
    },
  },
  { timestamps: true, collection: 'businesses', strict: false },
);

const AdminUserMongooseSchema = new Schema<IAdminUser>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(AdminRole),
      default: AdminRole.USER,
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    pendingOtpHash: { type: String },
    otpExpiresAt: { type: Date },
    otpAttemptCount: { type: Number, default: 0 },
    resetPasswordTokenHash: { type: String, index: true, sparse: true },
    resetPasswordExpiresAt: { type: Date },
    shopifyStaffUserId: { type: String, trim: true },
  },
  { timestamps: true, collection: 'adminusers', strict: false },
);

const AgentConfigMongooseSchema = new Schema<IAgentConfig>(
  {
    // Indexed, not unique — the application schema does not declare a unique
    // index here, and creating one from the seeder would diverge the database
    // from the running app.
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    brandVoiceDescription: {
      type: String,
      default: 'Helpful, professional, and friendly sales assistant.',
    },
    businessArchetype: {
      type: String,
      enum: [
        'portfolio',
        'agency_services',
        'saas',
        'ecommerce',
        'clinic_appointments',
        'consulting',
        'general',
      ],
      default: 'general',
    },
    businessSummary: { type: String, default: '' },
    customDirectives: { type: String, default: '' },
    systemPrompt: { type: String, default: '' },
    greetingMessage: { type: String, default: '' },
    avoidances: { type: String, default: '' },
    language: { type: String, default: 'en' },
    idleTimeoutSeconds: { type: Number, default: 10 },
    discountFloorPercent: { type: Number, default: 10 },
    alwaysOfferProductIds: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'agentconfigs', strict: false },
);

// ─── 4. Seeding Execution ───────────────────────────────────────────────────
async function seedSuperAdmin(): Promise<void> {
  console.log('---------------------------------------------------------');
  console.log('⚡ ORA Platform — SuperAdmin Seeding & Provisioning');
  console.log('---------------------------------------------------------');
  console.log(
    `Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`,
  );

  if (
    process.env.NODE_ENV === 'production' &&
    adminPassword === DEFAULT_ADMIN_PASSWORD
  ) {
    console.warn(
      '⚠ ADMIN_PASSWORD is unset, so the SuperAdmin is being provisioned with the built-in default password. Set ADMIN_PASSWORD and re-run before exposing this deployment.',
    );
  }

  let connected = false;

  try {
    await mongoose.connect(mongoUri);
    connected = true;
    console.log('✔ Connected to MongoDB successfully.');

    const BusinessModel =
      (mongoose.models.Business as mongoose.Model<IBusiness>) ||
      mongoose.model<IBusiness>('Business', BusinessMongooseSchema);

    const AdminUserModel =
      (mongoose.models.AdminUser as mongoose.Model<IAdminUser>) ||
      mongoose.model<IAdminUser>('AdminUser', AdminUserMongooseSchema);

    const AgentConfigModel =
      (mongoose.models.AgentConfig as mongoose.Model<IAgentConfig>) ||
      mongoose.model<IAgentConfig>('AgentConfig', AgentConfigMongooseSchema);

    // 1. Ensure the System Business Tenant exists.
    let systemBusiness = await BusinessModel.findOne({
      publishableKey: SYSTEM_PUBLISHABLE_KEY,
    }).exec();

    if (!systemBusiness) {
      systemBusiness = await BusinessModel.findOne({
        name: SYSTEM_BUSINESS_NAME,
      }).exec();
    }

    if (!systemBusiness) {
      console.log(`Creating System Tenant ("${SYSTEM_BUSINESS_NAME}")...`);
      systemBusiness = await BusinessModel.create({
        name: SYSTEM_BUSINESS_NAME,
        domain: SYSTEM_BUSINESS_DOMAIN,
        publishableKey: SYSTEM_PUBLISHABLE_KEY,
        keyStatus: 'active',
        status: 'active',
        connectedPlatform: 'none',
      });
      console.log(`✔ System Tenant created with ID: ${systemBusiness._id}`);
    } else {
      let businessModified = false;
      if (!systemBusiness.publishableKey) {
        systemBusiness.publishableKey = SYSTEM_PUBLISHABLE_KEY;
        businessModified = true;
      }
      // A pending tenant's API calls are rejected, so the system tenant must
      // never be left at the schema default.
      if (systemBusiness.status !== 'active') {
        systemBusiness.status = 'active';
        businessModified = true;
      }
      if (businessModified) {
        await systemBusiness.save();
      }
      console.log(
        `✔ System Tenant exists: ${systemBusiness.name} (ID: ${systemBusiness._id})`,
      );
    }

    const systemBusinessId = systemBusiness._id as Types.ObjectId;

    // 2. Hash the admin password.
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // 3. Create or update the SuperAdmin user.
    //    Fall back to the existing SuperAdmin when ADMIN_EMAIL has changed, so
    //    re-running with a new address renames that account instead of leaving
    //    two SuperAdmins behind.
    let adminUser = await AdminUserModel.findOne({ email: adminEmail }).exec();
    if (!adminUser) {
      adminUser = await AdminUserModel.findOne({
        role: AdminRole.SUPER_ADMIN,
      }).exec();
    }

    if (adminUser) {
      console.log(
        `SuperAdmin account found ("${adminUser.email}"). Synchronizing credentials and role...`,
      );
      adminUser.email = adminEmail;
      adminUser.passwordHash = passwordHash;
      adminUser.role = AdminRole.SUPER_ADMIN;
      adminUser.name = adminName;
      adminUser.emailVerified = true;
      adminUser.businessId = systemBusinessId;
      await adminUser.save();
      console.log('✔ SuperAdmin user updated successfully.');
    } else {
      console.log(`Creating new SuperAdmin user: "${adminEmail}"...`);
      adminUser = await AdminUserModel.create({
        businessId: systemBusinessId,
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: AdminRole.SUPER_ADMIN,
        emailVerified: true,
      });
      console.log(`✔ SuperAdmin user created with ID: ${adminUser._id}`);
    }

    // 4. Create or update the AgentConfig for the system tenant.
    const agentConfig = await AgentConfigModel.findOne({
      businessId: systemBusinessId,
    }).exec();

    if (agentConfig) {
      agentConfig.businessArchetype = 'saas';
      agentConfig.businessSummary = SYSTEM_BUSINESS_SUMMARY;
      agentConfig.brandVoiceDescription = SYSTEM_BRAND_VOICE;
      agentConfig.customDirectives = SYSTEM_DIRECTIVES;
      agentConfig.isActive = true;
      await agentConfig.save();
      console.log('✔ AgentConfig updated for ORA Platform (Archetype: saas).');
    } else {
      await AgentConfigModel.create({
        businessId: systemBusinessId,
        businessArchetype: 'saas',
        businessSummary: SYSTEM_BUSINESS_SUMMARY,
        brandVoiceDescription: SYSTEM_BRAND_VOICE,
        customDirectives: SYSTEM_DIRECTIVES,
        isActive: true,
      });
      console.log('✔ AgentConfig created for ORA Platform (Archetype: saas).');
    }

    console.log('---------------------------------------------------------');
    console.log('🎉 SUPERADMIN PROVISIONED SUCCESSFULLY');
    console.log(`  Email:     ${adminEmail}`);
    console.log('  Password:  ******** (unchanged from ADMIN_PASSWORD)');
    console.log(`  Role:      ${AdminRole.SUPER_ADMIN}`);
    console.log(`  Name:      ${adminName}`);
    console.log(
      `  Tenant:    ${systemBusiness.name} (${systemBusinessId.toString()})`,
    );
    console.log('  Archetype: saas');
    console.log('  Verified:  true');
    console.log('---------------------------------------------------------');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('✖ Error during Admin Seeding:', message);
    // Set the exit code rather than calling process.exit() here: exiting from
    // the catch block skips the disconnect below and truncates buffered output.
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
      console.log('✔ MongoDB connection closed.');
    }
  }
}

seedSuperAdmin().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('✖ Fatal error during Admin Seeding:', message);
  process.exitCode = 1;
});
