import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { ShopifyComplianceService } from './shopify-compliance.service';
import { Business } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { Product } from '../products/schemas/product.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { Message } from '../conversations/schemas/message.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { KnowledgeBase } from '../knowledge/schemas/knowledge-base.schema';
import { KnowledgeChunk } from '../knowledge/schemas/knowledge-chunk.schema';
import { VectorIndex } from '../vector/schemas/vector-index.schema';

const SHOP = 'demo-store.myshopify.com';

/**
 * Shopify will not list an app without these three topics, and each has to be a
 * real data operation: the merchant's Admin surfaces the outcome to the shopper
 * who asked.
 */
describe('ShopifyComplianceService', () => {
  let service: ShopifyComplianceService;

  const chain = (result: unknown) => ({
    exec: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
  });

  const model = (findResult: unknown = []) => ({
    find: jest.fn().mockReturnValue(chain(findResult)),
    findOne: jest.fn().mockReturnValue(chain(null)),
    findById: jest.fn().mockReturnValue(chain(null)),
    deleteMany: jest.fn().mockReturnValue(chain({ deletedCount: 0 })),
    deleteOne: jest.fn().mockReturnValue(chain({ deletedCount: 1 })),
  });

  let businessModel: any;
  let productModel: any;
  let conversationModel: any;
  let messageModel: any;
  let customerModel: any;
  let knowledgeBaseModel: any;
  let knowledgeChunkModel: any;
  let vectorIndexModel: any;
  let adminUserModel: any;

  beforeEach(async () => {
    businessModel = model();
    productModel = model();
    conversationModel = model();
    messageModel = model();
    customerModel = model();
    knowledgeBaseModel = model();
    knowledgeChunkModel = model();
    vectorIndexModel = model();
    adminUserModel = model();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyComplianceService,
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(AdminUser.name), useValue: adminUserModel },
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: getModelToken(Conversation.name), useValue: conversationModel },
        { provide: getModelToken(Message.name), useValue: messageModel },
        { provide: getModelToken(Customer.name), useValue: customerModel },
        { provide: getModelToken(KnowledgeBase.name), useValue: knowledgeBaseModel },
        { provide: getModelToken(KnowledgeChunk.name), useValue: knowledgeChunkModel },
        { provide: getModelToken(VectorIndex.name), useValue: vectorIndexModel },
      ],
    }).compile();

    service = module.get<ShopifyComplianceService>(ShopifyComplianceService);
  });

  const installTenant = () => {
    businessModel.findOne.mockReturnValue(
      chain({ _id: { toString: () => 'biz-1' } }),
    );
  };

  describe('shop/redact', () => {
    it('deletes catalog, knowledge, conversations, and vectors for the tenant', async () => {
      installTenant();
      conversationModel.find.mockReturnValue(chain([{ _id: 'conv-1' }]));

      await service.handleShopRedact({ shop_domain: SHOP });

      expect(productModel.deleteMany).toHaveBeenCalled();
      expect(knowledgeChunkModel.deleteMany).toHaveBeenCalled();
      expect(knowledgeBaseModel.deleteMany).toHaveBeenCalled();
      expect(vectorIndexModel.deleteMany).toHaveBeenCalled();
      expect(conversationModel.deleteMany).toHaveBeenCalled();
      expect(customerModel.deleteMany).toHaveBeenCalled();
      expect(adminUserModel.deleteMany).toHaveBeenCalled();
      // Message carries no businessId, so it is only reachable through its
      // conversation and would otherwise survive the redaction.
      expect(messageModel.deleteMany).toHaveBeenCalled();
    });

    it('removes the Business row last, so a partial failure stays repeatable', async () => {
      installTenant();
      const order: string[] = [];
      productModel.deleteMany.mockImplementation(() => {
        order.push('products');
        return chain({});
      });
      businessModel.deleteOne.mockImplementation(() => {
        order.push('business');
        return chain({});
      });

      await service.handleShopRedact({ shop_domain: SHOP });

      expect(order[order.length - 1]).toBe('business');
    });

    it('is a no-op for a shop that was never installed', async () => {
      businessModel.findOne.mockReturnValue(chain(null));

      await service.handleShopRedact({ shop_domain: 'unknown.myshopify.com' });

      expect(productModel.deleteMany).not.toHaveBeenCalled();
      expect(businessModel.deleteOne).not.toHaveBeenCalled();
    });

    it('ignores a payload with no shop domain', async () => {
      await service.handleShopRedact({});
      expect(businessModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('customers/redact', () => {
    it('deletes the shopper, their conversations, and those messages', async () => {
      installTenant();
      customerModel.find.mockReturnValue(chain([{ _id: 'cust-1' }]));
      conversationModel.find.mockReturnValue(chain([{ _id: 'conv-1' }]));

      await service.handleCustomerRedact({
        shop_domain: SHOP,
        customer: { id: 987 },
      });

      expect(messageModel.deleteMany).toHaveBeenCalled();
      expect(conversationModel.deleteMany).toHaveBeenCalled();
      expect(customerModel.deleteMany).toHaveBeenCalled();
    });

    it('leaves the tenant alone when the shopper is unknown to ORA', async () => {
      installTenant();
      customerModel.find.mockReturnValue(chain([]));

      await service.handleCustomerRedact({
        shop_domain: SHOP,
        customer: { id: 987 },
      });

      expect(customerModel.deleteMany).not.toHaveBeenCalled();
      expect(conversationModel.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('customers/data_request', () => {
    it('reports what ORA holds for the shopper', async () => {
      installTenant();
      customerModel.find.mockReturnValue(chain([{ _id: 'cust-1' }]));
      conversationModel.find.mockReturnValue(chain([{ _id: 'conv-1' }, { _id: 'conv-2' }]));

      const result = await service.handleCustomerDataRequest({
        shop_domain: SHOP,
        customer: { id: 987 },
      });

      expect(result).toEqual({ customers: 1, conversations: 2 });
    });

    it('reports nothing for an uninstalled shop', async () => {
      businessModel.findOne.mockReturnValue(chain(null));

      const result = await service.handleCustomerDataRequest({
        shop_domain: SHOP,
        customer: { id: 1 },
      });

      expect(result).toEqual({ customers: 0, conversations: 0 });
    });
  });
});
