import { Test, TestingModule } from '@nestjs/testing';
import { UserInputController } from './user-input.controller';
import { UserInputService } from './user-input.service';
import { OAuthScopesGuard } from './guards/oauth-scopes.guard';
import { DocType } from '../knowledge/schemas/knowledge-base.schema';

describe('UserInputController', () => {
  let controller: UserInputController;
  let mockUserInputService: any;

  const mockBusinessId = '671234567890123456789012';
  const mockClientId = 'ora_client_controller_test';

  beforeEach(async () => {
    mockUserInputService = {
      submitPrompt: jest.fn(),
      submitDocument: jest.fn(),
      submitUpload: jest.fn(),
      listPromptSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserInputController],
      providers: [
        { provide: UserInputService, useValue: mockUserInputService },
      ],
    })
      .overrideGuard(OAuthScopesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserInputController>(UserInputController);
  });

  it('should delegate submitPrompt with req.businessId and req.apiClientId', async () => {
    mockUserInputService.submitPrompt.mockResolvedValue({
      id: 'msg_1',
      conversationId: 'conv_1',
    });

    const req = {
      businessId: mockBusinessId,
      apiClientId: mockClientId,
    };

    const dto = {
      prompt: 'Hello world',
      sessionId: 'session_1',
    };

    const result = await controller.submitPrompt(req, dto);

    expect(mockUserInputService.submitPrompt).toHaveBeenCalledWith(
      mockBusinessId,
      mockClientId,
      dto,
    );
    expect(result.id).toBe('msg_1');
  });

  it('should delegate submitDocument with req.businessId', async () => {
    mockUserInputService.submitDocument.mockResolvedValue({
      document: { _id: 'doc_1' },
      chunksCount: 2,
    });

    const req = {
      businessId: mockBusinessId,
    };

    const dto = {
      docType: DocType.FAQ,
      title: 'Returns FAQ',
      content: 'Return policy content...',
    };

    const result = await controller.submitDocument(req, dto);

    expect(mockUserInputService.submitDocument).toHaveBeenCalledWith(
      mockBusinessId,
      dto,
    );
    expect(result.chunksCount).toBe(2);
  });

  it('should delegate submitUpload with req.businessId and file', async () => {
    mockUserInputService.submitUpload.mockResolvedValue({
      document: { _id: 'doc_1' },
      chunksCount: 5,
    });

    const req = {
      businessId: mockBusinessId,
    };

    const file: any = {
      buffer: Buffer.from('data'),
      originalname: 'guide.pdf',
    };

    const result = await controller.submitUpload(
      req,
      file,
      'policy',
      'Refund Policy',
    );

    expect(mockUserInputService.submitUpload).toHaveBeenCalledWith(
      mockBusinessId,
      file,
      'policy',
      'Refund Policy',
    );
    expect(result.chunksCount).toBe(5);
  });

  it('should delegate listPromptSessions with parsed page and limit', async () => {
    mockUserInputService.listPromptSessions.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    const req = {
      businessId: mockBusinessId,
    };

    const result = await controller.listPromptSessions(req, '2', '10');

    expect(mockUserInputService.listPromptSessions).toHaveBeenCalledWith(
      mockBusinessId,
      2,
      10,
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});
