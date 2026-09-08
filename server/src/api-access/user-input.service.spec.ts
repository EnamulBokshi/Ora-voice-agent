import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserInputService } from './user-input.service';
import { Conversation, ConversationChannel } from '../conversations/schemas/conversation.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { RedisService } from '../common/redis/redis.service';
import { MessageRole } from '../conversations/schemas/message.schema';
import { DomainException } from '../common/exceptions/domain.exception';
import { DocType } from '../knowledge/schemas/knowledge-base.schema';

describe('UserInputService', () => {
  let service: UserInputService;
  let mockConversationModel: any;
  let mockConversationsService: any;
  let mockKnowledgeService: any;
  let mockRedisClient: any;
  let mockRedisService: any;

  const mockBusinessId = '671234567890123456789012';
  const mockClientId = 'ora_client_input_test';

  beforeEach(async () => {
    mockConversationModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockConversationsService = {
      findOrCreateSession: jest.fn(),
      appendMessage: jest.fn(),
    };

    mockKnowledgeService = {
      create: jest.fn(),
      uploadDocument: jest.fn(),
    };

    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInputService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
        {
          provide: KnowledgeService,
          useValue: mockKnowledgeService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<UserInputService>(UserInputService);
  });

  describe('submitPrompt', () => {
    it('should submit a prompt, redact PII, scope session, and cache for idempotency', async () => {
      const mockConversation = {
        _id: 'conv_123',
        businessId: mockBusinessId,
        channel: ConversationChannel.API,
      };

      const mockMessage = {
        _id: 'msg_999',
        timestamp: new Date('2026-09-08T10:00:00.000Z'),
      };

      mockConversationsService.findOrCreateSession.mockResolvedValue(mockConversation);
      mockConversationsService.appendMessage.mockResolvedValue(mockMessage);

      const dto = {
        prompt: 'Hi, please contact me at shopper@example.com or +1 555-123-4567 regarding shipping.',
        sessionId: 'ext-session-42',
        externalUserId: 'user-77',
        idempotencyKey: 'msg-idem-1',
      };

      const result = await service.submitPrompt(mockBusinessId, mockClientId, dto);

      // Verify session scoping
      expect(mockConversationsService.findOrCreateSession).toHaveBeenCalledWith(
        mockBusinessId,
        `api:${mockBusinessId}:ext-session-42`,
        ConversationChannel.API,
        expect.objectContaining({
          source: 'machine_api',
          apiClientId: mockClientId,
          externalUserId: 'user-77',
        }),
      );

      // Verify PII redaction
      expect(mockConversationsService.appendMessage).toHaveBeenCalledWith(
        'conv_123',
        MessageRole.USER,
        expect.not.stringContaining('shopper@example.com'),
      );
      const appendedText = mockConversationsService.appendMessage.mock.calls[0][2];
      expect(appendedText).toContain('[REDACTED_EMAIL]');
      expect(appendedText).toContain('[REDACTED_PHONE]');

      // Verify idempotency cache write
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
      const redisKey = mockRedisClient.set.mock.calls[0][0];
      expect(redisKey).toContain(`idem:machineapi:${mockBusinessId}:`);

      // Verify response payload
      expect(result).toEqual({
        id: 'msg_999',
        conversationId: 'conv_123',
        sessionId: 'ext-session-42',
        channel: ConversationChannel.API,
        receivedAt: mockMessage.timestamp,
        redacted: true,
      });
    });

    it('should return cached result with idempotentReplay: true on replay', async () => {
      const cached = {
        id: 'msg_cached_1',
        conversationId: 'conv_cached_1',
        sessionId: 'session_cached_1',
        channel: 'api',
        receivedAt: '2026-09-08T10:00:00.000Z',
        redacted: false,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cached));

      const dto = {
        prompt: 'Hello again',
        idempotencyKey: 'idem-replay-key',
      };

      const result = await service.submitPrompt(mockBusinessId, mockClientId, dto);

      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockConversationsService.findOrCreateSession).not.toHaveBeenCalled();
      expect(mockConversationsService.appendMessage).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...cached,
        idempotentReplay: true,
      });
    });

    it('should throw 403 SESSION_TENANT_MISMATCH if session belongs to another tenant', async () => {
      const otherTenantConversation = {
        _id: 'conv_other',
        businessId: 'other_business_id_999',
        channel: ConversationChannel.API,
      };

      mockConversationsService.findOrCreateSession.mockResolvedValue(otherTenantConversation);

      const dto = {
        prompt: 'Sneaky cross-tenant attempt',
        sessionId: 'colliding-session',
      };

      await expect(
        service.submitPrompt(mockBusinessId, mockClientId, dto),
      ).rejects.toThrow(DomainException);

      try {
        await service.submitPrompt(mockBusinessId, mockClientId, dto);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.code).toBe('SESSION_TENANT_MISMATCH');
      }
    });
  });

  describe('submitDocument', () => {
    it('should delegate document creation to KnowledgeService', async () => {
      const mockDocResult = {
        document: { _id: 'doc_1', title: 'FAQ' },
        chunksCount: 3,
      };
      mockKnowledgeService.create.mockResolvedValue(mockDocResult);

      const dto = {
        docType: DocType.FAQ,
        title: 'FAQ',
        content: 'FAQ text content...',
      };

      const result = await service.submitDocument(mockBusinessId, dto);

      expect(mockKnowledgeService.create).toHaveBeenCalledWith(mockBusinessId, dto);
      expect(result).toBe(mockDocResult);
    });
  });

  describe('submitUpload', () => {
    it('should reject when file is missing or has no buffer', async () => {
      await expect(
        service.submitUpload(mockBusinessId, null as any),
      ).rejects.toThrow(DomainException);

      try {
        await service.submitUpload(mockBusinessId, { buffer: null } as any);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(err.code).toBe('INVALID_FILE');
      }
    });

    it('should reject files exceeding 10MB', async () => {
      const oversizedFile: any = {
        buffer: Buffer.from('data'),
        size: 11 * 1024 * 1024,
        originalname: 'large.pdf',
      };

      await expect(
        service.submitUpload(mockBusinessId, oversizedFile),
      ).rejects.toThrow(DomainException);

      try {
        await service.submitUpload(mockBusinessId, oversizedFile);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(err.code).toBe('FILE_TOO_LARGE');
      }
    });

    it('should reject unsupported file extensions', async () => {
      const badFile: any = {
        buffer: Buffer.from('python code'),
        size: 100,
        originalname: 'script.py',
      };

      await expect(
        service.submitUpload(mockBusinessId, badFile),
      ).rejects.toThrow(DomainException);

      try {
        await service.submitUpload(mockBusinessId, badFile);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(err.code).toBe('UNSUPPORTED_FILE_TYPE');
      }
    });

    it('should accept valid file and delegate to KnowledgeService', async () => {
      const validFile: any = {
        buffer: Buffer.from('Policy contents...'),
        size: 1024,
        originalname: 'shipping-policy.pdf',
      };

      mockKnowledgeService.uploadDocument.mockResolvedValue({
        document: { _id: 'doc_pdf' },
        chunksCount: 2,
        extractedLength: 100,
      });

      const result = await service.submitUpload(
        mockBusinessId,
        validFile,
        'policy',
        'Shipping Policy',
      );

      expect(mockKnowledgeService.uploadDocument).toHaveBeenCalledWith(
        mockBusinessId,
        validFile,
        'policy',
        'Shipping Policy',
      );
      expect(result.chunksCount).toBe(2);
    });
  });

  describe('listPromptSessions', () => {
    it('should query tenant API conversations and strip internal session prefix', async () => {
      const mockItems = [
        {
          _id: 'conv_1',
          sessionId: `api:${mockBusinessId}:custom-session-1`,
          lastActivityAt: new Date('2026-09-08T12:00:00.000Z'),
          metadata: { externalUserId: 'telegram-user-42' },
        },
      ];

      const sortMock = jest.fn().mockReturnThis();
      const skipMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockItems),
      });

      mockConversationModel.find.mockReturnValue({
        sort: sortMock,
        skip: skipMock,
        limit: limitMock,
      });

      mockConversationModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.listPromptSessions(mockBusinessId, 1, 20);

      expect(mockConversationModel.find).toHaveBeenCalledWith({
        businessId: mockBusinessId,
        channel: ConversationChannel.API,
        status: { $ne: 'closed' },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sessionId).toBe('custom-session-1');
      expect(result.items[0].externalUserId).toBe('telegram-user-42');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
