import { ApiKeyUtil } from './api-key.util';

describe('ApiKeyUtil', () => {
  it('generates a key in the ora_sk_live_ format', () => {
    const key = ApiKeyUtil.generateSecretKey();
    expect(key).toMatch(/^ora_sk_live_[0-9a-f]{32}$/);
  });

  it('generates a different key every time', () => {
    const keys = new Set(
      Array.from({ length: 50 }, () => ApiKeyUtil.generateSecretKey()),
    );
    expect(keys.size).toBe(50);
  });

  it('hashes deterministically to 64 hex characters', () => {
    const hash = ApiKeyUtil.hash('ora_sk_live_abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ApiKeyUtil.hash('ora_sk_live_abc')).toBe(hash);
  });

  it('does not leak the key into its hash', () => {
    const key = ApiKeyUtil.generateSecretKey();
    expect(ApiKeyUtil.hash(key)).not.toContain(key.slice(12));
  });

  it('hashes distinct keys to distinct values', () => {
    expect(ApiKeyUtil.hash('ora_sk_live_a')).not.toBe(
      ApiKeyUtil.hash('ora_sk_live_b'),
    );
  });

  it('takes the hint from the last 4 characters', () => {
    expect(ApiKeyUtil.hint('ora_sk_live_deadbeef')).toBe('beef');
  });
});
