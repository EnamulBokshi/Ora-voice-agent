import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AgentProfileService } from './agent-profile.service';
import { Business, BusinessSchema } from '../../users/schemas/business.schema';

/**
 * Global for the same reason as EntitlementModule: agent-config, knowledge,
 * rag and ai-voice all need to know which profile is live, and requiring each
 * of them to register the Business schema is how one of them ends up reading
 * the wrong profile's data.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Business.name, schema: BusinessSchema }]),
  ],
  providers: [AgentProfileService],
  exports: [AgentProfileService],
})
export class AgentProfileModule {}
