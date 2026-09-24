import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VoiceSessionController } from './voice-session.controller';
import { Business } from '../users/schemas/business.schema';
import { RedisService } from '../common/redis/redis.service';

import { ConfigService } from '@nestjs/config';
import { EntitlementService } from '../common/entitlement/entitlement.service';
import { VoiceTicketService } from './voice-ticket.service';

describe('VoiceSessionController', () => {
  let controller: VoiceSessionController;
  let mockBusinessModel: any;
  let mockRedisService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockBusinessModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_123456789012345678901234',
          name: 'Test Store',
          publishableKey: 'biz_live_test_key',
        }),
      }),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('fake_key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceSessionController],
      providers: [
        {
          // Entitlement is exercised in entitlement.service.spec.ts; the
          // storefront paths only need it to answer.
          provide: EntitlementService,
          useValue: {
            decide: jest.fn().mockResolvedValue({ entitled: true }),
            assertEntitled: jest.fn().mockResolvedValue(undefined),
            invalidate: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: VoiceTicketService,
          useValue: { issue: jest.fn(), redeem: jest.fn() },
        },
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    controller = module.get<VoiceSessionController>(VoiceSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should bootstrap voice session and return only safe fields', async () => {
    const mockReq = {
      business: {
        _id: 'biz_123456789012345678901234',
        name: 'Test Store',
        publishableKey: 'biz_live_test_key',
      },
    };

    const res = await controller.bootstrapSession(
      {
        publishableKey: 'biz_live_test_key',
        sessionId: 'ses_123',
      },
      mockReq,
    );

    expect(res.sessionId).toBe('ses_123');
    expect(res.wsPath).toBe('/ws/voice');

    // Security: must NOT contain any credentials
    expect((res as any).token).toBeUndefined();
    expect((res as any).wsUrl).toBeUndefined();
    expect((res as any).apiKey).toBeUndefined();
    expect((res as any).systemInstruction).toBeUndefined();
  });
});
