import { Injectable, Inject, Optional, forwardRef, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AgentConfig,
  AgentConfigDocument,
  VoiceSettings,
  VoiceSettingsDocument,
  SalesPlaybook,
  SalesPlaybookDocument,
} from './schemas/agent-config.schema';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { GeminiVoiceService } from '../ai-voice/gemini-voice.service';
import { AgentProfileService } from '../common/agent-profile/agent-profile.service';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class AgentConfigService {
  constructor(
    @InjectModel(AgentConfig.name)
    private readonly agentConfigModel: Model<AgentConfigDocument>,
    @InjectModel(VoiceSettings.name)
    private readonly voiceSettingsModel: Model<VoiceSettingsDocument>,
    @InjectModel(SalesPlaybook.name)
    private readonly salesPlaybookModel: Model<SalesPlaybookDocument>,
    private readonly agentProfileService: AgentProfileService,
    @Inject(forwardRef(() => GeminiVoiceService))
    @Optional()
    private readonly geminiVoiceService?: GeminiVoiceService,
  ) {}

  /**
   * Reads the profile the business is currently running.
   *
   * A profile the merchant has not visited yet does not exist, so the three
   * documents are seeded blank on first read. That is what makes a switch
   * "start from the beginning" without anything being cleared: the new
   * archetype simply has no profile behind it yet.
   */
  async getConfig(businessId: string) {
    const bId = businessId as any;
    const archetype = await this.agentProfileService.getActiveArchetype(businessId);

    let [config, voice, playbook] = await Promise.all([
      this.agentConfigModel.findOne({ businessId: bId, archetype }).exec(),
      this.voiceSettingsModel.findOne({ businessId: bId, archetype }).exec(),
      this.salesPlaybookModel.findOne({ businessId: bId, archetype }).exec(),
    ]);

    if (!config) {
      config = await new this.agentConfigModel({ businessId: bId, archetype }).save();
    }
    if (!voice) {
      voice = await new this.voiceSettingsModel({ businessId: bId, archetype }).save();
    }
    if (!playbook) {
      playbook = await new this.salesPlaybookModel({ businessId: bId, archetype }).save();
    }

    return {
      activeArchetype: archetype,
      config,
      voice,
      playbook,
    };
  }

  /**
   * Lists the archetypes this business already has a profile for, so the
   * dashboard can tell a merchant which ones they can switch back into
   * without losing their place.
   */
  async listProfiles(businessId: string) {
    const bId = businessId as any;
    const [activeArchetype, configs] = await Promise.all([
      this.agentProfileService.getActiveArchetype(businessId),
      this.agentConfigModel
        .find({ businessId: bId })
        .select('archetype brandVoiceDescription systemPrompt updatedAt')
        .lean()
        .exec(),
    ]);

    return {
      activeArchetype,
      profiles: configs.map((c: any) => ({
        archetype: c.archetype,
        isConfigured: Boolean(
          (c.systemPrompt || '').trim() || (c.businessSummary || '').trim(),
        ),
        updatedAt: c.updatedAt,
      })),
    };
  }

  /**
   * Switches which profile is live.
   *
   * This writes one pointer. It never touches the profile being left — the
   * merchant's previous persona, prompt, voice and knowledge stay exactly as
   * they were and come back if they switch back.
   */
  async switchArchetype(businessId: string, archetype: string) {
    const resolved = await this.agentProfileService.setActiveArchetype(
      businessId,
      archetype,
    );

    if (!resolved) {
      throw new DomainException(
        'INVALID_ARCHETYPE',
        `'${archetype}' is not a known business archetype.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.invalidateVoiceCache(businessId);

    // Seeds the new profile if it is the merchant's first visit to it.
    return this.getConfig(businessId);
  }

  async updateConfig(businessId: string, dto: UpdateAgentConfigDto) {
    const bId = businessId as any;
    const archetype = await this.agentProfileService.getActiveArchetype(businessId);

    const { voiceId, upsellCategories, mentionLowStockUrgency, ...configFields } = dto;

    const [config, voice, playbook] = await Promise.all([
      this.agentConfigModel.findOneAndUpdate(
        { businessId: bId, archetype },
        { $set: { ...configFields, archetype } },
        { upsert: true, returnDocument: 'after' },
      ).exec(),
      voiceId
        ? this.voiceSettingsModel.findOneAndUpdate(
            { businessId: bId, archetype },
            { $set: { voiceId, archetype } },
            { upsert: true, returnDocument: 'after' },
          ).exec()
        : this.voiceSettingsModel.findOne({ businessId: bId, archetype }).exec(),
      upsellCategories !== undefined || mentionLowStockUrgency !== undefined
        ? this.salesPlaybookModel.findOneAndUpdate(
            { businessId: bId, archetype },
            {
              $set: {
                archetype,
                ...(upsellCategories !== undefined ? { upsellCategories } : {}),
                ...(mentionLowStockUrgency !== undefined
                  ? { mentionLowStockUrgency }
                  : {}),
              },
            },
            { upsert: true, returnDocument: 'after' },
          ).exec()
        : this.salesPlaybookModel.findOne({ businessId: bId, archetype }).exec(),
    ]);

    this.invalidateVoiceCache(businessId);

    return {
      activeArchetype: archetype,
      config,
      voice,
      playbook,
    };
  }

  /**
   * Drops the compiled system instruction so active and future voice sessions
   * pick up the current profile instead of the one that was live a moment ago.
   */
  private invalidateVoiceCache(businessId: string): void {
    if (!this.geminiVoiceService) return;
    try {
      this.geminiVoiceService.invalidateInstructionCache(businessId);
    } catch {}
  }
}
