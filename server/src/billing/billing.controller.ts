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
import { StripeProvider } from './providers/stripe.provider';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly stripeProvider: StripeProvider,
  ) {}

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard)
  @Get('subscription')
  async getSubscription(@CurrentUser() user: JwtPayloadUser) {
    return this.billingService.getSubscription(user.businessId);
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SubscribeDto,
  ) {
    return this.billingService.subscribe(user.businessId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any, 'admin' as any)
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
  @Roles('owner' as any, 'admin' as any)
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
    const rawBody = req.body;
    const isValid = this.stripeProvider.verifyWebhookSignature(rawBody, headers);
    if (isValid) {
      await this.stripeProvider.handleWebhookEvent(rawBody);
    }
    return { received: true };
  }
}
