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

import { DisposableEmailValidatorService } from './services/disposable-email-validator.service';

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
    private readonly disposableEmailValidatorService: DisposableEmailValidatorService,
    @Optional()
    private readonly onboardingEmailService?: OnboardingEmailService,
  ) {}

  getFrontendUrl(clientOrigin?: string): string {
    if (clientOrigin && clientOrigin.startsWith('http')) {
      return clientOrigin.replace(/\/+$/, '');
    }
    const envUrl = this.configService.get<string>('FRONTEND_URL');
    if (envUrl && envUrl.trim().length > 0) {
      return envUrl.replace(/\/+$/, '');
    }
    return this.configService.get<string>('NODE_ENV') === 'production'
      ? 'https://tryora.live'
      : 'http://localhost:3000';
  }

  async register(
    dto: RegisterDto,
    reqInfo: { userAgent?: string; ip?: string },
    clientOrigin?: string,
  ) {
    if (this.disposableEmailValidatorService.isDisposable(dto.email)) {
      throw new DomainException(
        'DISPOSABLE_EMAIL_NOT_ALLOWED',
        'Disposable or temporary email addresses are not permitted. Please use your official business email.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedDomain = dto.domain
      ? this.disposableEmailValidatorService.normalizeDomain(dto.domain)
      : undefined;

    const existingUser = await this.usersService.findByEmail(dto.email);
    let user: any;
    let business: any;

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new DomainException(
          'EMAIL_ALREADY_EXISTS',
          'Email address is already registered and verified. Please sign in.',
          HttpStatus.CONFLICT,
        );
      }

      // User registered previously but did not complete email OTP verification.
      // Allow updating name/password/business and resending a fresh OTP code.
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.usersService.updateAdminUser(existingUser._id.toString(), {
        name: dto.name,
        passwordHash,
      });
      if (!user) {
        user = existingUser;
      }

      business = await this.usersService.findBusinessById(
        existingUser.businessId?.toString() || '',
      );

      if (business) {
        business = await this.usersService.updateBusiness(business._id.toString(), {
          name: dto.businessName,
          domain: dto.domain,
          ...(normalizedDomain ? { normalizedDomain } : {}),
        });
      } else {
        business = await this.usersService.createBusiness(
          dto.businessName,
          dto.domain,
          normalizedDomain ? { normalizedDomain } : undefined,
        );
        user = await this.usersService.updateAdminUser(existingUser._id.toString(), {
          businessId: business._id as any,
        });
        if (!user) {
          user = existingUser;
        }
      }
    } else {
      const passwordHash = await bcrypt.hash(dto.password, 10);

      business = await this.usersService.createBusiness(
        dto.businessName,
        dto.domain,
        normalizedDomain ? { normalizedDomain } : undefined,
      );

      user = await this.usersService.createAdminUser({
        businessId: business._id.toString(),
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: AdminRole.USER,
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingOtpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.usersService.updateAdminUser(user._id.toString(), {
      pendingOtpHash,
      otpExpiresAt,
      otpAttemptCount: 0,
    });

    const frontendUrl = this.getFrontendUrl(clientOrigin);
    const verifyUrl = `${frontendUrl}/auth?mode=otp&code=${otpCode}&email=${encodeURIComponent(user.email)}`;

    try {
      await this.mailService.sendVerificationEmail(user.email, {
        recipientName: user.name,
        verifyUrl,
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

  async resendOnboardingEmail(userId: string, clientOrigin?: string) {
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
        clientOrigin,
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

  async verifyOtp(
    adminUserId: string | undefined,
    code: string,
    email?: string,
    reqInfo?: { userAgent?: string; ip?: string },
  ) {
    let user: any = null;
    if (adminUserId) {
      user = await this.usersService.findById(adminUserId);
    } else if (email) {
      user = await this.usersService.findByEmail(email.toLowerCase().trim());
    }

    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'User profile not found. Please provide a valid email or sign in.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.emailVerified) {
      return {
        message: 'Email address is already verified.',
        emailVerified: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId?.toString(),
          emailVerified: true,
        },
      };
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

    const sessionId = crypto.randomUUID();
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.businessId?.toString() || '',
      user.email,
      user.role,
      sessionId,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.redisService.setSession(sessionId, {
      adminUserId: user._id.toString(),
      businessId: user.businessId?.toString() || '',
      email: user.email,
      role: user.role,
      refreshTokenHash,
      userAgent: reqInfo?.userAgent || 'Browser',
      ip: reqInfo?.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return {
      message: 'Email address successfully verified.',
      emailVerified: true,
      tokens,
      sessionId,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId?.toString(),
        emailVerified: true,
      },
    };
  }

  async resendOtp(userIdOrEmail: string, clientOrigin?: string) {
    let user = await this.usersService.findById(userIdOrEmail);
    if (!user) {
      user = await this.usersService.findByEmail(userIdOrEmail);
    }

    if (!user) {
      throw new DomainException(
        'USER_NOT_FOUND',
        'User not found.',
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

    const frontendUrl = this.getFrontendUrl(clientOrigin);
    const verifyUrl = `${frontendUrl}/auth?mode=otp&code=${otpCode}&email=${encodeURIComponent(user.email)}`;

    await this.mailService.sendVerificationEmail(user.email, {
      recipientName: user.name,
      verifyUrl,
      code: otpCode,
      expireMinutes: 10,
    });

    return { message: 'New verification OTP sent to your email.' };
  }

  async forgotPassword(dto: ForgotPasswordDto, clientOrigin?: string) {
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

    const frontendUrl = this.getFrontendUrl(clientOrigin);
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

  async resetPassword(
    dto: ResetPasswordDto,
    reqInfo: { userAgent?: string; ip?: string } = {},
  ) {
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

    // Fetch tenant business to issue authenticated tokens & session
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
      message: 'Your password has been successfully reset.',
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
            // Required by the dashboard to render the storefront pause state.
            // While this was omitted, every client read `undefined` here and fell back
            // to its `true` default, so pausing the widget appeared to revert to
            // "Voice Agent Online" on the next navigation even though the pause had
            // been persisted correctly.
            isWidgetActive: business.isWidgetActive !== false,
            // Proof the embed actually ran on a storefront: detectedOrigins is only
            // written by recordOriginTelemetry when the widget opens a real voice
            // socket from a page. The setup checklist derives its "widget embedded"
            // step from this instead of from the existence of a publishable key, which
            // every business holds from signup and therefore proved nothing.
            // A boolean, not the origin list, so this stays free of the host/telemetry
            // detail that only the admin console needs.
            hasWidgetTraffic: (business.detectedOrigins?.length ?? 0) > 0,
            // The live agent profile, and whether this business actually sells
            // from a catalogue. The dashboard shows catalogue surfaces on this
            // evidence rather than to every tenant — not every business has
            // products, and the agent only gets cart and checkout tools under
            // the same rule (ai-voice/tools/archetype-capabilities.ts).
            activeArchetype: business.activeArchetype,
            hasCatalog: !['none', 'passive', undefined, null].includes(
              business.connectedPlatform as any,
            ),
          }
        : null,
    };
  }

  /**
   * Issues ORA tokens for a user whose identity has already been established by
   * something other than a password — currently the Shopify embedded app, which
   * verifies a Shopify-signed App Bridge session token first.
   *
   * An existing Redis session for the user is reused rather than replaced. The
   * embedded client re-exchanges its App Bridge token on every page load, so
   * minting a new 7-day session each time would grow Redis without bound for
   * every active shop. The refresh token still rotates on each call, which keeps
   * the theft-detection contract in `refresh` intact.
   *
   * This is the only public way to mint a session, so callers never reimplement
   * `generateTokens`: the refresh token is opaque and only its bcrypt hash is
   * stored, and a second copy of that logic would drift from `refresh` and
   * `logout`.
   */
  async issueSessionForUser(
    adminUserId: string,
    businessId: string,
    email: string,
    role: string,
    reqInfo: { userAgent?: string; ip?: string } = {},
  ) {
    const existingSessionId =
      await this.redisService.getUserSessionPointer(adminUserId);

    let sessionId: string | null = null;

    if (existingSessionId) {
      const existingSession =
        await this.redisService.getSession(existingSessionId);
      // A pointer can outlive its session, and a session that has since been
      // reassigned to another tenant must not be handed back.
      if (existingSession && existingSession.businessId === businessId) {
        sessionId = existingSessionId;
      } else {
        await this.redisService.deleteUserSessionPointer(adminUserId);
      }
    }

    const isNewSession = sessionId === null;
    if (sessionId === null) {
      sessionId = crypto.randomUUID();
    }

    const tokens = await this.generateTokens(
      adminUserId,
      businessId,
      email,
      role,
      sessionId,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.redisService.setSession(sessionId, {
      adminUserId,
      businessId,
      email,
      role,
      refreshTokenHash,
      userAgent: reqInfo.userAgent,
      ip: reqInfo.ip,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.setUserSessionPointer(adminUserId, sessionId);

    this.logger.log(
      `[AuthService] ${isNewSession ? 'Created' : 'Reused'} session ${sessionId} for user ${adminUserId} via external identity provider.`,
    );

    return { tokens, sessionId };
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
