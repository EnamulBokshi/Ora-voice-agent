import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { EntitlementService } from '../entitlement/entitlement.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';
import { NO_SUBSCRIPTION_REQUIRED_KEY } from '../decorators/no-subscription-required.decorator';
import { AdminRole } from '../../users/enums/admin-role.enum';

/**
 * Requires an active subscription for the caller's tenant.
 *
 * Runs after JwtAuthGuard and TenantScopeGuard, which is what puts a
 * `businessId` on the request. With no authenticated tenant there is nothing to
 * charge and nothing to check, so the guard stands aside and leaves that
 * decision to the auth guards.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const exempt = this.reflector.getAllAndOverride<boolean>(
      NO_SUBSCRIPTION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (exempt) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayloadUser | undefined;
    const businessId = request.businessId || user?.businessId;

    if (!businessId) return true;

    // ORA's own staff are not part of the tenant's billing relationship. A
    // machine client is: DualAuthGuard stamps `role: 'admin'` on an OAuth
    // machine token, and that credential acts for the merchant, so it must not
    // reach the product on an unpaid tenant.
    const isOraStaff =
      user?.role === AdminRole.SUPER_ADMIN ||
      (user?.role === AdminRole.ADMIN && !(user as any)?.isMachineClient);

    if (isOraStaff) return true;

    await this.entitlementService.assertEntitled(businessId);
    return true;
  }
}
