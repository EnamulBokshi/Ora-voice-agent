import { Injectable, OnModuleInit, Logger, HttpStatus, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';
import { Business, BusinessDocument } from './schemas/business.schema';
import { AdminRole } from './enums/admin-role.enum';
import { DomainException } from '../common/exceptions/domain.exception';
import { ApiKeyUtil } from '../common/utils/api-key.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { VoiceProxyGateway } from '../ai-voice/voice-proxy.gateway';
import { GeminiVoiceService } from '../ai-voice/gemini-voice.service';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @Optional()
    @Inject(forwardRef(() => VoiceProxyGateway))
    private readonly voiceProxyGateway?: VoiceProxyGateway,
    @Optional()
    @Inject(forwardRef(() => GeminiVoiceService))
    private readonly geminiVoiceService?: GeminiVoiceService,
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

      // A secret key is only useful if the merchant sees the plaintext, which
      // happens once, at generation. Minting one here would store a hash for a
      // key nobody can read, so a business has no secret key until
      // POST /business/secret-key is called.

      // 2. Drop legacy non-sparse index and ensure sparse unique index exists
      await this.businessModel.collection.dropIndex('publishableKey_1').catch(() => null);
      await this.businessModel.collection
        .createIndex({ publishableKey: 1 }, { unique: true, sparse: true })
        .catch(() => null);
      await this.businessModel.collection
        .createIndex({ secretApiKey: 1 }, { unique: true, sparse: true })
        .catch(() => null);
      await this.businessModel.collection
        .createIndex({ secretApiKeyHash: 1 }, { unique: true, sparse: true })
        .catch(() => null);
    } catch (err: any) {
      this.logger.warn(`[UsersService] Index initialization hint: ${err.message}`);
    }
  }

  /**
   * `status` defaults to `'pending'` because a web signup is not usable until
   * its owner verifies the email OTP. A provisioning flow that has already
   * established the owner's identity out of band — the Shopify embedded app
   * install, for one — passes `overrides` to create an immediately usable
   * tenant. Keep this the only place a Business is created, so a second
   * creation path cannot drift from the publishable-key convention.
   */
  async createBusiness(
    name: string,
    domain?: string,
    overrides?: Partial<Business>,
  ): Promise<BusinessDocument> {
    const randomHex = crypto.randomBytes(12).toString('hex');
    // No secret key here: it can only be handed over once, so the merchant
    // asks for it explicitly via POST /business/secret-key.
    const business = new this.businessModel({
      name,
      domain,
      publishableKey: `biz_live_${randomHex}`,
      status: 'pending',
      ...(overrides || {}),
    });

    return business.save();
  }

  /**
   * `emailVerified` defaults to false because a web signup must complete the
   * OTP flow. A caller that has already had the address verified by an external
   * identity provider passes `emailVerified: true` — otherwise billing emails
   * and invoices stay queued for that account (see server/AGENTS.md 2.1).
   */
  async createAdminUser(params: {
    businessId: Types.ObjectId | string;
    email: string;
    passwordHash: string;
    name: string;
    role?: AdminRole;
    emailVerified?: boolean;
  }): Promise<AdminUserDocument> {
    const adminUser = new this.adminUserModel({
      businessId: new Types.ObjectId(params.businessId),
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      name: params.name,
      role: params.role || AdminRole.USER,
      emailVerified: params.emailVerified ?? false,
    });

    return adminUser.save();
  }

  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findById(id).exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ resetPasswordTokenHash: tokenHash }).exec();
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

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AdminUserDocument> {
    const user = await this.adminUserModel.findById(userId).exec();
    if (!user) {
      throw new DomainException('USER_NOT_FOUND', 'User not found.', HttpStatus.NOT_FOUND);
    }

    if (dto.name !== undefined) user.name = dto.name;
    const saved = await user.save();

    // Immediately invalidate in-memory AI voice user and instruction caches
    try {
      if (this.voiceProxyGateway) {
        this.voiceProxyGateway.invalidateUserCache(userId, saved.name);
      }
      if (this.geminiVoiceService && saved.businessId) {
        this.geminiVoiceService.invalidateInstructionCache(saved.businessId.toString());
      }
    } catch (err: any) {
      this.logger.warn(`[UsersService] Failed to invalidate AI voice cache on profile update: ${err.message}`);
    }

    return saved;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.adminUserModel.findById(userId).exec();
    if (!user) {
      throw new DomainException('USER_NOT_FOUND', 'User not found.', HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new DomainException(
        'INVALID_PASSWORD',
        'Current password is incorrect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await user.save();

    return { message: 'Password changed successfully.' };
  }

  async updateBusiness(
    businessId: string,
    dto: UpdateBusinessDto,
  ): Promise<BusinessDocument> {
    const business = await this.businessModel.findById(businessId).exec();
    if (!business) {
      throw new DomainException('BUSINESS_NOT_FOUND', 'Business not found.', HttpStatus.NOT_FOUND);
    }

    if (dto.name !== undefined) business.name = dto.name;
    if (dto.domain !== undefined) business.domain = dto.domain;
    if (dto.shopifyStoreUrl !== undefined) business.shopifyStoreUrl = dto.shopifyStoreUrl;
    if (dto.woocommerceStoreUrl !== undefined) business.woocommerceStoreUrl = dto.woocommerceStoreUrl;
    if (dto.isWidgetActive !== undefined) business.isWidgetActive = dto.isWidgetActive;

    const saved = await business.save();

    // Invalidate AI voice caches for business configuration
    try {
      if (this.geminiVoiceService) {
        this.geminiVoiceService.invalidateInstructionCache(businessId);
      }
      if (this.voiceProxyGateway) {
        this.voiceProxyGateway.invalidateBusinessCache(businessId);
      }
    } catch (err: any) {
      this.logger.warn(`[UsersService] Failed to invalidate AI voice cache on business update: ${err.message}`);
    }

    return saved;
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

  async deleteSecretKey(businessId: string): Promise<BusinessDocument> {
    const business = await this.businessModel.findById(businessId).exec();
    if (!business) {
      throw new DomainException('BUSINESS_NOT_FOUND', 'Business not found.', HttpStatus.NOT_FOUND);
    }
    business.secretApiKey = null;
    business.secretApiKeyHash = null;
    business.secretApiKeyHint = null;
    return business.save();
  }

  /**
   * Issues a new secret key. Only the hash is stored, so the plaintext
   * returned here is the merchant's single opportunity to copy it.
   */
  async generateSecretKey(
    businessId: string,
  ): Promise<{ business: BusinessDocument; secretApiKey: string }> {
    const business = await this.businessModel.findById(businessId).exec();
    if (!business) {
      throw new DomainException('BUSINESS_NOT_FOUND', 'Business not found.', HttpStatus.NOT_FOUND);
    }
    const secretApiKey = ApiKeyUtil.generateSecretKey();
    business.secretApiKey = null;
    business.secretApiKeyHash = ApiKeyUtil.hash(secretApiKey);
    business.secretApiKeyHint = ApiKeyUtil.hint(secretApiKey);
    const saved = await business.save();
    return { business: saved, secretApiKey };
  }
}

