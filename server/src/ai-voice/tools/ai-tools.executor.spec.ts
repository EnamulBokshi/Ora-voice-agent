import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsExecutor } from './ai-tools.executor';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';

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
          },
        },
        {
          provide: RagService,
          useValue: {
            searchCombined: jest.fn().mockResolvedValue({
              products: [],
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
            }),
          },
        },
        {
          provide: EventsService,
          useValue: { logEvent: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    executor = module.get<AiToolsExecutor>(AiToolsExecutor);
  });

  it('should execute search_products tool', async () => {
    const res = await executor.executeTool('biz_1', 'sess_1', 'search_products', {
      query: 'headphones',
    });
    expect(res.success).toBe(true);
  });
});
