import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { RagService } from './rag.service';
import { VectorStoreService } from '../../vector/vector-store.service';
import { EmbeddingService } from '../../vector/embedding.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { Business } from '../../users/schemas/business.schema';

describe('RagService', () => {
  let service: RagService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: getModelToken(Business.name),
          useValue: {
            findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
          },
        },
        {
          provide: VectorStoreService,
          useValue: {
            searchVectors: jest.fn().mockResolvedValue([]),
            upsertVector: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateEmbedding: jest.fn().mockResolvedValue({
              vector: new Array(768).fill(0.1),
              embeddingModel: 'test',
              embeddingVersion: 'v1',
            }),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ items: [], pagination: {} }),
            findOne: jest.fn(),
          },
        },
        {
          provide: KnowledgeService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ items: [] }),
            findChunksForDoc: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate embedding once and return combined search results', async () => {
    const embeddingService = moduleRef.get<EmbeddingService>(EmbeddingService);
    const res = await service.searchCombined('biz_123', 'headphones');
    expect(res.query).toBe('headphones');
    expect(res.products).toBeDefined();
    expect(res.knowledge).toBeDefined();
    // Embedding should only be generated once for searchCombined
    expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);
  });
});
