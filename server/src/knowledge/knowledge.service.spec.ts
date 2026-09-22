import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeBase } from './schemas/knowledge-base.schema';
import { KnowledgeChunk } from './schemas/knowledge-chunk.schema';
import { Subscription } from '../billing/schemas/subscription.schema';
import { Plan } from '../billing/schemas/plan.schema';
import { AgentProfileService } from '../common/agent-profile/agent-profile.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: AgentProfileService,
          useValue: {
            getActiveArchetype: jest.fn().mockResolvedValue('general'),
            setActiveArchetype: jest.fn().mockResolvedValue('general'),
            invalidate: jest.fn(),
          },
        },
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
        {
          provide: getModelToken(Subscription.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
          },
        },
        {
          provide: getModelToken(Plan.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
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
