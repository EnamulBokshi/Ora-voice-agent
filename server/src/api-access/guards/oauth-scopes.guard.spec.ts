import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { OAuthScopesGuard } from './oauth-scopes.guard';
import { OAuthService, MACHINE_TOKEN_AUDIENCE } from '../oauth.service';
import { ApiClientService } from '../api-client.service';
import { RedisService } from '../../common/redis/redis.service';
import { ApiScope, ApiClientStatus } from '../schemas/api-client.schema';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('OAuthScopesGuard', () => {
  let guard: OAuthScopesGuard;
  let mockReflector: any;
  let mockJwtService: any;
  let mockOAuthService: any;
  let mockApiClientService: any;
  let mockRedisClient: any;
  let mockRedisService: any;

  const mockBusinessId = '671234567890123456789012';
  const mockClientId = 'ora_client_guard_test';

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    mockJwtService = {
      verifyAsync: jest.fn(),
    };

    mockOAuthService = {
      getSigningSecret: jest.fn().mockReturnValue('mock-secret'),
    };

    mockApiClientService = {
      findActiveByClientId: jest.fn(),
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
        OAuthScopesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: ApiClientService, useValue: mockApiClientService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<OAuthScopesGuard>(OAuthScopesGuard);
  });

  const createMockContext = (headers: Record<string, string> = {}) => {
    const req: any = {
      headers,
    };
    return {
      context: {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext,
      req,
    };
  };

  it('should throw invalid_request (401) when Authorization header is missing or not Bearer', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('invalid_request');
    }
  });

  it('should throw invalid_token (401) when token fails verification', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer bad_or_expired_jwt',
    });

    mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('invalid_token');
    }
  });

  it('should throw invalid_token (401) when token is not a machine token (token_use !== client_credentials)', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer user_dashboard_jwt',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 'user_id_123',
      businessId: mockBusinessId,
      token_use: 'user_session', // Not client_credentials!
    });

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('invalid_token');
      expect(err.message).toContain('not valid for the machine API');
    }
  });

  it('should throw invalid_token (401) when client is revoked in DB', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer valid_jwt_for_revoked_client',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: mockClientId,
      businessId: mockBusinessId,
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
      scopes: [ApiScope.INPUTS_WRITE],
    });

    mockApiClientService.findActiveByClientId.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('invalid_token');
      expect(err.message).toContain('suspended or revoked');
    }
  });

  it('should throw invalid_token (401) on tenant mismatch between token and client record', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer valid_jwt',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: mockClientId,
      businessId: 'wrong_business_id',
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
      scopes: [ApiScope.INPUTS_WRITE],
    });

    mockApiClientService.findActiveByClientId.mockResolvedValue({
      clientId: mockClientId,
      businessId: mockBusinessId,
      status: ApiClientStatus.ACTIVE,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.code).toBe('invalid_token');
      expect(err.message).toContain('matches its client record');
    }
  });

  it('should throw insufficient_scope (403) when token lacks required scope', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer valid_jwt',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: mockClientId,
      businessId: mockBusinessId,
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
      scopes: [ApiScope.INPUTS_WRITE], // Only write!
    });

    mockApiClientService.findActiveByClientId.mockResolvedValue({
      clientId: mockClientId,
      businessId: mockBusinessId,
      status: ApiClientStatus.ACTIVE,
    });

    // Endpoint requires INPUTS_READ
    mockReflector.getAllAndOverride.mockReturnValue([ApiScope.INPUTS_READ]);

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(err.code).toBe('insufficient_scope');
    }
  });

  it('should throw rate_limit_exceeded (429) when client exceeds 300 req/min', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer valid_jwt',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: mockClientId,
      businessId: mockBusinessId,
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
      scopes: [ApiScope.INPUTS_WRITE],
    });

    mockApiClientService.findActiveByClientId.mockResolvedValue({
      clientId: mockClientId,
      businessId: mockBusinessId,
      status: ApiClientStatus.ACTIVE,
    });

    mockReflector.getAllAndOverride.mockReturnValue([ApiScope.INPUTS_WRITE]);
    mockRedisClient.incr.mockResolvedValue(301); // Exceeds 300

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);

    try {
      await guard.canActivate(context);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.code).toBe('rate_limit_exceeded');
    }
  });

  it('should pass and attach trusted tenant and client to request', async () => {
    const { context, req } = createMockContext({
      authorization: 'Bearer valid_jwt',
    });

    const activeClient = {
      clientId: mockClientId,
      businessId: mockBusinessId,
      status: ApiClientStatus.ACTIVE,
    };

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: mockClientId,
      businessId: mockBusinessId,
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
      scopes: [ApiScope.INPUTS_WRITE],
    });

    mockApiClientService.findActiveByClientId.mockResolvedValue(activeClient);
    mockReflector.getAllAndOverride.mockReturnValue([ApiScope.INPUTS_WRITE]);
    mockRedisClient.incr.mockResolvedValue(5);

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(req.businessId).toBe(mockBusinessId);
    expect(req.apiClientId).toBe(mockClientId);
    expect(req.apiScopes).toEqual([ApiScope.INPUTS_WRITE]);
    expect(req.apiClient).toBe(activeClient);
  });
});
