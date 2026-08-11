import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from './embedding.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
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
            generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
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
            findAll: jest.fn().mockResolvedValue([]),
            findChunksForDoc: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
