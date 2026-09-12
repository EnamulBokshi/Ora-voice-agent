import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from '../../billing/schemas/subscription.schema';
import { DomainException } from '../exceptions/domain.exception';
import { RedisService } from '../redis/redis.service';

/** Subscription states that entitle a tenant to the product. */
const ENTITLED_SUBSCRIPTION_STATES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

/**
 * How long an entitlement decision is cached.
 *
 * Short on purpose. It exists to keep a per-request check off the database on a
 * chatty dashboard, not to hold state: a billing change invalidates the key
 * outright, and a minute bounds anything that changes the row without going
 * through billing — an admin suspending a tenant, for instance.
 */
const ENTITLEMENT_CACHE_TTL_SECONDS = 60;

const ENTITLEMENT_CACHE_PREFIX = 'entitlement:';

export const ENTITLEMENT_ERRORS = {
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
} as const;

interface EntitlementDecision {
  entitled: boolean;
  code?: string;
  message?: string;
}

/**
 * Decides whether a tenant may use the product.
 *
 * This exists because the plan gate used to live only in the embedded UI: a
 * Shopify merchant who never approved a charge still held a valid ORA session
 * token — `POST /shopify/session` issues one at install — and could call the
 * API directly. A paywall that only renders is a suggestion.
 *
 * Scope is deliberately narrow. A tenant with no `shopifyShopDomain` is left
 * exactly as it was: web signups reach billing through a different flow, some
 * sit on a free plan, and some have no subscription document at all. Widening
 * this to them is a product decision, not a security fix, and it would lock
 * existing merchants out of their own dashboards.
 *
 * Provided by a @Global module so guards in any feature module can inject it
 * without that module registering the Business and Subscription schemas.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly redisService: RedisService,
  ) {}

  /** Throws when the tenant is not entitled. Returns nothing when it is. */
  async assertEntitled(businessId: string): Promise<void> {
    const decision = await this.decide(businessId);
    if (decision.entitled) return;

    throw new DomainException(
      decision.code || ENTITLEMENT_ERRORS.SUBSCRIPTION_REQUIRED,
      decision.message || 'This store has no active ORA subscription.',
      // 402 rather than 403: the client distinguishes "buy a plan" from "you
      // may not do this", and the embedded app renders its plan picker on it.
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async decide(businessId: string): Promise<EntitlementDecision> {
    const cached = await this.readCache(businessId);
    if (cached) return cached;

    const decision = await this.evaluate(businessId);
    await this.writeCache(businessId, decision);
    return decision;
  }

  /** Drops a cached decision. Call after any change to billing state. */
  async invalidate(businessId: string): Promise<void> {
    try {
      await this.redisService
        .getClient()
        .del(`${ENTITLEMENT_CACHE_PREFIX}${businessId}`);
    } catch (err: any) {
      // The TTL bounds the staleness, so a failed delete is not worth failing
      // the billing write that triggered it.
      this.logger.warn(
        `[EntitlementService] Could not invalidate the entitlement cache for ${businessId}: ${err.message}`,
      );
    }
  }

  private async evaluate(businessId: string): Promise<EntitlementDecision> {
    const business = await this.businessModel
      .findById(businessId)
      .select('status shopifyShopDomain')
      .lean()
      .exec();

    if (!business) {
      // Not this guard's call to make. A missing tenant is an authentication
      // problem, and the tenant-scope guard and the services below report it.
      return { entitled: true };
    }

    // Non-Shopify tenants keep today's behavior exactly.
    if (!business.shopifyShopDomain) {
      return { entitled: true };
    }

    if (business.status !== 'active') {
      return {
        entitled: false,
        code: ENTITLEMENT_ERRORS.TENANT_SUSPENDED,
        message:
          business.status === 'suspended'
            ? 'This store is suspended. Reinstall the ORA app from Shopify, or resolve the billing issue on the charge, to restore access.'
            : 'This store is not active yet.',
      };
    }

    const subscription = await this.subscriptionModel
      .findOne({ businessId: businessId as any })
      .select('status')
      .lean()
      .exec();

    if (!subscription) {
      return {
        entitled: false,
        code: ENTITLEMENT_ERRORS.SUBSCRIPTION_REQUIRED,
        message: 'Choose an ORA plan to start using your voice agent.',
      };
    }

    if (!ENTITLED_SUBSCRIPTION_STATES.includes(subscription.status)) {
      return {
        entitled: false,
        code: ENTITLEMENT_ERRORS.SUBSCRIPTION_REQUIRED,
        message: `This store's ORA subscription is ${subscription.status}. Approve a charge in Shopify to restore access.`,
      };
    }

    return { entitled: true };
  }

  private async readCache(
    businessId: string,
  ): Promise<EntitlementDecision | null> {
    try {
      const raw = await this.redisService
        .getClient()
        .get(`${ENTITLEMENT_CACHE_PREFIX}${businessId}`);
      return raw ? (JSON.parse(raw) as EntitlementDecision) : null;
    } catch {
      // Redis being unreachable must not decide entitlement either way; fall
      // through to the database.
      return null;
    }
  }

  private async writeCache(
    businessId: string,
    decision: EntitlementDecision,
  ): Promise<void> {
    try {
      await this.redisService
        .getClient()
        .set(
          `${ENTITLEMENT_CACHE_PREFIX}${businessId}`,
          JSON.stringify(decision),
          'EX',
          ENTITLEMENT_CACHE_TTL_SECONDS,
        );
    } catch {
      // Caching is an optimization. A miss costs two indexed reads.
    }
  }
}
