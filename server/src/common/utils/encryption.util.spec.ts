import { EncryptionUtil } from './encryption.util';

describe('EncryptionUtil', () => {
  it('should encrypt and decrypt string accurately', () => {
    const plainText = 'customer@example.com';
    const encrypted = EncryptionUtil.encrypt(plainText);

    expect(encrypted).not.toBe(plainText);
    expect(encrypted).toContain(':');

    const decrypted = EncryptionUtil.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should handle empty or null values gracefully', () => {
    expect(EncryptionUtil.encrypt('')).toBe('');
    expect(EncryptionUtil.decrypt('')).toBe('');
  });

  describe('production key requirement', () => {
    const originalSecret = process.env.ENCRYPTION_SECRET;
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      if (originalSecret === undefined) {
        delete process.env.ENCRYPTION_SECRET;
      } else {
        process.env.ENCRYPTION_SECRET = originalSecret;
      }
      process.env.NODE_ENV = originalEnv;
    });

    it('refuses to use the development key in production', () => {
      delete process.env.ENCRYPTION_SECRET;
      process.env.NODE_ENV = 'production';

      expect(() => EncryptionUtil.encrypt('secret value')).toThrow(
        /ENCRYPTION_SECRET is not set/,
      );
    });

    it('uses a configured secret in production', () => {
      process.env.ENCRYPTION_SECRET = 'a_real_production_secret';
      process.env.NODE_ENV = 'production';

      const cipherText = EncryptionUtil.encrypt('secret value');
      expect(EncryptionUtil.decrypt(cipherText)).toBe('secret value');
    });
  });
});
