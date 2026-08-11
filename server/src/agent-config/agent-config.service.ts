import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AgentConfigService {
  constructor(
    @InjectModel(AgentConfig.name)
    private readonly agentConfigModel: Model<AgentConfigDocument>,
    @InjectModel(VoiceSettings.name)
    private readonly voiceSettingsModel: Model<VoiceSettingsDocument>,
    @InjectModel(SalesPlaybook.name)
    private readonly salesPlaybookModel: Model<SalesPlaybookDocument>,
  ) {}

  async getConfig(businessId: string) {
    const bId = businessId as any;

    let [config, voice, playbook] = await Promise.all([
      this.agentConfigModel.findOne({ businessId: bId }).exec(),
      this.voiceSettingsModel.findOne({ businessId: bId }).exec(),
      this.salesPlaybookModel.findOne({ businessId: bId }).exec(),
    ]);

    if (!config) {
      config = await new this.agentConfigModel({ businessId: bId }).save();
    }
    if (!voice) {
      voice = await new this.voiceSettingsModel({ businessId: bId }).save();
    }
    if (!playbook) {
      playbook = await new this.salesPlaybookModel({ businessId: bId }).save();
    }

    return {
      config,
      voice,
      playbook,
    };
  }

  async updateConfig(businessId: string, dto: UpdateAgentConfigDto) {
    const bId = businessId as any;

    const { voiceId, upsellCategories, mentionLowStockUrgency, ...configFields } = dto;

    const [config, voice, playbook] = await Promise.all([
      this.agentConfigModel.findOneAndUpdate(
        { businessId: bId },
        { $set: configFields },
        { upsert: true, new: true },
      ).exec(),
      voiceId
        ? this.voiceSettingsModel.findOneAndUpdate(
            { businessId: bId },
            { $set: { voiceId } },
            { upsert: true, new: true },
          ).exec()
        : this.voiceSettingsModel.findOne({ businessId: bId }).exec(),
      upsellCategories !== undefined || mentionLowStockUrgency !== undefined
        ? this.salesPlaybookModel.findOneAndUpdate(
            { businessId: bId },
            {
              $set: {
                ...(upsellCategories !== undefined ? { upsellCategories } : {}),
                ...(mentionLowStockUrgency !== undefined
                  ? { mentionLowStockUrgency }
                  : {}),
              },
            },
            { upsert: true, new: true },
          ).exec()
        : this.salesPlaybookModel.findOne({ businessId: bId }).exec(),
    ]);

    return {
      config,
      voice,
      playbook,
    };
  }
}
