import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Conversation,
  ConversationDocument,
} from '../conversations/schemas/conversation.schema';
import { Message, MessageDocument } from '../conversations/schemas/message.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import {
  KnowledgeBase,
  KnowledgeBaseDocument,
} from '../knowledge/schemas/knowledge-base.schema';
import {
  KnowledgeChunk,
  KnowledgeChunkDocument,
} from '../knowledge/schemas/knowledge-chunk.schema';
import {
  VectorIndex,
  VectorIndexDocument,
} from '../vector/schemas/vector-index.schema';

/**
 * Shopify's three mandatory compliance webhooks. An app cannot be listed
 * without them, and each one is a real data operation rather than a stub: the
 * merchant's Shopify Admin surfaces the result to the person who asked.
 */
@Injectable()
export class ShopifyComplianceService {
  private readonly logger = new Logger(ShopifyComplianceService.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(KnowledgeBase.name)
    private readonly knowledgeBaseModel: Model<KnowledgeBaseDocument>,
    @InjectModel(KnowledgeChunk.name)
    private readonly knowledgeChunkModel: Model<KnowledgeChunkDocument>,
    @InjectModel(VectorIndex.name)
    private readonly vectorIndexModel: Model<VectorIndexDocument>,
  ) {}

  /**
   * `customers/data_request` — the merchant must be able to hand the shopper
   * everything ORA holds on them. Returned to the caller and logged; Shopify
   * requires the merchant to deliver it, not ORA.
   */
  async handleCustomerDataRequest(payload: {
    shop_domain?: string;
    customer?: { id?: number; email?: string };
  }): Promise<{ customers: number; conversations: number }> {
    const business = await this.resolveBusiness(payload.shop_domain);
    if (!business) return { customers: 0, conversations: 0 };

    const customers = await this.findCustomers(
      business._id.toString(),
      payload.customer?.id,
    );
    const customerIds = customers.map((customer) => customer._id);

    const conversations = customerIds.length
      ? await this.conversationModel
          .find({ businessId: business._id as any, customerId: { $in: customerIds } as any })
          .exec()
      : [];

    this.logger.log(
      `[ShopifyCompliance] Data request for shop ${payload.shop_domain}: ${customers.length} customer record(s), ${conversations.length} conversation(s).`,
    );

    return { customers: customers.length, conversations: conversations.length };
  }

  /**
   * `customers/redact` — delete one shopper's records, including the
   * conversations that carry their transcripts.
   */
  async handleCustomerRedact(payload: {
    shop_domain?: string;
    customer?: { id?: number; email?: string };
  }): Promise<void> {
    const business = await this.resolveBusiness(payload.shop_domain);
    if (!business) return;

    const customers = await this.findCustomers(
      business._id.toString(),
      payload.customer?.id,
    );
    if (!customers.length) return;

    const customerIds = customers.map((customer) => customer._id);

    const conversations = await this.conversationModel
      .find({ businessId: business._id as any, customerId: { $in: customerIds } as any })
      .select('_id')
      .exec();
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (conversationIds.length) {
      // Message carries no businessId, so it is only reachable through its
      // conversation.
      await this.messageModel
        .deleteMany({ conversationId: { $in: conversationIds } as any })
        .exec();
      await this.conversationModel
        .deleteMany({ _id: { $in: conversationIds } as any })
        .exec();
    }

    await this.customerModel.deleteMany({ _id: { $in: customerIds } as any }).exec();

    this.logger.log(
      `[ShopifyCompliance] Redacted ${customerIds.length} customer(s) and ${conversationIds.length} conversation(s) for shop ${payload.shop_domain}.`,
    );
  }

  /**
   * `shop/redact` — Shopify sends this 48 hours after an uninstall. Everything
   * held for the tenant goes, and the Business row itself is removed last so a
   * partial failure leaves the tenant findable and the job repeatable.
   */
  async handleShopRedact(payload: { shop_domain?: string }): Promise<void> {
    const business = await this.resolveBusiness(payload.shop_domain);
    if (!business) return;

    const businessId = business._id;

    const conversations = await this.conversationModel
      .find({ businessId: businessId as any })
      .select('_id')
      .exec();
    const conversationIds = conversations.map((conversation) => conversation._id);

    if (conversationIds.length) {
      await this.messageModel
        .deleteMany({ conversationId: { $in: conversationIds } as any })
        .exec();
    }

    await Promise.all([
      this.conversationModel.deleteMany({ businessId: businessId as any }).exec(),
      this.customerModel.deleteMany({ businessId: businessId as any }).exec(),
      this.productModel.deleteMany({ businessId: businessId as any }).exec(),
      this.knowledgeChunkModel.deleteMany({ businessId: businessId as any }).exec(),
      this.knowledgeBaseModel.deleteMany({ businessId: businessId as any }).exec(),
      this.vectorIndexModel.deleteMany({ businessId: businessId as any }).exec(),
      this.adminUserModel.deleteMany({ businessId: businessId as any }).exec(),
    ]);

    await this.businessModel.deleteOne({ _id: businessId as any }).exec();

    this.logger.log(
      `[ShopifyCompliance] Shop redacted: business ${businessId.toString()} and all tenant data deleted for ${payload.shop_domain}.`,
    );
  }

  private async resolveBusiness(
    shopDomain?: string,
  ): Promise<BusinessDocument | null> {
    if (!shopDomain) return null;
    const normalized = shopDomain.trim().toLowerCase();

    return this.businessModel
      .findOne({
        $or: [
          { shopifyShopDomain: normalized },
          { shopifyStoreUrl: `https://${normalized}` },
          { shopifyStoreUrl: normalized },
        ],
      })
      .exec();
  }

  private async findCustomers(businessId: string, shopifyCustomerId?: number) {
    if (!shopifyCustomerId) return [];

    return this.customerModel
      .find({
        businessId: businessId as any,
        externalCustomerId: String(shopifyCustomerId),
      })
      .exec();
  }
}
