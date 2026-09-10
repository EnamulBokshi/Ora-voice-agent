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
} from '../../shopify/shopify.constants';

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
    const callbackUrl =
      returnUrl || `${apiUrl}/api/v1/shopify/billing/callback`;

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

    return {
      subscriptionId: result.appSubscription.id,
      providerRef: result.appSubscription.id,
      confirmationUrl: result.confirmationUrl,
    };
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
