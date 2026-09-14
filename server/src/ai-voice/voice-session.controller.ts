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
import { ConfigService } from '@nestjs/config';
import { BootstrapVoiceSessionDto } from './dto/voice-session.dto';
import { BootstrapRateLimitGuard } from './guards/bootstrap-rate-limit.guard';
import { normalizeGeminiVoice } from './gemini-voice.service';

@Controller('voice')
export class VoiceSessionController {
  private readonly logger = new Logger(VoiceSessionController.name);

  constructor(private readonly configService: ConfigService) {}

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

  /**
   * POST /api/v1/voice/preview-sample
   *
   * Generates real speech audio preview directly from Google Gemini Live audio models
   * for the requested voiceName ('Aoede' | 'Fenrir' | 'Kore' | 'Puck' | 'Charon').
   */
  @Post('preview-sample')
  @HttpCode(HttpStatus.OK)
  async previewVoiceSample(
    @Body() body: { voiceId?: string; sampleText?: string },
  ) {
    const voiceId = normalizeGeminiVoice(body.voiceId);
    const text =
      body.sampleText ||
      'Welcome to our store! I am your AI sales assistant, ready to help you find the best products.';
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY not configured in server/.env',
      };
    }

    try {
      const modelName =
        this.configService.get<string>('GEMINI_MODEL')?.replace('models/', '') ||
        this.configService.get<string>('GEMINI_LIVE_MODEL')?.replace('models/', '') ||
        process.env.GEMINI_MODEL?.replace('models/', '') ||
        process.env.GEMINI_LIVE_MODEL?.replace('models/', '') ||
        'gemini-3.1-flash-live-preview';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: `Speak this sentence naturally and conversationally in English: "${text}"` }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceId,
              },
            },
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`[VoiceSessionController] Gemini voice preview failed: ${errText}`);
        return { success: false, error: errText };
      }

      const json: any = await res.json();
      const part = json?.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (inlineData?.data) {
        return {
          success: true,
          audioBase64: inlineData.data,
          mimeType: inlineData.mimeType || 'audio/pcm;rate=24000',
        };
      }

      return { success: false, error: 'No audio data returned from Gemini API' };
    } catch (err: any) {
      this.logger.error(`[VoiceSessionController] Gemini preview error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
