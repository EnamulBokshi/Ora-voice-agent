import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RedisService } from '../common/redis/redis.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/exceptions/domain.exception';

describe('Security & Interaction E2E Integration Suite', () => {
  let authService: AuthService;
  let redisService: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisService = {
      getSession: jest.fn().mockResolvedValue({
        sessionId: 'sess_123',
        businessId: 'biz_123',
        userId: 'user_123',
        refreshTokenHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      }),
      setSession: jest.fn().mockResolvedValue(undefined),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createTenantAndOwner: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt_token_mock'),
            verify: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => defaultVal || '15m'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('RefreshToken Theft Detection', () => {
    it('should revoke session family when refresh token hash mismatch is detected', async () => {
      await expect(
        authService.refresh('stolen_refresh_token_789', 'sess_123', {}),
      ).rejects.toThrow(DomainException);

      expect(redisService.revokeSession).toHaveBeenCalledWith('sess_123');
    });
  });
});
