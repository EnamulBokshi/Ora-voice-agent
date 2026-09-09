import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { DualAuthGuard } from './dual-auth.guard';
import { OAuthScopesGuard } from '../../api-access/guards/oauth-scopes.guard';
import { MACHINE_TOKEN_AUDIENCE } from '../../api-access/oauth.service';
import { ApiScope } from '../../api-access/schemas/api-client.schema';
import { Business } from '../../users/schemas/business.schema';
import { DomainException } from '../exceptions/domain.exception';

describe('DualAuthGuard', () => {
  let guard: DualAuthGuard;
  let mockReflector: any;
  let mockJwtService: any;
  let mockOAuthScopesGuard: any;
  let mockBusinessModel: any;

  const mockBusinessId = '671234567890123456789012';
  const mockClientId = 'ora_client_dual_test';
  const mockBusinessDoc = {
    _id: { toString: () => mockBusinessId },
    name: 'Test Store',
    secretApiKey: 'ora_sk_live_test123',
    publishableKey: 'biz_live_test123',
    status: 'active',
  };

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    mockJwtService = {
      decode: jest.fn(),
    };

    mockOAuthScopesGuard = {
      canActivate: jest.fn(),
    };

    mockBusinessModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DualAuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OAuthScopesGuard, useValue: mockOAuthScopesGuard },
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
      ],
    }).compile();

    guard = module.get<DualAuthGuard>(DualAuthGuard);
  });

  const createMockContext = (headers: Record<string, string> = {}, user?: any) => {
    const req: any = {
      headers,
      user,
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

  describe('Zero-Login Secret API Key Authentication Path', () => {
    it('should authenticate via X-API-Key header without any login process', async () => {
      const { context, req } = createMockContext({
        'x-api-key': 'ora_sk_live_test123',
      });

      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusinessDoc),
      });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(req.businessId).toBe(mockBusinessId);
      expect(req.user).toEqual({
        sub: mockBusinessId,
        businessId: mockBusinessId,
        role: 'admin',
        isApiKey: true,
      });
      expect(mockJwtService.decode).not.toHaveBeenCalled();
      expect(mockBusinessModel.findOne).toHaveBeenCalledWith({
        secretApiKey: 'ora_sk_live_test123',
        status: 'active',
      });
    });

    it('should authenticate via Authorization: Bearer ora_sk_... without login', async () => {
      const { context, req } = createMockContext({
        authorization: 'Bearer ora_sk_live_test123',
      });

      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusinessDoc),
      });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(req.businessId).toBe(mockBusinessId);
    });

    it('should authenticate dev key ora_dev_key in non-production mode', async () => {
      const { context, req } = createMockContext({
        'x-api-key': 'ora_dev_key',
      });

      mockBusinessModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockBusinessDoc) });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(req.businessId).toBe(mockBusinessId);
    });

    it('should throw DomainException for invalid API key', async () => {
      const { context } = createMockContext({
        'x-api-key': 'invalid_unknown_key',
      });

      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
    });

    it('should reject a public publishable key presented as X-API-Key', async () => {
      const { context } = createMockContext({
        'x-api-key': 'biz_live_test123',
      });

      // The guard queries secretApiKey only, so the publishable key matches nothing.
      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
      expect(mockBusinessModel.findOne).toHaveBeenCalledWith({
        secretApiKey: 'biz_live_test123',
        status: 'active',
      });
    });

    it('should ignore the X-Publishable-Key header entirely', async () => {
      const { context } = createMockContext({
        'x-publishable-key': 'biz_live_test123',
      });

      jest.spyOn((guard as any).jwtAuthGuard, 'canActivate').mockRejectedValue(
        new Error('no session'),
      );

      // Falls through to the dashboard session path instead of authenticating.
      await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
      expect(mockBusinessModel.findOne).not.toHaveBeenCalled();
    });

    it('should not accept a publishable key via Authorization: Bearer', async () => {
      const { context } = createMockContext({
        authorization: 'Bearer biz_live_test123',
      });

      mockJwtService.decode.mockReturnValue(null);
      jest.spyOn((guard as any).jwtAuthGuard, 'canActivate').mockRejectedValue(
        new Error('no session'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
      expect(mockBusinessModel.findOne).not.toHaveBeenCalled();
    });

    it('should not authenticate a suspended business', async () => {
      const { context } = createMockContext({
        'x-api-key': 'ora_sk_live_test123',
      });

      // status: 'active' is part of the query, so a suspended tenant returns null.
      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
    });

    it('should enforce @Roles on the API key path', async () => {
      const { context } = createMockContext({
        'x-api-key': 'ora_sk_live_test123',
      });

      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusinessDoc),
      });
      // Route requires super_admin, which an API key never holds.
      mockReflector.getAllAndOverride.mockImplementation((key: string) =>
        key === 'roles' ? ['super_admin'] : undefined,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow an API key on a route requiring owner or admin', async () => {
      const { context } = createMockContext({
        'x-api-key': 'ora_sk_live_test123',
      });

      mockBusinessModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusinessDoc),
      });
      mockReflector.getAllAndOverride.mockImplementation((key: string) =>
        key === 'roles'
          ? ['owner', 'admin']
          : [ApiScope.PRODUCTS_WRITE, ApiScope.PRODUCTS_READ],
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('Machine Token Authentication Path', () => {
    it('should authenticate machine token and set synthetic user context on req', async () => {
      const { context, req } = createMockContext({
        authorization: 'Bearer valid_machine_token',
      });

      mockJwtService.decode.mockReturnValue({
        sub: mockClientId,
        businessId: mockBusinessId,
        token_use: 'client_credentials',
        aud: MACHINE_TOKEN_AUDIENCE,
        scopes: [ApiScope.PRODUCTS_WRITE, ApiScope.PRODUCTS_READ],
      });

      mockOAuthScopesGuard.canActivate.mockImplementation((ctx: ExecutionContext) => {
        const r = ctx.switchToHttp().getRequest();
        r.businessId = mockBusinessId;
        r.apiClientId = mockClientId;
        r.apiScopes = [ApiScope.PRODUCTS_WRITE, ApiScope.PRODUCTS_READ];
        return true;
      });

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(mockOAuthScopesGuard.canActivate).toHaveBeenCalledWith(context);
      expect(req.user).toEqual({
        sub: mockClientId,
        businessId: mockBusinessId,
        role: 'admin',
        isMachineClient: true,
      });
    });

    it('should return false if OAuthScopesGuard returns false', async () => {
      const { context } = createMockContext({
        authorization: 'Bearer valid_machine_token',
      });

      mockJwtService.decode.mockReturnValue({
        sub: mockClientId,
        businessId: mockBusinessId,
        token_use: 'client_credentials',
        aud: MACHINE_TOKEN_AUDIENCE,
      });

      mockOAuthScopesGuard.canActivate.mockResolvedValue(false);

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(false);
    });
  });

  describe('Human Dashboard Session Authentication Path', () => {
    it('should authenticate user session when JwtAuthGuard and TenantScopeGuard pass', async () => {
      const { context, req } = createMockContext(
        { authorization: 'Bearer user_session_jwt' },
        { sub: 'user_123', businessId: mockBusinessId, role: 'admin' },
      );

      mockJwtService.decode.mockReturnValue({
        sub: 'user_123',
        sessionId: 'sess_abc',
      });

      // Mock internal jwtAuthGuard
      jest.spyOn((guard as any).jwtAuthGuard, 'canActivate').mockResolvedValue(true);
      jest.spyOn((guard as any).tenantScopeGuard, 'canActivate').mockReturnValue(true);
      mockReflector.getAllAndOverride.mockReturnValue(undefined); // No specific roles required

      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      expect(mockOAuthScopesGuard.canActivate).not.toHaveBeenCalled();
    });

    it('should enforce RolesGuard for human user when roles are specified', async () => {
      const { context } = createMockContext(
        { authorization: 'Bearer user_session_jwt' },
        { sub: 'user_123', businessId: mockBusinessId, role: 'staff' }, // only staff
      );

      mockJwtService.decode.mockReturnValue({
        sub: 'user_123',
        sessionId: 'sess_abc',
      });

      jest.spyOn((guard as any).jwtAuthGuard, 'canActivate').mockResolvedValue(true);
      jest.spyOn((guard as any).tenantScopeGuard, 'canActivate').mockReturnValue(true);
      // Route requires owner or admin
      mockReflector.getAllAndOverride.mockReturnValue(['owner', 'admin']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
