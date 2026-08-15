import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VoiceSessionController } from './voice-session.controller';
import { GeminiVoiceService } from './gemini-voice.service';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { Business } from '../users/schemas/business.schema';

describe('VoiceSessionController', () => {
  let controller: VoiceSessionController;
  let geminiVoiceService: any;
  let aiToolsExecutor: any;
  let mockBusinessModel: any;

  beforeEach(async () => {
    mockBusinessModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_123456789012345678901234',
          publishableKey: 'biz_live_test_key',
        }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_123456789012345678901234',
          publishableKey: 'biz_live_mock_key_12345',
        }),
      }),
    };

    geminiVoiceService = {
      generateVoiceSessionBootstrap: jest.fn().mockResolvedValue({
        token: 'test_token',
        wsUrl: 'wss://generativelanguage.googleapis.com/ws/...',
        model: 'models/gemini-2.5-flash',
        systemInstruction: 'You are ORA',
        tools: [],
        voiceConfig: { voiceName: 'Puck' },
        sessionId: 'ses_123',
        businessId: 'biz_123456789012345678901234',
      }),
    };

    aiToolsExecutor = {
      executeTool: jest.fn().mockResolvedValue({
        success: true,
        products: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceSessionController],
      providers: [
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
        {
          provide: GeminiVoiceService,
          useValue: geminiVoiceService,
        },
        {
          provide: AiToolsExecutor,
          useValue: aiToolsExecutor,
        },
      ],
    }).compile();

    controller = module.get<VoiceSessionController>(VoiceSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should bootstrap voice session successfully', async () => {
    const res = await controller.bootstrapSession({
      publishableKey: 'biz_live_test_key',
      sessionId: 'ses_123',
    });

    expect(res.success).toBe(true);
    expect(res.data.sessionId).toBe('ses_123');
    expect(res.data.businessId).toBe('biz_123456789012345678901234');
    expect(geminiVoiceService.generateVoiceSessionBootstrap).toHaveBeenCalled();
  });

  it('should execute tool successfully', async () => {
    const res = await controller.executeTool({
      businessId: 'biz_123456789012345678901234',
      sessionId: 'ses_123',
      toolName: 'find_products',
      args: { query: 'shoes' },
    });

    expect(res.success).toBe(true);
    expect(res.data.toolName).toBe('find_products');
    expect(aiToolsExecutor.executeTool).toHaveBeenCalledWith(
      'biz_123456789012345678901234',
      'ses_123',
      'find_products',
      { query: 'shoes' },
    );
  });
});
