import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation, ConversationChannel, ConversationStatus } from './schemas/conversation.schema';
import { Message, MessageRole } from './schemas/message.schema';
import { RedisService } from '../common/redis/redis.service';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockConversationDoc: any = {
    _id: '507f1f77bcf86cd799439011',
    businessId: 'biz_123',
    sessionId: 'sess_test_123',
    channel: ConversationChannel.WIDGET_VOICE,
    status: ConversationStatus.ACTIVE,
    metadata: { customerName: 'Alice' },
    save: jest.fn().mockResolvedValue(this),
  };

  const mockConversationModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: '507f1f77bcf86cd799439011',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: '507f1f77bcf86cd799439011',
    }),
  }));

  mockConversationModel.findOne = jest.fn();
  mockConversationModel.findByIdAndUpdate = jest.fn();
  mockConversationModel.findOneAndUpdate = jest.fn();
  mockConversationModel.find = jest.fn();
  mockConversationModel.countDocuments = jest.fn();

  const mockMessageModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: 'msg_123',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: 'msg_123',
    }),
  }));
  mockMessageModel.find = jest.fn();

  const redisStore: Record<string, string> = {};
  const mockRedisClient = {
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(redisStore[key] || null)),
    set: jest.fn().mockImplementation((key: string, val: string) => {
      redisStore[key] = val;
      return Promise.resolve('OK');
    }),
  };

  const mockRedisService = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateSession', () => {
    it('should create a new voice conversation session when not found', async () => {
      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOrCreateSession(
        'biz_123',
        'sess_voice_123',
        ConversationChannel.WIDGET_VOICE,
        { customerName: 'Alice' },
        'cust_123',
      );

      expect(result).toBeDefined();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should update existing session if already found', async () => {
      const existingDoc = {
        ...mockConversationDoc,
        save: jest.fn().mockResolvedValue(mockConversationDoc),
      };

      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDoc),
      });

      const result = await service.findOrCreateSession(
        'biz_123',
        'sess_test_123',
        ConversationChannel.WIDGET_VOICE,
        { customerName: 'Alice Updated' },
      );

      expect(result).toBeDefined();
      expect(existingDoc.save).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('appendMessage', () => {
    it('should create message and update conversation lastActivityAt and lastMessage metadata', async () => {
      mockConversationModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversationDoc),
      });

      const message = await service.appendMessage(
        '507f1f77bcf86cd799439011',
        MessageRole.ASSISTANT,
        'Hello from ORA voice!',
      );

      expect(message).toBeDefined();
      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          $set: expect.objectContaining({
            'metadata.lastMessage': 'Hello from ORA voice!',
          }),
        }),
      );
    });
  });

  describe('getTranscript', () => {
    it('should return conversation and messages', async () => {
      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversationDoc),
      });

      mockMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' },
          ]),
        }),
      });

      const transcript = await service.getTranscript(
        'biz_123',
        '507f1f77bcf86cd799439011',
      );

      expect(transcript.conversation).toEqual(mockConversationDoc);
      expect(transcript.messages).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated conversations', async () => {
      mockConversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockConversationDoc]),
            }),
          }),
        }),
      });

      mockConversationModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll('biz_123', 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
