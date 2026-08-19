import { IdentityVerificationUtil } from './identity-verification.util';

describe('IdentityVerificationUtil', () => {
  const secret = 'test_merchant_secret_12345';
  const customerId = 'cust_shopify_98765';

  it('should generate and successfully verify a valid HMAC customer token', () => {
    const now = Date.now();
    const token = IdentityVerificationUtil.generateCustomerToken(secret, customerId, now);

    expect(token.customerId).toBe(customerId);
    expect(token.timestamp).toBe(now);
    expect(typeof token.signature).toBe('string');

    const isValid = IdentityVerificationUtil.verifyCustomerToken(
      secret,
      customerId,
      token.timestamp,
      token.signature,
    );

    expect(isValid).toBe(true);
  });

  it('should reject a token with wrong customerId', () => {
    const now = Date.now();
    const token = IdentityVerificationUtil.generateCustomerToken(secret, customerId, now);

    const isValid = IdentityVerificationUtil.verifyCustomerToken(
      secret,
      'tampered_cust_id',
      token.timestamp,
      token.signature,
    );

    expect(isValid).toBe(false);
  });

  it('should reject a token with wrong secret', () => {
    const now = Date.now();
    const token = IdentityVerificationUtil.generateCustomerToken(secret, customerId, now);

    const isValid = IdentityVerificationUtil.verifyCustomerToken(
      'wrong_secret',
      customerId,
      token.timestamp,
      token.signature,
    );

    expect(isValid).toBe(false);
  });

  it('should reject an expired token (>15 minutes old)', () => {
    const expiredTimestamp = Date.now() - 16 * 60 * 1000;
    const token = IdentityVerificationUtil.generateCustomerToken(
      secret,
      customerId,
      expiredTimestamp,
    );

    const isValid = IdentityVerificationUtil.verifyCustomerToken(
      secret,
      customerId,
      token.timestamp,
      token.signature,
    );

    expect(isValid).toBe(false);
  });
});
