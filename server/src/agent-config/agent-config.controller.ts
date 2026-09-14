import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { AgentConfigService } from './agent-config.service';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { SwitchArchetypeDto } from './dto/switch-archetype.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('agent-config')
@UseGuards(JwtAuthGuard, TenantScopeGuard, SubscriptionGuard)
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  @Get()
  async getConfig(@CurrentUser() user: JwtPayloadUser) {
    return this.agentConfigService.getConfig(user.businessId);
  }

  /**
   * The archetypes this business already has a profile for, so the dashboard
   * can show which ones are configured before the merchant switches.
   */
  @Get('profiles')
  async listProfiles(@CurrentUser() user: JwtPayloadUser) {
    return this.agentConfigService.listProfiles(user.businessId);
  }

  /**
   * Switches which profile is live. Nothing is deleted — the profile being
   * left is kept and restored by switching back.
   */
  @Post('archetype')
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async switchArchetype(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SwitchArchetypeDto,
  ) {
    return this.agentConfigService.switchArchetype(user.businessId, dto.archetype);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async updateConfig(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: UpdateAgentConfigDto,
  ) {
    return this.agentConfigService.updateConfig(user.businessId, dto);
  }
}
