import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate normalized 768-dimensional fallback vector', async () => {
    const vec = await service.generateEmbedding('iPhone 15 Pro Max');
    expect(vec).toHaveLength(768);

    // Compute magnitude
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 4);
  });

  it('should calculate cosine similarity correctly', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    expect(service.cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 5);
  });
});
