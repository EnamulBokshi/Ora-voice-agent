import { BusinessCredentialsUtil } from './business-credentials.util';
import { EncryptionUtil } from './encryption.util';

describe('BusinessCredentialsUtil', () => {
  const token = 'shpat_9f8e7d6c5b4a39281706';

  it('encrypts a plaintext credential', () => {
    const protected_ = BusinessCredentialsUtil.protect(token);
    expect(protected_).not.toBe(token);
    expect(BusinessCredentialsUtil.isEncrypted(protected_)).toBe(true);
    expect(BusinessCredentialsUtil.reveal(protected_)).toBe(token);
  });

  it('leaves an already-encrypted value untouched', () => {
    const once = BusinessCredentialsUtil.protect(token);
    expect(BusinessCredentialsUtil.protect(once)).toBe(once);
  });

  it('reads a value stored before encryption was introduced', () => {
    expect(BusinessCredentialsUtil.reveal(token)).toBe(token);
  });

  it('does not mistake a plaintext value containing a colon for ciphertext', () => {
    const withColon = 'ck_abc:cs_def';
    expect(BusinessCredentialsUtil.isEncrypted(withColon)).toBe(false);
    expect(BusinessCredentialsUtil.reveal(withColon)).toBe(withColon);
  });

  it('returns undefined for an absent credential', () => {
    expect(BusinessCredentialsUtil.reveal(undefined)).toBeUndefined();
    expect(BusinessCredentialsUtil.reveal(null)).toBeUndefined();
    expect(BusinessCredentialsUtil.reveal('')).toBeUndefined();
  });

  it('recognises the EncryptionUtil output shape', () => {
    expect(
      BusinessCredentialsUtil.isEncrypted(EncryptionUtil.encrypt(token)),
    ).toBe(true);
  });
});
