import { Injectable, OnModuleInit, Logger, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';
import { Business, BusinessDocument } from './schemas/business.schema';
import { AdminRole } from './enums/admin-role.enum';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) { }

  async onModuleInit() {
    try {
      // 1. Heal any existing business records that have null or missing publishableKey
      const businessesWithoutKey = await this.businessModel
        .find({
          $or: [
            { publishableKey: null },
            { publishableKey: { $exists: false } },
            { publishableKey: '' },
          ],
        })
        .exec();

      if (businessesWithoutKey.length > 0) {
        this.logger.log(
          `[UsersService] Healing ${businessesWithoutKey.length} business document(s) with missing publishableKey...`,
        );
        for (const biz of businessesWithoutKey) {
          const randomHex = crypto.randomBytes(12).toString('hex');
          biz.publishableKey = `biz_live_${randomHex}`;
          await biz.save();
        }
      }

      // 2. Drop legacy non-sparse index and ensure sparse unique index exists
      await this.businessModel.collection.dropIndex('publishableKey_1').catch(() => null);
      await this.businessModel.collection
        .createIndex({ publishableKey: 1 }, { unique: true, sparse: true })
        .catch(() => null);
    } catch (err: any) {
      this.logger.warn(`[UsersService] Index initialization hint: ${err.message}`);
    }
  }

  async createBusiness(name: string, domain?: string): Promise<BusinessDocument> {
    const randomHex = crypto.randomBytes(12).toString('hex');
    const business = new this.businessModel({
      name,
      domain,
      publishableKey: `biz_live_${randomHex}`,
      status: 'pending',
    });

    return business.save();
  }

  async createAdminUser(params: {
    businessId: Types.ObjectId | string;
    email: string;
    passwordHash: string;
    name: string;
    role?: AdminRole;
  }): Promise<AdminUserDocument> {
    const adminUser = new this.adminUserModel({
      businessId: new Types.ObjectId(params.businessId),
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      name: params.name,
      role: params.role || AdminRole.USER,
      emailVerified: false,
    });

    return adminUser.save();
  }

  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findById(id).exec();
  }

  async findBusinessById(id: string): Promise<BusinessDocument | null> {
    return this.businessModel.findById(id).exec();
  }

  async updateAdminUser(
    id: string,
    update: Partial<AdminUser>,
  ): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
      .exec();
  }

  async deletePublishableKey(businessId: string): Promise<BusinessDocument> {
    const business = await this.businessModel.findById(businessId).exec();
    if (!business) {
      throw new DomainException('BUSINESS_NOT_FOUND', 'Business not found.', HttpStatus.NOT_FOUND);
    }
    business.publishableKey = null;
    return business.save();
  }

  async generatePublishableKey(
    businessId: string,
  ): Promise<{ business: BusinessDocument; publishableKey: string }> {
    const business = await this.businessModel.findById(businessId).exec();
    if (!business) {
      throw new DomainException('BUSINESS_NOT_FOUND', 'Business not found.', HttpStatus.NOT_FOUND);
    }
    if (business.publishableKey) {
      throw new DomainException(
        'KEY_ALREADY_EXISTS',
        'You already have an active publishable key. You must delete the existing key before generating a new one.',
        HttpStatus.CONFLICT,
      );
    }
    const randomHex = crypto.randomBytes(12).toString('hex');
    const publishableKey = `biz_live_${randomHex}`;
    business.publishableKey = publishableKey;
    const saved = await business.save();
    return { business: saved, publishableKey };
  }
}

