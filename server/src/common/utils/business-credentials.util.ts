import { EncryptionUtil } from './encryption.util';

/**
 * Connector credentials (Shopify access tokens, WooCommerce keys, per-store
 * webhook secrets) are encrypted at rest. Values written before encryption was
 * introduced are still plaintext, so reads accept either form and a migration
 * rewrites the stored value.
 */
export class BusinessCredentialsUtil {
  /**
   * Shape of EncryptionUtil output: `<24 hex iv>:<32 hex auth tag>:<hex body>`.
   * Matching it explicitly avoids mangling a plaintext value that happens to
   * contain a colon.
   */
  private static readonly CIPHERTEXT_PATTERN =
    /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/;

  static isEncrypted(value: string): boolean {
    return this.CIPHERTEXT_PATTERN.test(value);
  }

  /** Encrypts a credential, leaving an already-encrypted value untouched. */
  static protect(value: string): string {
    return this.isEncrypted(value) ? value : EncryptionUtil.encrypt(value);
  }

  /** Returns the usable credential, whether it is stored encrypted or not. */
  static reveal(value?: string | null): string | undefined {
    if (!value) return undefined;
    return this.isEncrypted(value) ? EncryptionUtil.decrypt(value) : value;
  }
}
