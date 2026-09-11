import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { LiveDeskService } from './live-desk.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('live-desk')
@UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard, SubscriptionGuard)
@Roles(AdminRole.OWNER, AdminRole.ADMIN, AdminRole.STAFF)
export class LiveDeskController {
  constructor(private readonly liveDeskService: LiveDeskService) {}

  @Get('stats')
  async getLiveStats(@CurrentUser() user: JwtPayloadUser) {
    return this.liveDeskService.getLiveStats(user.businessId);
  }

  @Get('activity-feed')
  async getActivityFeed(
    @CurrentUser() user: JwtPayloadUser,
    @Query('limit') limit?: number,
  ) {
    return this.liveDeskService.getActivityFeed(user.businessId, Number(limit) || 10);
  }

  @Get('voice-sessions')
  async getVoiceSessions(@CurrentUser() user: JwtPayloadUser) {
    return this.liveDeskService.getVoiceSessions(user.businessId);
  }

  @Get('sales-conversions')
  async getSalesConversions(@CurrentUser() user: JwtPayloadUser) {
    return this.liveDeskService.getSalesConversions(user.businessId);
  }

  @Get('system-health')
  async getSystemHealth() {
    return this.liveDeskService.getSystemHealth();
  }

  @Post('sessions/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.liveDeskService.closeSession(user.businessId, id);
  }

  @Post('voice-sessions/:id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateVoiceSession(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.liveDeskService.terminateVoiceSession(user.businessId, id);
  }
}
