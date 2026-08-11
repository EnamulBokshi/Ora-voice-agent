import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeBase } from './schemas/knowledge-base.schema';
import { KnowledgeChunk } from './schemas/knowledge-chunk.schema';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: getModelToken(KnowledgeBase.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(KnowledgeChunk.name),
          useValue: {
            insertMany: jest.fn(),
            find: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
