import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UsageMetricsPayload {
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  audioInputSeconds?: number;
  audioOutputSeconds?: number;
  embeddingTokens?: number;
  model?: string;
}

export interface CostBreakdown {
  promptCostUsd: number;
  completionCostUsd: number;
  cachedCostUsd: number;
  audioInputCostUsd: number;
  audioOutputCostUsd: number;
  embeddingCostUsd: number;
  totalCostUsd: number;
  totalCostBdt: number;
}

@Injectable()
export class CostCalculatorService {
  // Rates per 1,000,000 tokens (Gemini 2.0 Flash standard)
  private readonly promptTokenRatePerMillion: number;
  private readonly completionTokenRatePerMillion: number;
  private readonly cachedTokenRatePerMillion: number;
  private readonly embeddingTokenRatePerMillion: number;

  // Rates per minute of bidirectional audio
  private readonly audioInputRatePerMinuteUsd: number;
  private readonly audioOutputRatePerMinuteUsd: number;

  // USD to BDT exchange rate
  private readonly usdToBdtRate: number;

  constructor(private readonly configService: ConfigService) {
    this.promptTokenRatePerMillion = parseFloat(
      this.configService.get<string>('LLM_PROMPT_TOKEN_RATE_PER_M') || '0.10',
    );
    this.completionTokenRatePerMillion = parseFloat(
      this.configService.get<string>('LLM_COMPLETION_TOKEN_RATE_PER_M') || '0.40',
    );
    this.cachedTokenRatePerMillion = parseFloat(
      this.configService.get<string>('LLM_CACHED_TOKEN_RATE_PER_M') || '0.025',
    );
    this.embeddingTokenRatePerMillion = parseFloat(
      this.configService.get<string>('EMBEDDING_TOKEN_RATE_PER_M') || '0.02',
    );

    // Approx $0.70 / 1M audio tokens ~= $0.0021 / min input; $2.00 / 1M ~= $0.006 / min output
    this.audioInputRatePerMinuteUsd = parseFloat(
      this.configService.get<string>('AUDIO_INPUT_RATE_PER_MIN_USD') || '0.0021',
    );
    this.audioOutputRatePerMinuteUsd = parseFloat(
      this.configService.get<string>('AUDIO_OUTPUT_RATE_PER_MIN_USD') || '0.0060',
    );

    this.usdToBdtRate = parseFloat(
      this.configService.get<string>('USD_TO_BDT_EXCHANGE_RATE') || '122.0',
    );
  }

  /**
   * Calculate exact cost breakdown in USD and BDT from raw metrics.
   */
  calculateCost(metrics: UsageMetricsPayload): CostBreakdown {
    const promptTokens = metrics.promptTokens || 0;
    const completionTokens = metrics.completionTokens || 0;
    const cachedTokens = metrics.cachedTokens || 0;
    const audioInputSecs = metrics.audioInputSeconds || 0;
    const audioOutputSecs = metrics.audioOutputSeconds || 0;
    const embeddingTokens = metrics.embeddingTokens || 0;

    const promptCostUsd = (promptTokens / 1_000_000) * this.promptTokenRatePerMillion;
    const completionCostUsd = (completionTokens / 1_000_000) * this.completionTokenRatePerMillion;
    const cachedCostUsd = (cachedTokens / 1_000_000) * this.cachedTokenRatePerMillion;
    const embeddingCostUsd = (embeddingTokens / 1_000_000) * this.embeddingTokenRatePerMillion;

    const audioInputCostUsd = (audioInputSecs / 60) * this.audioInputRatePerMinuteUsd;
    const audioOutputCostUsd = (audioOutputSecs / 60) * this.audioOutputRatePerMinuteUsd;

    const totalCostUsd =
      promptCostUsd +
      completionCostUsd +
      cachedCostUsd +
      embeddingCostUsd +
      audioInputCostUsd +
      audioOutputCostUsd;

    const totalCostBdt = totalCostUsd * this.usdToBdtRate;

    return {
      promptCostUsd: this.roundMicro(promptCostUsd),
      completionCostUsd: this.roundMicro(completionCostUsd),
      cachedCostUsd: this.roundMicro(cachedCostUsd),
      audioInputCostUsd: this.roundMicro(audioInputCostUsd),
      audioOutputCostUsd: this.roundMicro(audioOutputCostUsd),
      embeddingCostUsd: this.roundMicro(embeddingCostUsd),
      totalCostUsd: this.roundMicro(totalCostUsd),
      totalCostBdt: Math.round(totalCostBdt * 100) / 100,
    };
  }

  /**
   * Format USD with standard 4-decimal precision or exponential if negligible.
   */
  private roundMicro(val: number): number {
    return Math.round(val * 1_000_000) / 1_000_000;
  }
}
