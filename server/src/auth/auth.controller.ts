import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractClientOrigin(req: Request): string | undefined {
    const clientOrigin = req.headers['x-client-origin'];
    if (clientOrigin && typeof clientOrigin === 'string' && clientOrigin.startsWith('http')) {
      return clientOrigin.replace(/\/+$/, '');
    }

    const originHeader = req.headers['origin'];
    if (originHeader && typeof originHeader === 'string' && originHeader.startsWith('http')) {
      return originHeader.replace(/\/+$/, '');
    }

    const referer = req.headers['referer'];
    if (referer && typeof referer === 'string' && referer.startsWith('http')) {
      try {
        const url = new URL(referer);
        return url.origin.replace(/\/+$/, '');
      } catch {
        // ignore malformed referer
      }
    }

    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost && typeof forwardedHost === 'string') {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const host = forwardedHost.split(',')[0].trim();
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : (isLocal ? 'http' : 'https');
      return `${proto}://${host}`.replace(/\/+$/, '');
    }

    return undefined;
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const origin = this.extractClientOrigin(req);
    const result = await this.authService.register(dto, { userAgent, ip }, origin);

    this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId, result.user.role);

    return {
      accessToken: result.tokens.accessToken,
      user: result.user,
      business: result.business,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await this.authService.login(dto, { userAgent, ip });

    this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId, result.user.role);

    return {
      accessToken: result.tokens.accessToken,
      user: result.user,
      business: result.business,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    const sessionId = req.cookies?.['sessionId'];
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    try {
      const tokens = await this.authService.refresh(refreshToken, sessionId, {
        userAgent,
        ip,
      });

      this.setAuthCookies(res, tokens.refreshToken, sessionId, tokens.role);

      return {
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      this.clearAuthCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = req.cookies?.['sessionId'];
    await this.authService.logout(sessionId);

    this.clearAuthCookies(res);

    return { message: 'Logged out successfully.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @CurrentUser() user: JwtPayloadUser | null,
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await this.authService.verifyOtp(user?.sub, dto.code, dto.email, { userAgent, ip });

    if (result.tokens && result.sessionId) {
      this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId, result.user?.role);
    }

    return {
      message: result.message,
      emailVerified: result.emailVerified,
      accessToken: result.tokens?.accessToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@CurrentUser() user: JwtPayloadUser, @Req() req: Request) {
    const origin = this.extractClientOrigin(req);
    return this.authService.resendOtp(user.sub, origin);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-onboarding')
  @HttpCode(HttpStatus.OK)
  async resendOnboardingEmail(@CurrentUser() user: JwtPayloadUser, @Req() req: Request) {
    const origin = this.extractClientOrigin(req);
    return this.authService.resendOnboardingEmail(user.sub, origin);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const origin = this.extractClientOrigin(req);
    return this.authService.forgotPassword(dto, origin);
  }

  @Get('verify-reset-token')
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const result = await this.authService.resetPassword(dto, { userAgent, ip });

    this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId, result.user.role);

    return {
      message: result.message,
      accessToken: result.tokens.accessToken,
      user: result.user,
      business: result.business,
    };
  }

  private setAuthCookies(
    res: Response,
    refreshToken: string,
    sessionId: string,
    userRole?: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.cookie('sessionId', sessionId, cookieOptions);
    if (userRole) {
      res.cookie('userRole', userRole, {
        ...cookieOptions,
        httpOnly: false,
      });
    }
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('sessionId', cookieOptions);
    res.clearCookie('userRole', { ...cookieOptions, httpOnly: false });
  }
}
