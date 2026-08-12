import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsExecutor } from './ai-tools.executor';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { OrdersService } from '../../orders/orders.service';

describe('AiToolsExecutor', () => {
  let executor: AiToolsExecutor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
});
