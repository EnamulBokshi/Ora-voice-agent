import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

import {
  ChargeResult,
  CustomerBillingDetails,
  PaymentProvider,
  ProviderSubscriptionRef,
} from './payment-provider.interface';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { DomainException } from '../../common/exceptions/domain.exception';
import { BusinessCredentialsUtil } from '../../common/utils/business-credentials.util';
import {
  SHOPIFY_API_VERSION,
  SHOPIFY_ERRORS,
  SHOPIFY_PENDING_CHARGE_PREFIX,
  SHOPIFY_PENDING_CHARGE_TTL_SECONDS,
} from '../../shopify/shopify.constants';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Reduces either form of a Shopify charge id to the numeric id.
 *
 * `appSubscriptionCreate` returns `gid://shopify/AppSubscription/123`, while
 * the billing callback's `charge_id` query parameter is the bare `123`. One key
 * space has to hold both.
 */
function normalizeChargeId(chargeId: string): string {
  return (chargeId || '').split('/').pop() || chargeId;
}

interface ShopifySubscriptionResult extends ProviderSubscriptionRef {
  /** Shopify hosts the approval screen; the merchant must be sent to it. */
  confirmationUrl: string;
}

/**
 * Shopify App Billing.
 *
 * Shopify requires recurring charges sold to its merchants to run through
 * `appSubscriptionCreate`, taking a platform cut. A Shopify tenant therefore
 * never reaches Stripe or bKash, and this provider owns none of the renewal
 * schedule: Shopify charges on its own cadence and reports the result back.
 */
@Injectable()
export class ShopifyProvider implements PaymentProvider {
  private readonly logger = new Logger(ShopifyProvider.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Satisfies the shared interface. Callers that need the approval URL — which
   * is every real caller — use `createAppSubscription` instead, because
   * `ProviderSubscriptionRef` has nowhere to carry it.
   */
  async createSubscription(
    businessId: string,
    planId: string,
    customerDetails?: CustomerBillingDetails,
  ): Promise<ProviderSubscriptionRef> {
    const result = await this.createAppSubscription(
      businessId,
      planId,
      undefined,
      customerDetails,
    );
    return { subscriptionId: result.subscriptionId, providerRef: result.providerRef };
  }

  /**
   * Creates the recurring charge and returns Shopify's approval URL. Nothing is
   * billed until the merchant approves it there and Shopify calls back.
   */
  async createAppSubscription(
    businessId: string,
    planId: string,
    returnUrl?: string,
    _customerDetails?: CustomerBillingDetails,
  ): Promise<ShopifySubscriptionResult> {
    const { shopDomain, accessToken } = await this.resolveShopCredentials(businessId);

    const plan = await this.planModel.findOne({ planId } as any).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan ${planId} was not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // The return URL is an API path, so it must be this API's own origin.
    // Shopify's "App URL" is the embedded frontend, which in a split
    // deployment is a different host; sending the merchant there after
    // approving a charge would land them on a 404.
    const apiUrl = (
      this.configService.get<string>('ORA_API_URL') ||
      this.configService.get<string>('SHOPIFY_APP_URL') ||
      ''
    ).replace(/\/$/, '');
    // No plan id in this URL. The callback is unauthenticated and its query
    // string is unsigned, so anything carried here is caller-controlled: a
    // merchant could approve the cheapest charge and return naming the most
    // expensive plan. The plan is recorded in Redis below instead.
    const callbackUrl = returnUrl || `${apiUrl}/api/v1/shopify/billing/callback`;

    // An override has to stay on this API's own origin. Shopify sends the
    // merchant here straight from its approval screen, so an arbitrary host
    // turns that into an open redirect, and it also means the callback never
    // runs — the charge is approved at Shopify while ORA still shows no plan.
    this.assertCallbackOnApiOrigin(callbackUrl, apiUrl);

    const mutation = `
      mutation AppSubscriptionCreate(
        $name: String!
        $lineItems: [AppSubscriptionLineItemInput!]!
        $returnUrl: URL!
        $test: Boolean
      ) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          test: $test
        ) {
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }
    `;

    const variables = {
      name: plan.name,
      returnUrl: callbackUrl,
      // A non-production deployment must not create real charges on a live shop.
      test: this.configService.get<string>('NODE_ENV') !== 'production',
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: (plan.priceUsdCents / 100).toFixed(2),
                currencyCode: 'USD',
              },
              interval:
                plan.billingInterval === 'year' ? 'ANNUAL' : 'EVERY_30_DAYS',
            },
          },
        },
      ],
    };

    const payload = await this.graphql(shopDomain, accessToken, mutation, variables);
    const result = (payload as any)?.data?.appSubscriptionCreate;

    if (!result || result.userErrors?.length) {
      const message =
        result?.userErrors?.map((e: any) => e.message).join('; ') ||
        'Shopify returned no subscription.';
      this.logger.error(
        `[ShopifyProvider] appSubscriptionCreate failed for ${shopDomain}: ${message}`,
      );
      throw new DomainException(
        SHOPIFY_ERRORS.BILLING_ERROR,
        message,
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Record which plan this charge is for, keyed by the numeric id Shopify
    // puts in the callback's `charge_id`. The business id is stored with it so
    // the callback can refuse a charge belonging to another tenant.
    await this.recordPendingCharge(
      result.appSubscription.id,
      businessId,
      planId,
    );

    return {
      subscriptionId: result.appSubscription.id,
      providerRef: result.appSubscription.id,
      confirmationUrl: result.confirmationUrl,
    };
  }

  /** Rejects a return URL that does not point at this API's own origin. */
  private assertCallbackOnApiOrigin(callbackUrl: string, apiUrl: string): void {
    if (!apiUrl) return;

    let callbackOrigin: string;
    let apiOrigin: string;
    try {
      callbackOrigin = new URL(callbackUrl).origin;
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      throw new DomainException(
        SHOPIFY_ERRORS.BILLING_ERROR,
        'The billing return URL is not a valid absolute URL.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (callbackOrigin !== apiOrigin) {
      throw new DomainException(
        SHOPIFY_ERRORS.BILLING_ERROR,
        'The billing return URL must be on this API origin.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Stores the plan a charge was created for.
   *
   * A failure here must not fail the subscription: the merchant is already on
   * their way to Shopify's approval screen. The callback treats a missing
   * record as "plan unknown" and leaves the stored plan alone.
   */
  private async recordPendingCharge(
    chargeGid: string,
    businessId: string,
    planId: string,
  ): Promise<void> {
    const key = `${SHOPIFY_PENDING_CHARGE_PREFIX}${normalizeChargeId(chargeGid)}`;
    try {
      await this.redisService
        .getClient()
        .set(
          key,
          JSON.stringify({ businessId, planId }),
          'EX',
          SHOPIFY_PENDING_CHARGE_TTL_SECONDS,
        );
    } catch (err: any) {
      this.logger.error(
        `[ShopifyProvider] Could not record the plan for charge ${chargeGid}: ${err.message}. The callback will not be able to set a plan.`,
      );
    }
  }

  /**
   * Returns the plan a charge was created for, or null when the charge is
   * unknown, expired, or belongs to a different business.
   *
   * The tenant check is the point. The callback resolves its business from an
   * unsigned `shop` query parameter, so without it a caller could name a
   * victim's shop alongside a charge id of their own and move the victim onto
   * a plan they did not buy.
   */
  async resolvePendingChargePlan(
    chargeId: string,
    businessId: string,
  ): Promise<string | null> {
    const key = `${SHOPIFY_PENDING_CHARGE_PREFIX}${normalizeChargeId(chargeId)}`;

    let raw: string | null = null;
    try {
      raw = await this.redisService.getClient().get(key);
    } catch (err: any) {
      this.logger.error(
        `[ShopifyProvider] Could not read the recorded plan for charge ${chargeId}: ${err.message}`,
      );
      return null;
    }

    if (!raw) {
      this.logger.warn(
        `[ShopifyProvider] No recorded plan for charge ${chargeId}; the stored plan is left unchanged.`,
      );
      return null;
    }

    let record: { businessId?: string; planId?: string };
    try {
      record = JSON.parse(raw);
    } catch {
      this.logger.error(
        `[ShopifyProvider] The recorded plan for charge ${chargeId} is not readable JSON.`,
      );
      return null;
    }

    if (record.businessId !== businessId) {
      this.logger.error(
        `[ShopifyProvider] Charge ${chargeId} was created for business ${record.businessId}, but the callback resolved business ${businessId}. Refusing to apply a plan.`,
      );
      return null;
    }

    return record.planId || null;
  }

  async cancelSubscription(ref: ProviderSubscriptionRef): Promise<void> {
    const businessId = ref.subscriptionId;
    const chargeId = ref.providerRef;
    if (!chargeId) {
      this.logger.warn(
        '[ShopifyProvider] Cancellation skipped: no Shopify charge id on the subscription.',
      );
      return;
    }

    const { shopDomain, accessToken } =
      await this.resolveShopCredentials(businessId);

    const mutation = `
      mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription { id status }
          userErrors { field message }
        }
      }
    `;

    await this.graphql(shopDomain, accessToken, mutation, { id: chargeId });
    this.logger.log(
      `[ShopifyProvider] Cancelled Shopify subscription ${chargeId} for ${shopDomain}.`,
    );
  }

  /**
   * Shopify charges recurring subscriptions itself, so ORA never initiates a
   * renewal for a Shopify tenant. Reported as a no-op success so a scheduler
   * that reaches this provider by mistake does not mark the account past due.
   */
  async chargeRenewal(_ref: ProviderSubscriptionRef): Promise<ChargeResult> {
    return {
      success: true,
      errorMessage: 'Shopify bills its own recurring charges; no action taken.',
    };
  }

  /**
   * Shopify signs billing webhooks the same way it signs every other webhook:
   * base64 HMAC-SHA256 of the raw body under the app secret.
   */
  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean {
    const secret = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!secret) {
      this.logger.error(
        '[ShopifyProvider] SHOPIFY_API_SECRET is not configured, so no billing webhook can be verified.',
      );
      return false;
    }

    const provided =
      headers['x-shopify-hmac-sha256'] || headers['X-Shopify-Hmac-Sha256'];
    if (!provided) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);

    // timingSafeEqual throws RangeError on a length mismatch.
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  async handleWebhookEvent(payload: unknown): Promise<void> {
    this.logger.log(
      `[ShopifyProvider] Billing webhook received: ${JSON.stringify(
        (payload as any)?.app_subscription?.status || 'unknown status',
      )}`,
    );
  }

  /** Reads a subscription's current status straight from Shopify. */
  async fetchSubscriptionStatus(
    businessId: string,
    chargeId: string,
  ): Promise<string | null> {
    const { shopDomain, accessToken } =
      await this.resolveShopCredentials(businessId);

    const query = `
      query AppSubscription($id: ID!) {
        node(id: $id) {
          ... on AppSubscription { id status }
        }
      }
    `;

    const payload = await this.graphql(shopDomain, accessToken, query, {
      id: chargeId,
    });

    return (payload as any)?.data?.node?.status || null;
  }

  /**
   * Fallback plan lookup, asked of Shopify rather than of ORA's own record.
   *
   * The Redis record is the primary source, but it can be gone — evicted, or
   * lost with the instance — and the callback must not then fall back to the
   * query string. Shopify stores the subscription under the plan's name, which
   * `createAppSubscription` set, so the name it reports maps back to a plan and
   * cannot be influenced by whoever called the callback.
   */
  async resolvePlanFromShopifyCharge(
    businessId: string,
    chargeGid: string,
  ): Promise<string | null> {
    let name: string | null = null;
    try {
      const { shopDomain, accessToken } =
        await this.resolveShopCredentials(businessId);

      const query = `
        query AppSubscriptionName($id: ID!) {
          node(id: $id) {
            ... on AppSubscription { id name }
          }
        }
      `;

      const payload = await this.graphql(shopDomain, accessToken, query, {
        id: chargeGid,
      });
      name = (payload as any)?.data?.node?.name || null;
    } catch (err: any) {
      this.logger.error(
        `[ShopifyProvider] Could not read the plan name of charge ${chargeGid} from Shopify: ${err.message}`,
      );
      return null;
    }

    if (!name) return null;

    const plan = await this.planModel.findOne({ name } as any).exec();
    if (!plan) {
      this.logger.warn(
        `[ShopifyProvider] Shopify reports charge ${chargeGid} as plan '${name}', which matches no ORA plan.`,
      );
      return null;
    }

    return (plan as any).planId || null;
  }

  private async resolveShopCredentials(
    businessId: string,
  ): Promise<{ shopDomain: string; accessToken: string }> {
    const business = await this.businessModel
      .findById(businessId)
      .select('+shopifyAccessToken')
      .exec();

    const accessToken = BusinessCredentialsUtil.reveal(
      business?.shopifyAccessToken,
    );
    const shopDomain = business?.shopifyShopDomain;

    if (!shopDomain || !accessToken) {
      throw new DomainException(
        SHOPIFY_ERRORS.SHOP_NOT_INSTALLED,
        'This business has no connected Shopify store.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { shopDomain, accessToken };
  }

  private async graphql(
    shopDomain: string,
    accessToken: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      },
    );

    if (!response.ok) {
      throw new DomainException(
        SHOPIFY_ERRORS.BILLING_ERROR,
        `Shopify GraphQL returned HTTP ${response.status}.`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }
}
