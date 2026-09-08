import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { ApiClientService } from './api-client.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { ApiScope } from './schemas/api-client.schema';

describe('OAuthController', () => {
  let controller: OAuthController;
  let mockOAuthService: any;
  let mockApiClientService: any;

  const mockBusinessId = '671234567890123456789012';

  beforeEach(async () => {
    mockOAuthService = {
      issueClientToken: jest.fn(),
    };

    mockApiClientService = {
      createClient: jest.fn(),
      listClients: jest.fn(),
      revokeClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: ApiClientService, useValue: mockApiClientService },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
  });

  describe('POST /oauth/token', () => {
    it('should extract credentials from request body (client_secret_post)', async () => {
      mockOAuthService.issueClientToken.mockResolvedValue({
        access_token: 'tok_123',
        token_type: 'Bearer',
        expires_in: 900,
        scope: 'inputs:write',
      });

      const dto = {
        grant_type: 'client_credentials',
        client_id: 'ora_client_123',
        client_secret: 'ora_secret_456',
        scope: 'inputs:write',
      };

      const req = {
        headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
      };

      const res = await controller.token(dto, req);

      expect(mockOAuthService.issueClientToken).toHaveBeenCalledWith(
        'ora_client_123',
        'ora_secret_456',
        'inputs:write',
        '203.0.113.195',
      );
      expect(res.access_token).toBe('tok_123');
    });

    it('should extract credentials from HTTP Basic Authorization header (client_secret_basic)', async () => {
      mockOAuthService.issueClientToken.mockResolvedValue({
        access_token: 'tok_basic',
        token_type: 'Bearer',
        expires_in: 900,
        scope: 'inputs:write',
      });

      const credentials = Buffer.from(
        'ora_client_abc:ora_secret_xyz',
      ).toString('base64');

      const dto = {
        grant_type: 'client_credentials',
      };

      const req = {
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.100',
      };

      const res = await controller.token(dto, req);

      expect(mockOAuthService.issueClientToken).toHaveBeenCalledWith(
        'ora_client_abc',
        'ora_secret_xyz',
        undefined,
        '192.168.1.100',
      );
      expect(res.access_token).toBe('tok_basic');
    });

    it('should throw invalid_client (401) when neither body nor header has credentials', async () => {
      const dto = {
        grant_type: 'client_credentials',
      };

      const req = {
        headers: {},
      };

      await expect(controller.token(dto, req)).rejects.toThrow(DomainException);

      try {
        await controller.token(dto, req);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.code).toBe('invalid_client');
      }
    });
  });

  describe('Merchant Client Management', () => {
    const mockUser = {
      sub: 'admin_user_id',
      businessId: mockBusinessId,
      role: 'owner' as any,
    };

    it('createClient should delegate to apiClientService.createClient with user.businessId', async () => {
      mockApiClientService.createClient.mockResolvedValue({
        id: 'client_1',
        client_id: 'ora_client_new',
      });

      const dto = {
        name: 'New Zapier App',
        scopes: [ApiScope.INPUTS_WRITE],
      };

      const result = await controller.createClient(mockUser, dto);

      expect(mockApiClientService.createClient).toHaveBeenCalledWith(
        mockBusinessId,
        dto,
        'admin_user_id',
      );
      expect(result.client_id).toBe('ora_client_new');
    });

    it('listClients should delegate to apiClientService.listClients with user.businessId', async () => {
      mockApiClientService.listClients.mockResolvedValue([
        { id: 'client_1', name: 'App 1' },
      ]);

      const result = await controller.listClients(mockUser);

      expect(mockApiClientService.listClients).toHaveBeenCalledWith(mockBusinessId);
      expect(result).toHaveLength(1);
    });

    it('revokeClient should delegate to apiClientService.revokeClient with user.businessId', async () => {
      mockApiClientService.revokeClient.mockResolvedValue({
        id: 'client_1',
        status: 'revoked',
      });

      const result = await controller.revokeClient(mockUser, 'client_1');

      expect(mockApiClientService.revokeClient).toHaveBeenCalledWith(
        mockBusinessId,
        'client_1',
        'admin_user_id',
      );
      expect(result.status).toBe('revoked');
    });
  });
});
