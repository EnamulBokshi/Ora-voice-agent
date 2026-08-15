import {
  Controller,
  Post,
  Get,
  Body,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId);

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
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    this.setAuthCookies(res, result.tokens.refreshToken, result.sessionId);

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

    try {
      const tokens = await this.authService.refresh(refreshToken, sessionId, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      this.setAuthCookies(res, tokens.refreshToken, sessionId);

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

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(user.sub, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.resendOtp(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-onboarding')
  @HttpCode(HttpStatus.OK)
  async resendOnboardingEmail(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.resendOnboardingEmail(user.sub);
  }

  private setAuthCookies(
    res: Response,
    refreshToken: string,
    sessionId: string,
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
  }

}
