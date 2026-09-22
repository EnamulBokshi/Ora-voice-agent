import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserActionDto } from './dto/admin-user-action.dto';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformAgentDto } from './dto/update-platform-agent.dto';
import { UpdateSessionLimitDto } from './dto/update-session-limit.dto';
import { TrialOutreachDto } from './dto/trial-outreach.dto';
import { PreviewAudienceDto, SendCampaignDto } from './dto/email-campaign.dto';
import { EmailCampaignService } from './services/email-campaign.service';
import { BillingService } from '../billing/billing.service';
import { CouponService } from '../billing/services/coupon.service';
import { CreateCouponDto, UpdateCouponDto } from '../billing/dto/coupon.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingService: BillingService,
    private readonly couponService: CouponService,
    private readonly campaignService: EmailCampaignService,
  ) {}

  @Get('stats')
  async getStats(@Query('period') period?: string) {
    return this.adminService.getPlatformStats(period);
  }

  @Get('businesses')
  async getBusinesses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getBusinesses({ page, limit, search, status });
  }

  @Get('businesses/:id')
  async getBusinessById(@Param('id') id: string) {
    return this.adminService.getBusinessById(id);
  }

  @Patch('businesses/:id/status')
  async updateBusinessStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateBusinessStatus(id, status);
  }

  @Delete('businesses/:id/publishable-key')
  async revokeBusinessPublishableKey(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const adminUserId = req?.user?.adminUserId || req?.user?.sub;
    return this.adminService.revokeBusinessPublishableKey(id, adminUserId);
  }

  @Patch('businesses/:id/key-status')
  async updateBusinessKeyStatus(
    @Param('id') id: string,
    @Body('keyStatus') keyStatus: string,
  ) {
    return this.adminService.updateBusinessKeyStatus(id, keyStatus);
  }

  @Get('users')
  async getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  async createPlatformUser(@Body() dto: CreatePlatformUserDto) {
    return this.adminService.createPlatformUser(dto);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Post('users/:id/action')
  async executeUserAction(
    @Param('id') id: string,
    @Body() dto: AdminUserActionDto,
    @Req() req: any,
  ) {
    const currentUserId = req?.user?.adminUserId || req?.user?.sub;
    return this.adminService.executeUserAction(id, dto, currentUserId);
  }

  @Get('voice-sessions')
  async getVoiceSessions(@Query('limit') limit?: number) {
    return this.adminService.getVoiceSessions(limit);
  }

  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('platform-agent')
  async getPlatformAgent() {
    return this.adminService.getPlatformAgentConfig();
  }

  @Patch('platform-agent')
  async updatePlatformAgent(@Body() dto: UpdatePlatformAgentDto) {
    return this.adminService.updatePlatformAgentConfig(dto);
  }

  @Get('token-analytics')
  async getTokenAnalytics(@Query('days') days?: number) {
    return this.adminService.getTokenAnalytics(days ? Number(days) : 30);
  }

  @Get('merchants-cost')
  async getMerchantsCost() {
    return this.adminService.getMerchantsCostAnalytics();
  }

  @Patch('businesses/:id/budget-cap')
  async updateMerchantBudgetCap(
    @Param('id') id: string,
    @Body('budgetCapUsd') budgetCapUsd: number | null,
  ) {
    return this.adminService.updateMerchantBudgetCap(id, budgetCapUsd);
  }

  /**
   * Sets or clears the maximum per-customer session duration for a merchant.
   * Pass `sessionDurationSeconds: null` to revert to the platform default (300s).
   */
  @Patch('businesses/:id/session-limit')
  async updateMerchantSessionLimit(
    @Param('id') id: string,
    @Body() dto: UpdateSessionLimitDto,
  ) {
    return this.adminService.setMerchantSessionLimit(id, dto.sessionDurationSeconds);
  }

  // --- Universal Plan Management & Merchant Custom Limits ---

  @Get('plans')
  async getAllPlans() {
    return this.billingService.getAllPlansAdmin();
  }

  @Post('plans')
  async createPlan(@Body() planData: any) {
    return this.billingService.createPlanAdmin(planData);
  }

  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() planData: any,
  ) {
    return this.billingService.updatePlanAdmin(planId, planData);
  }

  @Delete('plans/:planId')
  async deletePlan(@Param('planId') planId: string) {
    return this.billingService.deletePlanAdmin(planId);
  }

  // --- Trial leads ---

  @Get('trials')
  async getTrialLeads(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getTrialLeads({ page, limit, search, status });
  }

  @Post('trials/:businessId/contact')
  async contactTrialLead(
    @Param('businessId') businessId: string,
    @Body() dto: TrialOutreachDto,
    @Req() req: any,
  ) {
    return this.adminService.sendTrialOutreach(businessId, dto, {
      name: req?.user?.name,
      email: req?.user?.email,
    });
  }

  // --- Promotional campaigns ---

  @Post('campaigns/preview')
  @HttpCode(HttpStatus.OK)
  async previewCampaignAudience(@Body() dto: PreviewAudienceDto) {
    return this.campaignService.previewAudience(dto);
  }

  @Post('campaigns/send')
  @HttpCode(HttpStatus.OK)
  async sendCampaign(@Body() dto: SendCampaignDto, @Req() req: any) {
    return this.campaignService.send(dto, {
      userId: req?.user?.sub,
      email: req?.user?.email,
    });
  }

  @Get('campaigns')
  async campaignHistory(@Query('limit') limit?: number) {
    return this.campaignService.history(Number(limit) || 25);
  }

  // --- Coupons ---
  //
  // Creation lives behind the platform-admin guard on this controller. Merchants
  // only ever see /billing/coupons/validate, which prices a code they already know.

  @Get('coupons')
  async listCoupons() {
    return this.couponService.listAdmin();
  }

  @Post('coupons')
  async createCoupon(@Body() dto: CreateCouponDto, @Req() req: any) {
    return this.couponService.createAdmin(dto as any, req?.user?.sub);
  }

  @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateAdmin(id, dto as any);
  }

  @Delete('coupons/:id')
  async deactivateCoupon(@Param('id') id: string) {
    return { deactivated: await this.couponService.deleteAdmin(id) };
  }

  @Get('coupons/:id/redemptions')
  async couponRedemptions(@Param('id') id: string) {
    return this.couponService.redemptionsAdmin(id);
  }

  @Patch('businesses/:id/custom-limits')
  async setBusinessCustomLimits(
    @Param('id') id: string,
    @Body() customLimits: { voiceMinutes?: number; documentLimit?: number; websiteLimit?: number },
  ) {
    return this.billingService.setMerchantCustomLimits(id, customLimits);
  }

  @Patch('merchants/:id/custom-limits')
  async setMerchantCustomLimits(
    @Param('id') id: string,
    @Body() customLimits: { voiceMinutes?: number; documentLimit?: number; websiteLimit?: number },
  ) {
    return this.billingService.setMerchantCustomLimits(id, customLimits);
  }
}


