import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { METERED_METRIC_KEY } from '../decorators/metered.decorator';
import { RedisService } from '../redis/redis.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';
import { DomainException } from '../exceptions/domain.exception';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
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

    // Hard limit default fallback checks (Free tier: 100 mins, 20 orders)
    const limit = metricKey === 'conversationMinutes' ? 100 : metricKey === 'ordersPerMonth' ? 20 : 10;

    if (currentUsage >= limit) {
      this.logger.warn(
        `[PlanLimitGuard] Usage limit breached for business ${user.businessId} on metric ${metricKey} (${currentUsage}/${limit})`,
      );
      throw new DomainException(
        'PLAN_LIMIT_EXCEEDED',
        `Plan limit exceeded for '${metricKey}'. Current usage: ${currentUsage}/${limit}. Please upgrade your subscription.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
