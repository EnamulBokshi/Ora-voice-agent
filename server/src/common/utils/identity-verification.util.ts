import * as crypto from 'crypto';

export class IdentityVerificationUtil {
  /**
   * Generates an HMAC-SHA256 signature for a customer token (used by merchant backends / SDK).
   */
  static generateCustomerToken(
    merchantSecret: string,
    customerId: string,
    timestamp: number = Date.now(),
  ): { customerId: string; timestamp: number; signature: string } {
    const payload = `${customerId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', merchantSecret)
      .update(payload)
      .digest('hex');

    return {
      customerId,
      timestamp,
      signature,
    };
  }

  /**
   * Verifies an HMAC-SHA256 customer token signature with replay prevention.
   *
   * @param merchantSecret The business's provisioned apiSecret
   * @param customerId The claimed merchant customer ID
   * @param timestamp Epoch millisecond timestamp of token creation
   * @param providedSignature Hex-encoded HMAC-SHA256 signature
   * @param maxAgeMs Maximum allowed token age in milliseconds (default: 15 minutes)
   */
  static verifyCustomerToken(
    merchantSecret: string,
    customerId: string,
    timestamp: number,
    providedSignature: string,
    maxAgeMs = 15 * 60 * 1000,
  ): boolean {
    if (!merchantSecret || !customerId || !timestamp || !providedSignature) {
      return false;
    }

    // 1. Replay attack prevention: check timestamp freshness
    const now = Date.now();
    if (now - timestamp > maxAgeMs || timestamp > now + 60 * 1000) {
      // Reject if older than maxAgeMs or skewed >1 min into future
      return false;
    }

    // 2. Compute expected HMAC signature
    const payload = `${customerId}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', merchantSecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    // 3. Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }
}
