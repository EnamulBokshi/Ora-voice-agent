import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsExecutor } from './ai-tools.executor';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { OrdersService } from '../../orders/orders.service';
import { AgentConfigService } from '../../agent-config/agent-config.service';

describe('AiToolsExecutor', () => {
  let executor: AiToolsExecutor;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AiToolsExecutor,
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            }),
            verifyLive: jest.fn().mockResolvedValue({
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            }),
            verifyLiveBatch: jest.fn().mockResolvedValue([
              {
                _id: 'prod_123',
                name: 'Test Audio Headset',
                price: 150,
                stockQuantity: 10,
                availability: 'in_stock',
              },
            ]),
            verifyLiveDocs: jest.fn().mockImplementation((_biz, docs) =>
              Promise.resolve(docs.map((d: any) => ({ ...d, isLowStock: false }))),
            ),
            findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
          },
        },
        {
          provide: RagService,
          useValue: {
            searchCombined: jest.fn().mockResolvedValue({
              products: [{ id: 'prod_123' }],
              fallbackTriggered: false,
            }),
            searchKnowledge: jest.fn().mockResolvedValue({ results: [] }),
          },
        },
        {
          provide: KnowledgeService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null),
              set: jest.fn().mockResolvedValue('OK'),
              del: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        {
          provide: EventsService,
          useValue: { logEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue({
              orderNumber: 'ORD-2026-000001',
              totalAmount: 150,
              status: 'pending',
            }),
          },
        },
        {
          provide: AgentConfigService,
          useValue: {
            getConfig: jest.fn().mockResolvedValue({
              config: { brandVoiceDescription: 'Test assistant' },
              playbook: { mentionLowStockUrgency: true },
            }),
          },
        },
      ],
    }).compile();

    executor = module.get<AiToolsExecutor>(AiToolsExecutor);
  });

  it('should execute find_products tool with live verification', async () => {
    const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
      query: 'headphones',
    });
    expect(res.success).toBe(true);
    expect(res.products.length).toBe(1);
    expect(res.products[0].name).toBe('Test Audio Headset');
  });

  describe('find_products latency paths', () => {
    let products: any;
    let rag: any;
    let agentConfig: any;

    beforeEach(() => {
      products = module.get(ProductsService);
      rag = module.get(RagService);
      agentConfig = module.get(AgentConfigService);
    });

    it('reuses the documents RAG already hydrated instead of re-reading them by id', async () => {
      rag.searchCombined.mockResolvedValue({
        products: [
          {
            entityId: 'prod_123',
            data: {
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            },
          },
        ],
        knowledge: [],
        fallbackTriggered: false,
        fallbackTier: 'none',
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'headphones',
      });

      expect(res.products[0].name).toBe('Test Audio Headset');
      expect(products.verifyLiveDocs).toHaveBeenCalledTimes(1);
      expect(products.verifyLiveBatch).not.toHaveBeenCalled();
    });

    it('answers a confident keyword match without waiting for the semantic search', async () => {
      let ragSettled = false;
      rag.searchCombined.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              ragSettled = true;
              resolve({ products: [], knowledge: [], fallbackTriggered: true, fallbackTier: 'none' });
            }, 50);
          }),
      );
      products.findAll.mockResolvedValue({
        items: [
          {
            _id: 'prod_777',
            name: 'Merino Wool Scarf',
            price: 40,
            stockQuantity: 8,
            availability: 'in_stock',
          },
        ],
        total: 1,
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'wool scarf',
      });

      expect(res.fallbackTier).toBe('keyword_fast_path');
      expect(res.products[0].name).toBe('Merino Wool Scarf');
      // The embedding round trip is still in flight — the shopper did not wait for it.
      expect(ragSettled).toBe(false);
    });

    it('falls through to the semantic search when the keyword hit is only partial', async () => {
      products.findAll.mockResolvedValue({
        items: [
          {
            _id: 'prod_777',
            name: 'Cotton Scarf',
            price: 40,
            stockQuantity: 8,
            availability: 'in_stock',
          },
        ],
        total: 1,
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'wool scarf',
      });

      // 'wool' is absent from the name, so the vector search still gets its say.
      expect(res.fallbackTier).not.toBe('keyword_fast_path');
      expect(rag.searchCombined).toHaveBeenCalled();
    });

    it('reads the low-stock urgency playbook flag once per tenant, not once per call', async () => {
      await executor.executeTool('biz_cached', 'sess_1', 'find_products', { query: 'headphones' });
      await executor.executeTool('biz_cached', 'sess_1', 'find_products', { query: 'headphones' });

      expect(agentConfig.getConfig).toHaveBeenCalledTimes(1);
    });
  });
});
