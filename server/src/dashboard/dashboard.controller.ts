import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getStats(user.businessId);
  }

  @Get('revenue-analytics')
  async getRevenueAnalytics(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getRevenueAnalytics(user.businessId);
  }

  @Get('funnel-analytics')
  async getFunnelAnalytics(@CurrentUser() user: JwtPayloadUser) {
    return this.dashboardService.getFunnelAnalytics(user.businessId);
  }
}

