import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { RedisService } from '../common/redis/redis.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { IdentityVerificationUtil } from '../common/utils/identity-verification.util';
import { DomainException } from '../common/exceptions/domain.exception';

export interface CustomerResolutionOptions {
  customerToken?: {
    customerId: string;
    timestamp: number;
    signature: string;
  };
  deviceId?: string;
  name?: string;
  email?: string;
  phone?: string;
  sessionId?: string;
  /**
   * A staff test session. Always gets a fresh throwaway profile, never a real
   * shopper's, and that profile is hidden from listings and analytics.
   */
  isTest?: boolean;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Resolves an active customer session:
   * 1. If valid HMAC customerToken is provided -> authenticate & resolve registered customer.
   * 2. Else if deviceId provided -> lookup customer with self-healing merge pointer redirect.
   * 3. Else fallback to creating an ephemeral Ghost Customer profile.
   */
  async resolveOrCreateCustomer(
    businessId: string,
    options: CustomerResolutionOptions,
  ): Promise<{ customer: ReturnType<CustomersService['formatCustomer']>; isNewlyCreated: boolean }> {
    const { customerToken, deviceId } = options;

    if (options.isTest) {
      const testGhost = await new this.customerModel({
        businessId: businessId as any,
        name: 'Guest Shopper',
        isAnonymous: true,
        isTest: true,
        deviceIds: [],
        lastActiveAt: new Date(),
        metadata: { createdVia: 'staff_test_session', initialSessionId: options.sessionId },
      }).save();
      return { customer: this.formatCustomer(testGhost), isNewlyCreated: true };
    }

    // ── Tier 1: Deterministic Authenticated Customer Token (HMAC) ───────────
    if (customerToken && customerToken.customerId && customerToken.signature) {
      const business = await this.businessModel
        .findById(businessId)
        .select('+apiSecretHash')
        .exec();

      // Verify token signature against business secret (or apiKeyHash fallback for backward compatibility)
      const secret = (business as any)?.apiSecretHash || (business as any)?.apiKeyHash;
      if (secret) {
        const isValid = IdentityVerificationUtil.verifyCustomerToken(
          secret,
          customerToken.customerId,
          Number(customerToken.timestamp),
          customerToken.signature,
        );

        if (isValid) {
          let regCustomer = await this.customerModel
            .findOne({
              businessId: businessId as any,
              externalCustomerId: customerToken.customerId,
            })
            .exec();

          if (!regCustomer) {
            regCustomer = new this.customerModel({
              businessId: businessId as any,
              name: options.name || 'Registered Customer',
              externalCustomerId: customerToken.customerId,
              isAnonymous: false,
              deviceIds: deviceId ? [deviceId] : [],
              emailEncrypted: options.email ? EncryptionUtil.encrypt(options.email) : undefined,
              phoneEncrypted: options.phone ? EncryptionUtil.encrypt(options.phone) : undefined,
              lastActiveAt: new Date(),
            });
            await regCustomer.save();
            return { customer: this.formatCustomer(regCustomer), isNewlyCreated: true };
          }

          // Attach deviceId if new
          if (deviceId && (!regCustomer.deviceIds || !regCustomer.deviceIds.includes(deviceId))) {
            regCustomer.deviceIds = [...(regCustomer.deviceIds || []), deviceId];
          }
          regCustomer.lastActiveAt = new Date();
          await regCustomer.save();

          return { customer: this.formatCustomer(regCustomer), isNewlyCreated: false };
        } else {
          this.logger.warn(
            `[CustomersService] Invalid or expired customerToken for business ${businessId} and customerId ${customerToken.customerId}`,
          );
        }
      }
    }

    // ── Tier 2: Device ID Lookup (Returning Shopper) ──────────────────────────
    if (deviceId) {
      const resolved = await this.resolveCustomerByDeviceId(businessId, deviceId);
      if (resolved) {
        resolved.lastActiveAt = new Date();
        await resolved.save();
        return { customer: this.formatCustomer(resolved), isNewlyCreated: false };
      }
    }

    // ── Tier 3: Ghost / Anonymous Profile Creation ────────────────────────────
    const ghost = new this.customerModel({
      businessId: businessId as any,
      name: options.name || 'Guest Shopper',
      isAnonymous: true,
      deviceIds: deviceId ? [deviceId] : [],
      lastActiveAt: new Date(),
      metadata: {
        createdVia: 'widget_anonymous',
        initialSessionId: options.sessionId,
      },
    });

    const savedGhost = await ghost.save();
    return { customer: this.formatCustomer(savedGhost), isNewlyCreated: true };
  }

  /**
   * Resolves customer by deviceId, following merge redirects (with cycle guard and self-healing path compression).
   */
  async resolveCustomerByDeviceId(businessId: string, deviceId: string): Promise<CustomerDocument | null> {
    let currentCustomer: CustomerDocument | null = await this.customerModel
      .findOne({
        businessId: businessId as any,
        deviceIds: deviceId,
      })
      .exec();

    if (!currentCustomer) return null;

    let depth = 0;
    while (currentCustomer && currentCustomer.isMerged && currentCustomer.mergedIntoCustomerId && depth < 3) {
      const target: CustomerDocument | null = await this.customerModel
        .findOne({
          _id: currentCustomer.mergedIntoCustomerId as any,
          businessId: businessId as any,
        })
        .exec();

      if (!target) break;
      currentCustomer = target;
      depth++;
    }

    // ⚡ Self-healing: if we walked >0 merge hops, compress path for future O(1) lookups
    if (depth > 0 && currentCustomer) {
      this.customerModel
        .updateOne({ _id: (currentCustomer as any)._id }, { $addToSet: { deviceIds: deviceId } })
        .catch((err) => this.logger.warn(`[CustomersService] Path compression notice: ${err.message}`));
    }

    return currentCustomer;
  }

  /**
   * Non-destructive identity stitching: merges anonymous shopping state into a registered customer profile.
   */
  async stitchCustomerAccounts(
    businessId: string,
    anonymousCustomerId: string,
    registeredCustomerId: string,
    sessionId?: string,
    mergeReason = 'storefront_auth',
  ): Promise<void> {
    if (anonymousCustomerId === registeredCustomerId) return;

    const [anonDoc, regDoc] = await Promise.all([
      this.customerModel.findOne({ _id: anonymousCustomerId as any, businessId: businessId as any }).exec(),
      this.customerModel.findOne({ _id: registeredCustomerId as any, businessId: businessId as any }).exec(),
    ]);

    if (!anonDoc || !regDoc) return;

    // ── 1. Merge Redis Carts with Quantity Summing ───────────────────────────
    const anonCartKey = `cart:customer:${anonDoc._id}`;
    const regCartKey = `cart:customer:${regDoc._id}`;
    const convCartKey = sessionId ? `cart:conv:${sessionId}` : null;

    const [rawAnonCart, rawRegCart, rawConvCart] = await Promise.all([
      this.redisService.getClient().get(anonCartKey),
      this.redisService.getClient().get(regCartKey),
      convCartKey ? this.redisService.getClient().get(convCartKey) : Promise.resolve(null),
    ]);

    const anonItems = (rawAnonCart ? JSON.parse(rawAnonCart).items || [] : []).concat(
      rawConvCart ? JSON.parse(rawConvCart).items || [] : [],
    );
    const regItems = rawRegCart ? JSON.parse(rawRegCart).items || [] : [];

    const mergedMap = new Map<string, any>();
    for (const item of [...regItems, ...anonItems]) {
      // Keyed by variant as well as product: on a Shopify catalogue one product is
      // several purchasable variants, and merging a Medium into a Large would both
      // lose the shopper's choice and misstate the quantity.
      const key = `${item.productId}:${item.variantId || ''}`;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.quantity += item.quantity || 1;
      } else {
        mergedMap.set(key, { ...item });
      }
    }

    const mergedCart = {
      customerId: regDoc._id.toString(),
      items: Array.from(mergedMap.values()),
      updatedAt: Date.now(),
    };

    const redisOps: Promise<any>[] = [
      this.redisService.getClient().set(regCartKey, JSON.stringify(mergedCart), 'EX', 7 * 86400),
      this.redisService.getClient().del(anonCartKey),
    ];
    if (convCartKey) {
      redisOps.push(this.redisService.getClient().set(convCartKey, JSON.stringify(mergedCart), 'EX', 86400));
    }
    await Promise.all(redisOps);

    // ── 2. Repoint Orders & Preserve Audit Trail ─────────────────────────────
    await this.orderModel.updateMany(
      { customerId: anonDoc._id as any, businessId: businessId as any },
      {
        $set: {
          customerId: regDoc._id as any,
          'metadata.migratedFromAnonymousId': anonDoc._id.toString(),
        },
      },
    );

    // ── 3. Repoint Conversations ─────────────────────────────────────────────
    await this.conversationModel.updateMany(
      { customerId: anonDoc._id as any, businessId: businessId as any },
      { $set: { customerId: regDoc._id as any } },
    );


    // ── 4. Merge Preferences & Device IDs ────────────────────────────────────
    await this.customerModel.updateOne(
      { _id: regDoc._id },
      {
        $addToSet: { deviceIds: { $each: anonDoc.deviceIds || [] } },
        $set: {
          extractedPreferences: {
            ...anonDoc.extractedPreferences,
            ...regDoc.extractedPreferences,
          },
          lastActiveAt: new Date(),
        },
      },
    );

    // ── 5. Soft-Delete Anonymous Record (Audit Trail) ────────────────────────
    await this.customerModel.updateOne(
      { _id: anonDoc._id },
      {
        $set: {
          isAnonymous: false,
          isMerged: true,
          mergedIntoCustomerId: regDoc._id,
          mergedAt: new Date(),
          'metadata.mergeReason': mergeReason,
        },
      },
    );

    this.logger.log(
      `[CustomersService] ✅ Successfully stitched anonymous ${anonDoc._id} -> registered ${regDoc._id}`,
    );
  }

  /**
   * Individual Shopper Right-To-Erasure (GDPR Compliance).
   */
  async shopperErasure(businessId: string, id: string): Promise<{ success: boolean; message: string }> {
    const customer = await this.customerModel
      .findOne({ _id: id as any, businessId: businessId as any })
      .exec();

    if (!customer) {
      throw new DomainException('CUSTOMER_NOT_FOUND', 'Customer record not found.', HttpStatus.NOT_FOUND);
    }

    customer.name = 'Anonymized Shopper';
    customer.emailEncrypted = undefined;
    customer.phoneEncrypted = undefined;
    customer.extractedPreferences = {};
    customer.metadata = { erasedAt: new Date(), isErased: true };
    await customer.save();

    return { success: true, message: 'Shopper PII successfully erased.' };
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    const customer = new this.customerModel({
      businessId: businessId as any,
      name: dto.name || 'Guest Shopper',
      emailEncrypted: dto.email ? EncryptionUtil.encrypt(dto.email) : undefined,
      phoneEncrypted: dto.phone ? EncryptionUtil.encrypt(dto.phone) : undefined,
      extractedPreferences: dto.extractedPreferences || {},
      metadata: dto.metadata || {},
      isAnonymous: false,
      lastActiveAt: new Date(),
    });

    const saved = await customer.save();
    return this.formatCustomer(saved);
  }

  async findAll(businessId: string, search?: string) {
    const filter: Record<string, any> = {
      businessId: businessId as any,
      isMerged: { $ne: true }, // Filter out soft-deleted merged profiles by default
      isTest: { $ne: true }, // Throwaway shoppers from staff test sessions
    };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const items = await this.customerModel
      .find(filter)
      .sort({ lastActiveAt: -1, updatedAt: -1 })
      .exec();

    return items.map((item) => this.formatCustomer(item));
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.customerModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!customer) {
      throw new DomainException(
        'CUSTOMER_NOT_FOUND',
        `Customer with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatCustomer(customer);
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.customerModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!customer) {
      throw new DomainException(
        'CUSTOMER_NOT_FOUND',
        `Customer with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined) customer.emailEncrypted = EncryptionUtil.encrypt(dto.email);
    if (dto.phone !== undefined) customer.phoneEncrypted = EncryptionUtil.encrypt(dto.phone);
    if (dto.extractedPreferences !== undefined) {
      customer.extractedPreferences = {
        ...customer.extractedPreferences,
        ...dto.extractedPreferences,
      };
    }
    if (dto.metadata !== undefined) customer.metadata = { ...customer.metadata, ...dto.metadata };
    customer.lastActiveAt = new Date();

    const updated = await customer.save();
    return this.formatCustomer(updated);
  }

  formatCustomer(customer: CustomerDocument) {
    const doc = customer.toObject ? customer.toObject() : customer;
    return {
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      name: doc.name,
      email: doc.emailEncrypted ? EncryptionUtil.decrypt(doc.emailEncrypted) : null,
      phone: doc.phoneEncrypted ? EncryptionUtil.decrypt(doc.phoneEncrypted) : null,
      isAnonymous: doc.isAnonymous ?? true,
      isMerged: doc.isMerged ?? false,
      mergedIntoCustomerId: doc.mergedIntoCustomerId ? doc.mergedIntoCustomerId.toString() : null,
      deviceIds: doc.deviceIds || [],
      externalCustomerId: doc.externalCustomerId || null,
      extractedPreferences: doc.extractedPreferences || {},
      pastOrderIds: doc.pastOrderIds || [],
      metadata: doc.metadata || {},
      lastActiveAt: doc.lastActiveAt,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}

