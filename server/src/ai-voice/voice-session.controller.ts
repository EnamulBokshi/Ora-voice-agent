import {
  Controller,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { BootstrapVoiceSessionDto } from './dto/voice-session.dto';

@Controller('voice')
export class VoiceSessionController {
  private readonly logger = new Logger(VoiceSessionController.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) { }

  /**
   * POST /api/v1/voice/session/bootstrap
   *
   * Returns ONLY the session ID and WebSocket path — no credentials, no API key,
   * no model, no system instruction. The proxy gateway at /ws/voice handles everything.
   */
  @Post('session/bootstrap')
  @HttpCode(HttpStatus.OK)
  async bootstrapSession(@Body() dto: BootstrapVoiceSessionDto) {
    const { publishableKey } = dto;
    const sessionId =
      dto.sessionId ||
      `ses_w_${Math.random().toString(36).substring(2, 9)}`;

    let business = await this.businessModel
      .findOne({ publishableKey, status: 'active' })
      .exec();

    if (!business && publishableKey === 'biz_live_mock_key_12345' && process.env.NODE_ENV !== 'production') {
      business = await this.businessModel
        .findOne({})
        .sort({ createdAt: -1 })
        .exec();
    }

    if (!business) {
      throw new NotFoundException(
        `Invalid or revoked publishable key: '${publishableKey}'. No active store found.`,
      );
    }

    this.logger.log(
      `[VoiceSessionController] Bootstrap for business ${business.name} — session: ${sessionId}`,
    );

    // Return only safe, non-sensitive connection info.
    // TransformInterceptor will wrap this into { success: true, data: { sessionId, wsPath } }
    return {
      sessionId,
      wsPath: '/ws/voice',
    };
  }
}
