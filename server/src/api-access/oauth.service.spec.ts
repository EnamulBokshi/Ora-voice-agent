import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthService, MACHINE_TOKEN_AUDIENCE } from './oauth.service';
import { ApiClientService } from './api-client.service';
import { RedisService } from '../common/redis/redis.service';
import { ApiScope } from './schemas/api-client.schema';
import { DomainException } from '../common/exceptions/domain.exception';

describe('OAuthService', () => {
  let service: OAuthService;
  let mockApiClientService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRedisClient: any;
  let mockRedisService: any;

  const mockBusinessId = '671234567890123456789012';
  const mockClientId = 'ora_client_test123';
  const mockClientSecret = 'ora_secret_test456';

  beforeEach(async () => {
    mockApiClientService = {
      verifyCredentials: jest.fn(),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('signed_machine_jwt_token'),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OAUTH_JWT_SECRET') return 'dedicated-oauth-jwt-secret';
        if (key === 'JWT_SECRET') return 'general-jwt-secret';
        return undefined;
      }),
    };

    mockRedisClient = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: ApiClientService, useValue: mockApiClientService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  describe('getSigningSecret', () => {
    it('should prioritize OAUTH_JWT_SECRET over JWT_SECRET', () => {
      expect(service.getSigningSecret()).toBe('dedicated-oauth-jwt-secret');
    });

    it('should fallback to JWT_SECRET if OAUTH_JWT_SECRET is unset', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'fallback-secret';
        return undefined;
      });
      expect(service.getSigningSecret()).toBe('fallback-secret');
    });
  });

  describe('issueClientToken', () => {
    const mockClient = {
      _id: 'obj_1',
      clientId: mockClientId,
      businessId: mockBusinessId,
      scopes: [ApiScope.INPUTS_WRITE, ApiScope.INPUTS_READ],
    };

    it('should issue a Bearer machine token with all client scopes when requestedScope is empty', async () => {
      mockApiClientService.verifyCredentials.mockResolvedValue(mockClient);

      const result = await service.issueClientToken(
        mockClientId,
        mockClientSecret,
        undefined,
        '127.0.0.1',
      );

      expect(mockApiClientService.verifyCredentials).toHaveBeenCalledWith(
        mockClientId,
        mockClientSecret,
        '127.0.0.1',
      );

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockClientId,
          businessId: mockBusinessId,
          scopes: [ApiScope.INPUTS_WRITE, ApiScope.INPUTS_READ],
          token_use: 'client_credentials',
          aud: MACHINE_TOKEN_AUDIENCE,
        },
        {
          secret: 'dedicated-oauth-jwt-secret',
          expiresIn: 900,
        },
      );

      expect(mockApiClientService.touchLastUsed).toHaveBeenCalledWith(mockClientId);

      expect(result).toEqual({
        access_token: 'signed_machine_jwt_token',
        token_type: 'Bearer',
        expires_in: 900,
        scope: 'inputs:write inputs:read',
      });
    });

    it('should allow narrowing scopes if requested subset is valid', async () => {
      mockApiClientService.verifyCredentials.mockResolvedValue(mockClient);

      const result = await service.issueClientToken(
        mockClientId,
        mockClientSecret,
        'inputs:write',
        '127.0.0.1',
      );

      expect(result.scope).toBe('inputs:write');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: [ApiScope.INPUTS_WRITE],
        }),
        expect.any(Object),
      );
    });

    it('should reject with invalid_scope (400) if requested scope is not held by client', async () => {
      const writeOnlyClient = {
        ...mockClient,
        scopes: [ApiScope.INPUTS_WRITE],
      };
      mockApiClientService.verifyCredentials.mockResolvedValue(writeOnlyClient);

      await expect(
        service.issueClientToken(
          mockClientId,
          mockClientSecret,
          'inputs:read',
          '127.0.0.1',
        ),
      ).rejects.toThrow(DomainException);

      try {
        await service.issueClientToken(
          mockClientId,
          mockClientSecret,
          'inputs:read',
          '127.0.0.1',
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(err.code).toBe('invalid_scope');
      }
    });

    it('should throw invalid_client (401) when credentials fail verification', async () => {
      mockApiClientService.verifyCredentials.mockResolvedValue(null);

      await expect(
        service.issueClientToken(
          mockClientId,
          'wrong_secret',
          undefined,
          '127.0.0.1',
        ),
      ).rejects.toThrow(DomainException);

      try {
        await service.issueClientToken(
          mockClientId,
          'wrong_secret',
          undefined,
          '127.0.0.1',
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.code).toBe('invalid_client');
      }
    });

    it('should enforce rate limits on token issuance and throw slow_down (429)', async () => {
      mockRedisClient.incr.mockResolvedValue(31); // Over 30 limit

      await expect(
        service.issueClientToken(
          mockClientId,
          mockClientSecret,
          undefined,
          '127.0.0.1',
        ),
      ).rejects.toThrow(DomainException);

      try {
        await service.issueClientToken(
          mockClientId,
          mockClientSecret,
          undefined,
          '127.0.0.1',
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.code).toBe('slow_down');
      }
    });
  });
});
