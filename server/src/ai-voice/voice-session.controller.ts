import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BootstrapVoiceSessionDto } from './dto/voice-session.dto';
import { BootstrapRateLimitGuard } from './guards/bootstrap-rate-limit.guard';

@Controller('voice')
export class VoiceSessionController {
  private readonly logger = new Logger(VoiceSessionController.name);

  /**
   * POST /api/v1/voice/session/bootstrap
   *
   * High-throughput storefront verification endpoint protected by BootstrapRateLimitGuard.
   * Returns ONLY the session ID and WebSocket path.
   */
  @Post('session/bootstrap')
  @UseGuards(BootstrapRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async bootstrapSession(
    @Body() dto: BootstrapVoiceSessionDto,
    @Req() req: any,
  ) {
    const business = req.business;
    const sessionId =
      dto.sessionId ||
      `ses_w_${Math.random().toString(36).substring(2, 9)}`;

    this.logger.log(
      `[VoiceSessionController] Verified storefront bootstrap for ${business?.name || 'Store'} — session: ${sessionId}`,
    );

    return {
      sessionId,
      wsPath: '/ws/voice',
    };
  }
}
