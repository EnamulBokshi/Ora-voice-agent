import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { RedisService } from '../common/redis/redis.service';

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

  it('should return EmbeddingResult with 768-dimensional fallback vector', async () => {
    const result = await service.generateEmbedding('iPhone 15 Pro Max');
    expect(result.vector).toHaveLength(768);
    expect(result.embeddingModel).toBe('fallback-term-hash');
    expect(result.embeddingVersion).toBe('deterministic-v1');

    // Vector must be normalized (unit length)
    const magnitude = Math.sqrt(result.vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 4);
  });

  it('should calculate cosine similarity correctly', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    expect(service.cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 5);
  });

  it('should use GEMINI_EMBEDDING_MODEL from config and return gemini model metadata', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        embedding: { values: new Array(768).fill(0.1) },
      }),
    });
    global.fetch = fetchMock;

    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test_api_key';
        if (key === 'GEMINI_EMBEDDING_MODEL') return 'custom-embedding-model';
        return undefined;
      }),
    };

    const testModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    const customService = testModule.get<EmbeddingService>(EmbeddingService);
    const result = await customService.generateEmbedding('test text');

    expect(result.embeddingModel).toBe('custom-embedding-model');
    expect(result.embeddingVersion).toBe('gemini-v1');
    expect(result.vector).toHaveLength(768);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/custom-embedding-model:embedContent?key=test_api_key',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'models/custom-embedding-model',
          content: { parts: [{ text: 'test text' }] },
          outputDimensionality: 768,
        }),
      }),
    );
  });

  it('should return cached embedding from Redis when available', async () => {
    const mockRedis = {
      getClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(
          JSON.stringify({
            vector: [0.5, 0.5],
            embeddingModel: 'cached-model',
            embeddingVersion: 'gemini-v1',
          }),
        ),
        set: jest.fn().mockResolvedValue('OK'),
      }),
    };

    const cachedModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    const cachedService = cachedModule.get<EmbeddingService>(EmbeddingService);
    const res = await cachedService.generateEmbedding('hello cached world');
    expect(res.embeddingModel).toBe('cached-model');
    expect(res.vector).toEqual([0.5, 0.5]);
  });
});
