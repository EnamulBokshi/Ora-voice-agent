import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { ValidateCouponDto } from './dto/coupon.dto';
import { CouponService } from './services/coupon.service';
import { StripeProvider } from './providers/stripe.provider';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

import { AdminRole } from '../users/enums/admin-role.enum';
import { NoSubscriptionRequired } from '../common/decorators/no-subscription-required.decorator';

/**
 * Plans, checkout and subscription state must stay reachable for a tenant
 * that has no plan yet — that is how it buys one.
 */
@NoSubscriptionRequired()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly stripeProvider: StripeProvider,
    private readonly couponService: CouponService,
  ) {}

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('payment-methods')
  async getPaymentMethods() {
    return this.billingService.getPaymentMethods();
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard)
  @Get('subscription')
  async getSubscription(@CurrentUser() user: JwtPayloadUser) {
    return this.billingService.getSubscription(user.businessId);
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.USER, AdminRole.OWNER, AdminRole.ADMIN)
  @Post('start-trial')
  @HttpCode(HttpStatus.OK)
  async startTrial(
    @CurrentUser() user: JwtPayloadUser,
    @Body() body: { websiteDomain: string; planId?: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || undefined;
    return this.billingService.startFreeTrial(
      user.businessId,
      body.websiteDomain,
      ip,
      {
        email: user.email,
        userId: user.sub,
      },
      body.planId,
    );
  }

  /**
   * Prices a coupon for the caller's own tenant. The response carries amounts the
   * server computed; it is a preview only, and subscribe revalidates from scratch.
   */
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.USER, AdminRole.OWNER, AdminRole.ADMIN)
  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.billingService.previewCoupon(user.businessId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.USER, AdminRole.OWNER, AdminRole.ADMIN)
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.billingService.subscribe(user.businessId, dto, {
      email: user.email,
      userId: user.sub,
    });
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.USER, AdminRole.OWNER, AdminRole.ADMIN)
  @Post('bkash/execute-agreement')
  @HttpCode(HttpStatus.OK)
  async executeBkashAgreement(
    @CurrentUser() user: JwtPayloadUser,
    @Body() body: { paymentID: string; planId?: string },
  ) {
    return this.billingService.executeBkashAgreement(
      user.businessId,
      body.paymentID,
      body.planId,
    );
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('process-renewals')
  @HttpCode(HttpStatus.OK)
  async processRenewals() {
    return this.billingService.processBkashRenewals();
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: JwtPayloadUser) {
    return this.billingService.cancelSubscription(user.businessId);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = (req as any).rawBody || req.body;
    const event = this.stripeProvider.constructWebhookEvent(rawBody, headers, req.body);
    if (event) {
      await this.billingService.handleStripeWebhookEvent(event);
    }
    return { received: true };
  }
}
