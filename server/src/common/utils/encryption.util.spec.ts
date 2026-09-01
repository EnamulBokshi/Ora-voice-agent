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
});
