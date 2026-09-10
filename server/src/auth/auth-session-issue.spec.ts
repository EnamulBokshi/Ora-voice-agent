import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';

/**
 * `issueSessionForUser` is the only public way to mint a session for an
 * identity established outside ORA. Its contract is session *reuse*: the
 * Shopify embedded app re-exchanges its App Bridge token on every page load, so
 * minting a new 7-day Redis session each time would grow Redis without bound.
 */
describe('AuthService.issueSessionForUser', () => {
  let service: AuthService;
  let redis: {
    getUserSessionPointer: jest.Mock;
    setUserSessionPointer: jest.Mock;
    deleteUserSessionPointer: jest.Mock;
    getSession: jest.Mock;
    setSession: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      getUserSessionPointer: jest.fn().mockResolvedValue(null),
      setUserSessionPointer: jest.fn().mockResolvedValue(undefined),
      deleteUserSessionPointer: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue(null),
      setSession: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('jwt') } },
        { provide: RedisService, useValue: redis },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('creates a session when the user has none', async () => {
    const result = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    expect(result.sessionId).toBeTruthy();
    expect(redis.setSession).toHaveBeenCalledTimes(1);
    expect(redis.setUserSessionPointer).toHaveBeenCalledWith(
      'user-1',
      result.sessionId,
    );
  });

  it('reuses the existing session id instead of accumulating sessions', async () => {
    redis.getUserSessionPointer.mockResolvedValue('existing-session');
    redis.getSession.mockResolvedValue({
      adminUserId: 'user-1',
      businessId: 'biz-1',
    });

    const result = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    expect(result.sessionId).toBe('existing-session');
  });

  it('rotates the refresh token on every call', async () => {
    redis.getUserSessionPointer.mockResolvedValue('existing-session');
    redis.getSession.mockResolvedValue({
      adminUserId: 'user-1',
      businessId: 'biz-1',
    });

    const first = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );
    const second = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    // Rotation keeps the theft-detection contract in `refresh` intact.
    expect(first.tokens.refreshToken).not.toBe(second.tokens.refreshToken);
    expect(redis.setSession).toHaveBeenCalledTimes(2);
  });

  it('stores only a hash of the refresh token', async () => {
    const result = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    const stored = redis.setSession.mock.calls[0][1];
    expect(stored.refreshTokenHash).not.toBe(result.tokens.refreshToken);
    expect(stored.refreshTokenHash.startsWith('$2')).toBe(true);
  });

  it('does not hand back a session that belongs to another tenant', async () => {
    // A stale pointer must never leak a session scoped to a different business.
    redis.getUserSessionPointer.mockResolvedValue('other-tenant-session');
    redis.getSession.mockResolvedValue({
      adminUserId: 'user-1',
      businessId: 'biz-other',
    });

    const result = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    expect(result.sessionId).not.toBe('other-tenant-session');
    expect(redis.deleteUserSessionPointer).toHaveBeenCalledWith('user-1');
  });

  it('creates a new session when the pointer outlived its session', async () => {
    redis.getUserSessionPointer.mockResolvedValue('expired-session');
    redis.getSession.mockResolvedValue(null);

    const result = await service.issueSessionForUser(
      'user-1',
      'biz-1',
      'owner@demo.test',
      'owner',
    );

    expect(result.sessionId).not.toBe('expired-session');
    expect(redis.deleteUserSessionPointer).toHaveBeenCalledWith('user-1');
  });
});
