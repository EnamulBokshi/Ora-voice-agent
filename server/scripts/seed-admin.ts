import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

// Load environment variables from .env if present
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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Target Admin Credentials
const adminEmail = (process.env.ADMIN_EMAIL || process.env.ADMIN_MAIL || 'admin@ora.ai').trim().toLowerCase();
const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'Admin@ora2026!').trim();
const adminName = (process.env.ADMIN_NAME || 'Platform SuperAdmin').trim();
const mongoUri = process.env.MONGODB_URI || 'mongodb://ora_admin:ora_password_dev@localhost:27017/ora_db?authSource=admin';

import { BusinessSchema } from '../src/users/schemas/business.schema';
import { AdminUserSchema } from '../src/users/schemas/admin-user.schema';
import { AdminRole } from '../src/users/enums/admin-role.enum';

async function seedAdmin() {
  console.log('---------------------------------------------------------');
  console.log('⚡ ORA Platform — SuperAdmin Seeding Utility');
  console.log('---------------------------------------------------------');
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);

  try {
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB successfully.');

    const BusinessModel = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
    const AdminUserModel = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

    // 1. Ensure System Business Tenant exists
    let systemBusiness = await BusinessModel.findOne({ name: 'ORA Platform' });
    if (!systemBusiness) {
      console.log('Creating System Tenant ("ORA Platform")...');
      systemBusiness = await BusinessModel.create({
        name: 'ORA Platform',
        domain: 'ora.ai',
        publishableKey: 'biz_live_ora_platform_system',
        status: 'active',
        connectedPlatform: 'none',
      });
      console.log(` System Tenant created with ID: ${systemBusiness._id}`);
    } else {
      console.log(` System Tenant exists: ${systemBusiness.name} (ID: ${systemBusiness._id})`);
    }

    // 2. Hash admin password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // 3. Create or update SuperAdmin User
    let adminUser = await AdminUserModel.findOne({ email: adminEmail });
    if (adminUser) {
      console.log(`Admin user with email "${adminEmail}" already exists. Updating credentials and role...`);
      adminUser.passwordHash = passwordHash;
      adminUser.role = AdminRole.SUPER_ADMIN;
      adminUser.name = adminName;
      adminUser.emailVerified = true;
      adminUser.businessId = systemBusiness._id;
      await adminUser.save();
      console.log(` SuperAdmin user updated successfully.`);
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
      console.log(` SuperAdmin user created with ID: ${adminUser._id}`);
    }

    console.log('---------------------------------------------------------');
    console.log(' SUPERADMIN PROVISIONED SUCCESSFULLY');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Role:     super_admin`);
    console.log(`  Name:     ${adminName}`);
    console.log(`  Tenant:   ${systemBusiness.name}`);
    console.log(`  Verified: true`);
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error(' Error during Admin Seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log(' MongoDB connection closed.');
  }
}

seedAdmin();
