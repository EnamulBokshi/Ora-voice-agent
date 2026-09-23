import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { METERED_METRIC_KEY } from '../decorators/metered.decorator';
import { RedisService } from '../redis/redis.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';
import { DomainException } from '../exceptions/domain.exception';
import { BillingService } from '../../billing/billing.service';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    @Optional()
    @Inject(forwardRef(() => BillingService))
    private readonly billingService?: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metricKey = this.reflector.getAllAndOverride<string>(
      METERED_METRIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metricKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayloadUser;

    if (!user || !user.businessId) {
      return true;
    }

    const currentPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM
    const redisKey = `usage:${user.businessId}:${currentPeriod}:${metricKey}`;

    const usageCountStr = await this.redisService.getClient().get(redisKey);
    const currentUsage = usageCountStr ? parseInt(usageCountStr, 10) : 0;

    // Dynamic limit lookup based on subscription and plan
    let limit = metricKey === 'conversationMinutes' || metricKey === 'voiceMinutes' ? 150 : 10;

    if (this.billingService) {
      try {
        const { subscription, plan } = await this.billingService.getSubscription(user.businessId);
        const limits: any = subscription?.customLimits || plan?.limits;
        if (limits) {
          if (metricKey === 'conversationMinutes' || metricKey === 'voiceMinutes') {
            limit = limits.voiceMinutes || limits.conversationMinutes || 150;
          } else if (metricKey === 'documentLimit' || metricKey === 'documents') {
            limit = limits.documentLimit || 5;
          } else if (metricKey === 'websiteLimit' || metricKey === 'connectedStores') {
            limit = limits.websiteLimit || limits.connectedStores || 1;
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `[PlanLimitGuard] Failed to fetch subscription limits for business ${user.businessId}: ${err.message}`,
        );
      }
    }

    if (currentUsage >= limit) {
      this.logger.warn(
        `[PlanLimitGuard] Usage limit breached for business ${user.businessId} on metric ${metricKey} (${currentUsage}/${limit})`,
      );
      throw new DomainException(
        'PLAN_LIMIT_EXCEEDED',
        `Plan limit exceeded for '${metricKey}'. Current usage: ${currentUsage}/${limit}. Please upgrade your subscription or contact support.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
