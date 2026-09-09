import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly DEV_KEY = 'ora-aes-256-secret-key-32bytes!';
  private static warnedAboutDevKey = false;

  /**
   * A shipped default key encrypts nothing from anyone who has the source, so
   * production refuses to run without ENCRYPTION_SECRET. Local development
   * keeps the default and says so once.
   */
  private static resolveSecret(): string {
    const configured = process.env.ENCRYPTION_SECRET;
    if (configured) return configured;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_SECRET is not set. Refusing to encrypt or decrypt data at rest with the development key.',
      );
    }

    if (!this.warnedAboutDevKey) {
      this.warnedAboutDevKey = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[EncryptionUtil] ENCRYPTION_SECRET is not set; using the development key. Never do this outside local development.',
      );
    }

    return this.DEV_KEY;
  }

  private static getKey(): Buffer {
    return crypto.scryptSync(this.resolveSecret(), 'ora-salt', 32);
  }

  static encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  static decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.includes(':')) return cipherText;
    try {
      const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
      if (!ivHex || !authTagHex || !encryptedHex) return cipherText;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getKey(), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return cipherText;
    }
  }
}
