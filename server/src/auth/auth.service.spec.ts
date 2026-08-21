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
    publishableKey: undefined,
    status: 'pending',
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
      findByResetTokenHash: jest.fn(),
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
      revokeUserSessions: jest.fn().mockResolvedValue(1),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
      sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
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

  describe('forgotPassword', () => {
    it('should return anti-enumeration generic message even if email is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });
      expect(result.message).toContain('If an account with that email exists');
      expect(mailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });

    it('should generate token, update user, and send reset email when user exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.updateAdminUser.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({ email: 'merchant@acme.com' });
      expect(result.message).toContain('If an account with that email exists');
      expect(usersService.updateAdminUser).toHaveBeenCalledWith(
        mockUser._id,
        expect.objectContaining({
          resetPasswordTokenHash: expect.any(String),
          resetPasswordExpiresAt: expect.any(Date),
        }),
      );
      expect(mailService.sendForgotPasswordEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.objectContaining({
          recipientName: mockUser.name,
          resetUrl: expect.stringContaining('/auth?mode=reset-password&token='),
        }),
      );
    });
  });

  describe('verifyResetToken', () => {
    it('should throw if token is expired or invalid', async () => {
      usersService.findByResetTokenHash.mockResolvedValue(null);

      await expect(service.verifyResetToken('invalid-token')).rejects.toThrow(DomainException);
    });

    it('should return valid true if token is valid and unexpired', async () => {
      usersService.findByResetTokenHash.mockResolvedValue({
        ...mockUser,
        resetPasswordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const result = await service.verifyResetToken('valid-token');
      expect(result.valid).toBe(true);
      expect(result.email).toBe(mockUser.email);
    });
  });

  describe('resetPassword', () => {
    it('should reset password and revoke all active sessions', async () => {
      usersService.findByResetTokenHash.mockResolvedValue({
        ...mockUser,
        resetPasswordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      usersService.updateAdminUser.mockResolvedValue(mockUser);

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'NewSecurePassword123!',
      });

      expect(result.message).toContain('successfully reset');
      expect(usersService.updateAdminUser).toHaveBeenCalledWith(
        mockUser._id,
        expect.objectContaining({
          passwordHash: expect.any(String),
          resetPasswordTokenHash: undefined,
          resetPasswordExpiresAt: undefined,
        }),
      );
      expect(redisService.revokeUserSessions).toHaveBeenCalledWith(mockUser._id);
    });
  });

  describe('logout', () => {
    it('should revoke session in Redis', async () => {
      await service.logout('session-id-123');
      expect(redisService.revokeSession).toHaveBeenCalledWith('session-id-123');
    });
  });
});
