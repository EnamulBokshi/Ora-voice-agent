import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  ProviderSubscriptionRef,
  ChargeResult,
  CustomerBillingDetails,
} from './payment-provider.interface';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class BkashProvider implements PaymentProvider {
  private readonly logger = new Logger(BkashProvider.name);
  private idToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {}

  private get appKey(): string {
    return this.configService.get<string>('BKASH_APP_KEY') || '';
  }

  private get appSecret(): string {
    return this.configService.get<string>('BKASH_APP_SECRET') || '';
  }

  private get username(): string {
    return this.configService.get<string>('BKASH_USERNAME') || '';
  }

  private get password(): string {
    return this.configService.get<string>('BKASH_PASSWORD') || '';
  }

  private get baseUrl(): string {
    return (
      this.configService.get<string>('BKASH_BASE_URL') ||
      'https://tokenized.pay.bka.sh/v1.2.0-beta'
    );
  }

  /**
   * Fetches or refreshes bKash Bearer ID Token using Grant Token API
   */
  async getGrantToken(): Promise<string> {
    if (this.idToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.idToken;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/tokenized/checkout/token/grant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            username: this.username,
            password: this.password,
          },
          body: JSON.stringify({
            app_key: this.appKey,
            app_secret: this.appSecret,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.statusCode !== '0000' || !data.id_token) {
        this.logger.error(
          `[BkashProvider] Grant token error: ${JSON.stringify(data)}`,
        );
        throw new DomainException(
          'BKASH_AUTH_ERROR',
          `bKash Grant Token failed: ${data.statusMessage || 'Unknown error'}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      this.idToken = data.id_token;
      const expiresInMs = (parseInt(data.expires_in, 10) || 3600) * 1000;
      this.tokenExpiresAt = Date.now() + expiresInMs;

      this.logger.log('[BkashProvider] Grant token acquired successfully.');
      return this.idToken!;
    } catch (err: any) {
      if (err instanceof DomainException) throw err;
      this.logger.error(`[BkashProvider] Grant token exception: ${err.message}`);
      throw new DomainException(
        'BKASH_AUTH_ERROR',
        `bKash Grant Token request failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Creates a bKash Tokenized Checkout Agreement
   */
  async createAgreement(
    businessId: string,
    callbackUrl: string,
  ): Promise<{ paymentID: string; bkashURL: string }> {
    const token = await this.getGrantToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/tokenized/checkout/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
            'x-app-key': this.appKey,
          },
          body: JSON.stringify({
            mode: '0000',
            payerReference: businessId,
            callbackURL: callbackUrl,
            amount: '1',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `AGR-${Date.now()}`,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.statusCode !== '0000') {
        this.logger.error(
          `[BkashProvider] Create agreement error: ${JSON.stringify(data)}`,
        );
        throw new DomainException(
          'BKASH_AGREEMENT_ERROR',
          `bKash Create Agreement failed: ${data.statusMessage || 'Unknown error'}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        paymentID: data.paymentID,
        bkashURL: data.bkashURL,
      };
    } catch (err: any) {
      if (err instanceof DomainException) throw err;
      throw new DomainException(
        'BKASH_AGREEMENT_ERROR',
        `bKash Create Agreement request failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Executes a bKash Tokenized Checkout Agreement after user authorization
   */
  async executeAgreement(
    paymentID: string,
  ): Promise<{ agreementID: string; payerReference?: string }> {
    const token = await this.getGrantToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/tokenized/checkout/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
            'x-app-key': this.appKey,
          },
          body: JSON.stringify({ paymentID }),
        },
      );

      const data = await response.json();

      if (!response.ok || data.statusCode !== '0000') {
        this.logger.error(
          `[BkashProvider] Execute agreement error: ${JSON.stringify(data)}`,
        );
        throw new DomainException(
          'BKASH_AGREEMENT_EXECUTE_ERROR',
          `bKash Execute Agreement failed: ${data.statusMessage || 'Unknown error'}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        agreementID: data.agreementID,
        payerReference: data.payerReference,
      };
    } catch (err: any) {
      if (err instanceof DomainException) throw err;
      throw new DomainException(
        'BKASH_AGREEMENT_EXECUTE_ERROR',
        `bKash Execute Agreement request failed: ${err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Executes a tokenized payment using an established agreementID
   */
  async executePaymentWithAgreement(
    agreementID: string,
    amount: number,
    merchantInvoiceNumber: string,
    payerReference?: string,
  ): Promise<{ paymentID: string; trxID: string; amount: number }> {
    const token = await this.getGrantToken();
    const amountStr = amount.toFixed(2);

    // Step 1: Create Payment with Agreement
    const createRes = await fetch(
      `${this.baseUrl}/tokenized/checkout/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: token,
          'x-app-key': this.appKey,
        },
        body: JSON.stringify({
          mode: '0001',
          payerReference: payerReference || 'ORA_MERCHANT',
          agreementID,
          amount: amountStr,
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber,
        }),
      },
    );

    const createData = await createRes.json();
    if (!createRes.ok || createData.statusCode !== '0000') {
      this.logger.error(
        `[BkashProvider] Create payment error: ${JSON.stringify(createData)}`,
      );
      throw new DomainException(
        'BKASH_PAYMENT_ERROR',
        `bKash Create Payment failed: ${createData.statusMessage || 'Unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const paymentID = createData.paymentID;

    // Step 2: Execute Payment
    const executeRes = await fetch(
      `${this.baseUrl}/tokenized/checkout/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: token,
          'x-app-key': this.appKey,
        },
        body: JSON.stringify({ paymentID }),
      },
    );

    const executeData = await executeRes.json();
    if (!executeRes.ok || executeData.statusCode !== '0000') {
      this.logger.error(
        `[BkashProvider] Execute payment error: ${JSON.stringify(executeData)}`,
      );
      throw new DomainException(
        'BKASH_PAYMENT_EXECUTE_ERROR',
        `bKash Execute Payment failed: ${executeData.statusMessage || 'Unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      paymentID: executeData.paymentID,
      trxID: executeData.trxID,
      amount: parseFloat(executeData.amount || amountStr),
    };
  }

  async createSubscription(
    businessId: string,
    planId: string,
    customerDetails?: CustomerBillingDetails,
  ): Promise<ProviderSubscriptionRef> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      (this.configService.get<string>('NODE_ENV') === 'production'
        ? 'https://tryora.live'
        : 'http://localhost:3000');
    const callbackUrl = `${frontendUrl}/billing/bkash/callback?planId=${planId}`;

    const agreement = await this.createAgreement(businessId, callbackUrl);

    return {
      subscriptionId: agreement.paymentID,
      providerRef: JSON.stringify({
        paymentID: agreement.paymentID,
        bkashURL: agreement.bkashURL,
        status: 'PENDING_AGREEMENT_AUTHORIZATION',
      }),
    };
  }

  async cancelSubscription(ref: ProviderSubscriptionRef): Promise<void> {
    if (!ref.providerRef) return;

    let agreementID = ref.providerRef;
    if (agreementID.startsWith('{')) {
      try {
        const parsed = JSON.parse(agreementID);
        agreementID = parsed.agreementID || '';
      } catch {
        // ignore parse error
      }
    }

    if (!agreementID) return;

    const token = await this.getGrantToken();
    try {
      const response = await fetch(
        `${this.baseUrl}/tokenized/checkout/agreement/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: token,
            'x-app-key': this.appKey,
          },
          body: JSON.stringify({ agreementID }),
        },
      );

      const data = await response.json();
      this.logger.log(
        `[BkashProvider] Cancel agreement status for ${agreementID}: ${data.statusMessage}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[BkashProvider] Failed to cancel bKash agreement ${agreementID}: ${err.message}`,
      );
    }
  }

  async chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult> {
    if (!ref.providerRef) {
      return {
        success: false,
        errorMessage: 'No bKash agreementID provided for renewal charge.',
      };
    }

    let agreementID = ref.providerRef;
    if (agreementID.startsWith('{')) {
      try {
        const parsed = JSON.parse(agreementID);
        agreementID = parsed.agreementID || '';
      } catch {
        // use raw string
      }
    }

    if (!agreementID) {
      return {
        success: false,
        errorMessage: 'Invalid bKash agreementID.',
      };
    }

    try {
      const invoiceNumber = `REN-${Date.now()}`;
      const renewalAmount = 5500.0;
      const res = await this.executePaymentWithAgreement(
        agreementID,
        renewalAmount,
        invoiceNumber,
      );

      return {
        success: true,
        transactionId: res.trxID,
        amount: res.amount,
        currency: 'BDT',
      };
    } catch (err: any) {
      this.logger.error(`[BkashProvider] Charge renewal failed: ${err.message}`);
      return {
        success: false,
        errorMessage: err.message,
      };
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean {
    return true;
  }

  async handleWebhookEvent(payload: unknown): Promise<void> {
    this.logger.log(`[BkashProvider] handleWebhookEvent received:`, payload);
  }
}
