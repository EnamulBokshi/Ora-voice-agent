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
import { GeminiVoiceService } from './gemini-voice.service';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import {
  BootstrapVoiceSessionDto,
  ExecuteVoiceToolDto,
} from './dto/voice-session.dto';

@Controller('voice')
export class VoiceSessionController {
  private readonly logger = new Logger(VoiceSessionController.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly geminiVoiceService: GeminiVoiceService,
    private readonly aiToolsExecutor: AiToolsExecutor,
  ) {}

  @Post('session/bootstrap')
  @HttpCode(HttpStatus.OK)
  async bootstrapSession(@Body() dto: BootstrapVoiceSessionDto) {
    const { publishableKey } = dto;
    const sessionId =
      dto.sessionId ||
      `ses_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

    let business = await this.businessModel
      .findOne({ publishableKey })
      .exec();

    // Dev playground fallback for mock key
    if (!business && publishableKey === 'biz_live_mock_key_12345') {
      business = await this.businessModel
        .findOneAndUpdate(
          { publishableKey: 'biz_live_mock_key_12345' },
          {
            name: 'Dev Playground Store',
            publishableKey: 'biz_live_mock_key_12345',
            status: 'active',
          },
          { upsert: true, new: true },
        )
        .exec();
    }

    if (!business) {
      throw new NotFoundException(
        `Invalid publishable key: '${publishableKey}'. Store not found.`,
      );
    }

    const businessId = business._id.toString();

    try {
      const bootstrapData =
        await this.geminiVoiceService.generateVoiceSessionBootstrap(
          businessId,
          sessionId,
        );

      this.logger.log(
        `[VoiceSessionController] Minted voice session bootstrap for business ${businessId} (session: ${sessionId})`,
      );

      return {
        success: true,
        data: bootstrapData,
      };
    } catch (err: any) {
      this.logger.error(
        `[VoiceSessionController] Failed to bootstrap voice session: ${err.message}`,
      );
      throw new BadRequestException(
        err.message || 'Failed to initialize voice session.',
      );
    }
  }

  @Post('tools/execute')
  @HttpCode(HttpStatus.OK)
  async executeTool(@Body() dto: ExecuteVoiceToolDto) {
    let businessId = dto.businessId;

    if (!businessId && dto.publishableKey) {
      const business = await this.businessModel
        .findOne({ publishableKey: dto.publishableKey })
        .exec();
      if (business) {
        businessId = business._id.toString();
      }
    }

    if (!businessId) {
      throw new BadRequestException('businessId or valid publishableKey is required.');
    }

    this.logger.log(
      `[VoiceSessionController] Executing client-side voice tool: ${dto.toolName} (session: ${dto.sessionId})`,
    );

    const output = await this.aiToolsExecutor.executeTool(
      businessId,
      dto.sessionId,
      dto.toolName,
      dto.args || {},
    );

    return {
      success: true,
      data: {
        toolName: dto.toolName,
        output,
      },
    };
  }
}
