import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentConfigService } from './agent-config.service';
import { AgentConfigController } from './agent-config.controller';
import {
  AgentConfig,
  AgentConfigSchema,
  VoiceSettings,
  VoiceSettingsSchema,
  SalesPlaybook,
  SalesPlaybookSchema,
} from './schemas/agent-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentConfig.name, schema: AgentConfigSchema },
      { name: VoiceSettings.name, schema: VoiceSettingsSchema },
      { name: SalesPlaybook.name, schema: SalesPlaybookSchema },
    ]),
  ],
  controllers: [AgentConfigController],
  providers: [AgentConfigService],
  exports: [AgentConfigService, MongooseModule],
})
export class AgentConfigModule {}
