import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SubscriptionGuard } from './subscription.guard';
import { EntitlementService } from '../entitlement/entitlement.service';
import { NO_SUBSCRIPTION_REQUIRED_KEY } from '../decorators/no-subscription-required.decorator';
import { AdminRole } from '../../users/enums/admin-role.enum';

describe('SubscriptionGuard', () => {
  const BUSINESS_ID = '671234567890123456789012';

  let guard: SubscriptionGuard;
  let entitlementService: { assertEntitled: jest.Mock };
  let reflector: Reflector;

  const contextFor = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    }) as any;

  beforeEach(async () => {
    entitlementService = {
      assertEntitled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        Reflector,
        { provide: EntitlementService, useValue: entitlementService },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('checks the entitlement of the tenant on the request', async () => {
    const context = contextFor({
      businessId: BUSINESS_ID,
      user: { businessId: BUSINESS_ID, role: AdminRole.OWNER },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementService.assertEntitled).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it('checks merchant staff as well as the owner', async () => {
    const context = contextFor({
      businessId: BUSINESS_ID,
      user: { businessId: BUSINESS_ID, role: AdminRole.STAFF },
    });

    await guard.canActivate(context);

    expect(entitlementService.assertEntitled).toHaveBeenCalled();
  });

  it('propagates the refusal rather than swallowing it', async () => {
    entitlementService.assertEntitled.mockRejectedValue(
      new Error('SUBSCRIPTION_REQUIRED'),
    );
    const context = contextFor({
      businessId: BUSINESS_ID,
      user: { businessId: BUSINESS_ID, role: AdminRole.OWNER },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'SUBSCRIPTION_REQUIRED',
    );
  });

  it('stands aside on a route marked @NoSubscriptionRequired', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) =>
        key === NO_SUBSCRIPTION_REQUIRED_KEY ? (true as any) : undefined,
      );
    const context = contextFor({
      businessId: BUSINESS_ID,
      user: { businessId: BUSINESS_ID, role: AdminRole.OWNER },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(entitlementService.assertEntitled).not.toHaveBeenCalled();
  });

  it('stands aside when there is no authenticated tenant', async () => {
    // Nothing to charge, and the auth guards own that refusal.
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    expect(entitlementService.assertEntitled).not.toHaveBeenCalled();
  });

  it.each([AdminRole.SUPER_ADMIN, AdminRole.ADMIN])(
    'exempts ORA staff (%s)',
    async (role) => {
      const context = contextFor({
        businessId: BUSINESS_ID,
        user: { businessId: BUSINESS_ID, role },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(entitlementService.assertEntitled).not.toHaveBeenCalled();
    },
  );

  it('does not exempt a machine client, which also carries role admin', async () => {
    // DualAuthGuard stamps `role: 'admin'` on an OAuth machine token, but that
    // credential acts for the merchant and answers for the merchant's plan.
    const context = contextFor({
      businessId: BUSINESS_ID,
      user: {
        businessId: BUSINESS_ID,
        role: AdminRole.ADMIN,
        isMachineClient: true,
      },
    });

    await guard.canActivate(context);

    expect(entitlementService.assertEntitled).toHaveBeenCalledWith(BUSINESS_ID);
  });
});
