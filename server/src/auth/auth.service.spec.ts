import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { AdminRole } from '../users/enums/admin-role.enum';
import { DomainException } from '../common/exceptions/domain.exception';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let redisService: Record<string, jest.Mock>;
  let mailService: Record<string, jest.Mock>;

  const mockBusiness = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Acme Store',
    domain: 'acme.com',
    publishableKey: 'biz_live_1234567890abcdef',
    status: 'active',
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439022',
    businessId: mockBusiness._id,
    email: 'merchant@acme.com',
    passwordHash: '$2a$10$e8W/X2...mockhash',
    name: 'Jane Doe',
    role: AdminRole.USER,
    emailVerified: false,
    pendingOtpHash: '$2a$10$mockotphash',
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpAttemptCount: 0,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findBusinessById: jest.fn(),
      createBusiness: jest.fn(),
      createAdminUser: jest.fn(),
      updateAdminUser: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };

    redisService = {
      setSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn(),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw Conflict if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register(
          {
            businessName: 'Acme Store',
            name: 'Jane Doe',
            email: 'merchant@acme.com',
            password: 'Password123!',
          },
          {},
        ),
      ).rejects.toThrow(DomainException);
    });

    it('should register merchant and return tokens + profile', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createBusiness.mockResolvedValue(mockBusiness);
      usersService.createAdminUser.mockResolvedValue(mockUser);
      usersService.updateAdminUser.mockResolvedValue(mockUser);

      const result = await service.register(
        {
          businessName: 'Acme Store',
          name: 'Jane Doe',
          email: 'merchant@acme.com',
          password: 'Password123!',
        },
        { userAgent: 'Jest', ip: '127.0.0.1' },
      );

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('merchant@acme.com');
      expect(result.business.name).toBe('Acme Store');
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(redisService.setSession).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke session in Redis', async () => {
      await service.logout('session-id-123');
      expect(redisService.revokeSession).toHaveBeenCalledWith('session-id-123');
    });
  });
});
