import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VoiceSessionController } from './voice-session.controller';
import { Business } from '../users/schemas/business.schema';

describe('VoiceSessionController', () => {
  let controller: VoiceSessionController;
  let mockBusinessModel: any;

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceSessionController],
      providers: [
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
      ],
    }).compile();

    controller = module.get<VoiceSessionController>(VoiceSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should bootstrap voice session and return only safe fields', async () => {
    const res = await controller.bootstrapSession({
      publishableKey: 'biz_live_test_key',
      sessionId: 'ses_123',
    });

    expect(res.sessionId).toBe('ses_123');
    expect(res.wsPath).toBe('/ws/voice');

    // Security: must NOT contain any credentials
    expect((res as any).token).toBeUndefined();
    expect((res as any).wsUrl).toBeUndefined();
    expect((res as any).apiKey).toBeUndefined();
    expect((res as any).systemInstruction).toBeUndefined();
  });
});
