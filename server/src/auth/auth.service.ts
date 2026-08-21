import {
  Injectable,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { OnboardingEmailService } from './services/onboarding-email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DomainException } from '../common/exceptions/domain.exception';
import { AdminRole } from '../users/enums/admin-role.enum';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly onboardingEmailService?: OnboardingEmailService,
  ) {}

  async register(
    dto: RegisterDto,
    reqInfo: { userAgent?: string; ip?: string },
  ) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new DomainException(
        'EMAIL_ALREADY_EXISTS',
        'Email address is already registered.',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const business = await this.usersService.createBusiness(
      dto.businessName,
      dto.domain,
    );

    const user = await this.usersService.createAdminUser({
      businessId: business._id.toString(),
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: AdminRole.USER,
    });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingOtpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.usersService.updateAdminUser(user._id.toString(), {
      pendingOtpHash,
      otpExpiresAt,
      otpAttemptCount: 0,
    });

    // Send verification email
    try {
      await this.mailService.sendVerificationEmail(user.email, {
        recipientName: user.name,
        verifyUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-otp`,
        code: otpCode,
        expireMinutes: 10,
      });
    } catch (mailErr: any) {
      this.logger.error(`[AuthService] Verification email delivery warning: ${mailErr.message}`);
    }

    // Generate tokens & session
    const sessionId = crypto.randomUUID();
    const tokens = await this.generateTokens(
      user._id.toString(),
      business._id.toString(),
      user.email,
      user.role,
      sessionId,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.redisService.setSession(sessionId, {
      adminUserId: user._id.toString(),
      businessId: business._id.toString(),
      email: user.email,
      role: user.role,
      refreshTokenHash,
      userAgent: reqInfo.userAgent,
      ip: reqInfo.ip,
      createdAt: new Date().toISOString(),
    });

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    return {
      tokens,
      sessionId,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: false,
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        domain: business.domain,
        publishableKey: business.publishableKey,
      },
      devOtpCode: isDev ? otpCode : undefined,
    };
  }

  async resendOnboardingEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'Merchant user not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.usersService.findBusinessById(
      user.businessId.toString(),
    );
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Store business not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!business.publishableKey) {
      throw new DomainException(
        'SUBSCRIPTION_REQUIRED',
        'An active subscription is required before widget credentials can be generated and sent.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.onboardingEmailService) {
      await this.onboardingEmailService.sendOnboardingEmail({
        toEmail: user.email,
        merchantName: user.name,
        storeName: business.name,
        publishableKey: business.publishableKey,
      });
    }

    return {
      success: true,
      message: `Onboarding credentials and user manual have been sent to ${user.email}`,
      data: {
        storeName: business.name,
        publishableKey: business.publishableKey,
      },
    };
  }

  async login(dto: LoginDto, reqInfo: { userAgent?: string; ip?: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new DomainException(
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new DomainException(
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const business = await this.usersService.findBusinessById(
      user.businessId.toString(),
    );
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Associated business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const sessionId = crypto.randomUUID();
    const tokens = await this.generateTokens(
      user._id.toString(),
      business._id.toString(),
      user.email,
      user.role,
      sessionId,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.redisService.setSession(sessionId, {
      adminUserId: user._id.toString(),
      businessId: business._id.toString(),
      email: user.email,
      role: user.role,
      refreshTokenHash,
      userAgent: reqInfo.userAgent,
      ip: reqInfo.ip,
      createdAt: new Date().toISOString(),
    });

    return {
      tokens,
      sessionId,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        domain: business.domain,
        publishableKey: business.publishableKey,
      },
    };
  }

  async refresh(
    refreshToken: string,
    sessionId: string,
    reqInfo: { userAgent?: string; ip?: string },
  ) {
    if (!refreshToken || !sessionId) {
      throw new DomainException(
        'INVALID_SESSION',
        'Session ID and refresh token are required.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = await this.redisService.getSession(sessionId);
    if (!session) {
      throw new DomainException(
        'SESSION_EXPIRED',
        'Session has expired or was revoked. Please log in again.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isMatch = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isMatch) {
      // Token Theft / Reuse Detected! Immediately revoke session.
      this.logger.error(
        `[Token Theft Detected] Mismatch on sessionId ${sessionId} for user ${session.adminUserId}. Revoking session.`,
      );
      await this.redisService.revokeSession(sessionId);
      throw new DomainException(
        'TOKEN_THEFT_DETECTED',
        'Security alert: Invalid refresh token presented. Session revoked.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.usersService.findById(session.adminUserId);
    const activeRole = user?.role || session.role;

    // Generate new rotated refresh token & new access token
    const newTokens = await this.generateTokens(
      session.adminUserId,
      session.businessId,
      session.email,
      activeRole,
      sessionId,
    );

    const newRefreshTokenHash = await bcrypt.hash(newTokens.refreshToken, 10);

    // Update session in Redis with rotated refresh token hash and active role
    await this.redisService.setSession(sessionId, {
      ...session,
      role: activeRole,
      refreshTokenHash: newRefreshTokenHash,
      userAgent: reqInfo.userAgent || session.userAgent,
      ip: reqInfo.ip || session.ip,
    });

    return {
      ...newTokens,
      role: activeRole,
    };
  }

  async logout(sessionId: string) {
    if (sessionId) {
      await this.redisService.revokeSession(sessionId);
    }
    return { message: 'Successfully logged out.' };
  }

  async verifyOtp(adminUserId: string, code: string) {
    const user = await this.usersService.findById(adminUserId);
    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'Admin user profile not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.emailVerified) {
      return { message: 'Email address is already verified.', emailVerified: true };
    }

    if (!user.pendingOtpHash || !user.otpExpiresAt) {
      throw new DomainException(
        'OTP_NOT_REQUESTED',
        'No active verification OTP found. Please request a new code.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      throw new DomainException(
        'OTP_EXPIRED',
        'Verification code has expired. Please request a new code.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.otpAttemptCount >= 5) {
      throw new DomainException(
        'OTP_MAX_ATTEMPTS',
        'Maximum verification attempts reached. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isValid = await bcrypt.compare(code, user.pendingOtpHash);
    if (!isValid) {
      await this.usersService.updateAdminUser(user._id.toString(), {
        otpAttemptCount: user.otpAttemptCount + 1,
      });
      throw new DomainException(
        'INVALID_OTP',
        `Invalid verification code. ${4 - user.otpAttemptCount} attempts remaining.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.updateAdminUser(user._id.toString(), {
      emailVerified: true,
      pendingOtpHash: undefined,
      otpExpiresAt: undefined,
      otpAttemptCount: 0,
    });

    return {
      message: 'Email address successfully verified.',
      emailVerified: true,
    };
  }

  async resendOtp(adminUserId: string) {
    const user = await this.usersService.findById(adminUserId);
    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'Admin user profile not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.emailVerified) {
      return { message: 'Email address is already verified.' };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingOtpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.updateAdminUser(user._id.toString(), {
      pendingOtpHash,
      otpExpiresAt,
      otpAttemptCount: 0,
    });

    await this.mailService.sendVerificationEmail(user.email, {
      recipientName: user.name,
      verifyUrl: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-otp`,
      code: otpCode,
      expireMinutes: 10,
    });

    return { message: 'New verification OTP sent to your email.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    // Anti-enumeration: return generic success message if user not found
    if (!user) {
      this.logger.log(`[AuthService] Password reset requested for non-existent email: ${email}`);
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate 32-byte cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordTokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.usersService.updateAdminUser(user._id.toString(), {
      resetPasswordTokenHash,
      resetPasswordExpiresAt,
    });

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl}/auth?mode=reset-password&token=${rawToken}`;

    try {
      await this.mailService.sendForgotPasswordEmail(user.email, {
        recipientName: user.name,
        resetUrl,
        expireMinutes: 30,
      });
    } catch (mailErr: any) {
      this.logger.error(
        `[AuthService] Failed to send password reset email: ${mailErr.message}`,
      );
    }

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      devToken: isDev ? rawToken : undefined,
    };
  }

  async verifyResetToken(token: string) {
    if (!token) {
      throw new DomainException(
        'INVALID_RESET_TOKEN',
        'Reset token is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      new Date() > new Date(user.resetPasswordExpiresAt)
    ) {
      throw new DomainException(
        'EXPIRED_RESET_TOKEN',
        'Password reset link is invalid or has expired. Please request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      valid: true,
      email: user.email,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token || !dto.password) {
      throw new DomainException(
        'INVALID_PAYLOAD',
        'Token and new password are required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      new Date() > new Date(user.resetPasswordExpiresAt)
    ) {
      throw new DomainException(
        'EXPIRED_RESET_TOKEN',
        'Password reset link is invalid or has expired. Please request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.password, 10);

    await this.usersService.updateAdminUser(user._id.toString(), {
      passwordHash: newPasswordHash,
      resetPasswordTokenHash: undefined,
      resetPasswordExpiresAt: undefined,
    });

    // Invalidate all active user sessions upon password reset for security
    await this.redisService.revokeUserSessions(user._id.toString());

    return {
      message: 'Your password has been successfully reset. You can now log in.',
    };
  }

  async getProfile(adminUserId: string) {
    const user = await this.usersService.findById(adminUserId);
    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'User profile not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const business = await this.usersService.findBusinessById(
      user.businessId.toString(),
    );

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      business: business
        ? {
            id: business._id.toString(),
            name: business.name,
            domain: business.domain,
            publishableKey: business.publishableKey,
            status: business.status,
          }
        : null,
    };
  }

  private async generateTokens(
    adminUserId: string,
    businessId: string,
    email: string,
    role: string,
    sessionId: string,
  ): Promise<AuthTokens> {
    const payload = {
      sub: adminUserId,
      businessId,
      email,
      role,
      sessionId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as any,
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');

    return { accessToken, refreshToken };
  }
}
