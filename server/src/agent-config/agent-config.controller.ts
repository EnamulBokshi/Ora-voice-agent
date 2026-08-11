import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AgentConfigService } from './agent-config.service';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('agent-config')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  @Get()
  async getConfig(@CurrentUser() user: JwtPayloadUser) {
    return this.agentConfigService.getConfig(user.businessId);
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
