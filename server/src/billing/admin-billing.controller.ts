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
import { BillingManagementService } from './services/billing-management.service';
import { CouponService } from './services/coupon.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { UpdateSubscriptionAdminDto } from './dto/update-subscription-admin.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/**
 * SuperAdmin Command Center - Subscription & Billing Management Controller
 * Strictly guarded by JwtAuthGuard and RolesGuard (SUPER_ADMIN and ADMIN).
 * TenantScopeGuard is deliberately omitted in accordance with AGENTS.md rules.
 */
@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class AdminBillingController {
  constructor(
    private readonly billingManagementService: BillingManagementService,
    private readonly couponService: CouponService,
  ) {}

  // ==========================================
  // TELEMETRY & STATS
  // ==========================================

  @Get('stats')
  async getStats() {
    return this.billingManagementService.getBillingOverviewStats();
  }

  // ==========================================
  // PLAN MANAGEMENT
  // ==========================================

  @Get('plans')
  async getPlans(@Query('includeInactive') includeInactive?: string) {
    const showAll = includeInactive !== 'false';
    return this.billingManagementService.getAllPlans(showAll);
  }

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.billingManagementService.createPlan(dto);
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    return this.billingManagementService.getPlanById(id);
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.billingManagementService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string) {
    return this.billingManagementService.deletePlan(id);
  }

  // ==========================================
  // RECENT SUBSCRIPTIONS (PAGINATION & FILTERING)
  // ==========================================

  @Get('subscriptions')
  async getSubscriptions(@Query() query: QuerySubscriptionsDto) {
    return this.billingManagementService.getSubscriptions(query);
  }

  @Get('subscriptions/:id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.billingManagementService.getSubscriptionById(id);
  }

  @Patch('subscriptions/:id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionAdminDto,
  ) {
    return this.billingManagementService.updateSubscriptionAdmin(id, dto);
  }

  @Post('subscriptions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('id') id: string,
    @Body('immediate') immediate?: boolean,
  ) {
    return this.billingManagementService.cancelSubscriptionAdmin(id, !!immediate);
  }

  // ==========================================
  // COUPON CODE MANAGEMENT
  // ==========================================

  @Get('coupons')
  async getCoupons(@Query() query: QueryCouponsDto) {
    return this.couponService.getCoupons(query);
  }

  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  async createCoupon(@Body() dto: CreateCouponDto, @Req() req: any) {
    const adminUserId = req?.user?.sub || req?.user?.adminUserId;
    return this.couponService.createCoupon(dto, adminUserId);
  }

  @Get('coupons/:id')
  async getCouponById(@Param('id') id: string) {
    return this.couponService.getCouponById(id);
  }

  @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  @Get('coupons/:id/redemptions')
  async getCouponRedemptions(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.couponService.getCouponRedemptions(id, query);
  }
}
