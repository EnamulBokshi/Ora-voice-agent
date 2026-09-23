import { knowledgeTrust } from './knowledge-trust';

describe('knowledgeTrust', () => {
  it('trusts what the owner said or wrote', () => {
    expect(knowledgeTrust({ metadata: { source: 'voice_feed' } })).toBe('owner');
    expect(knowledgeTrust({ metadata: { source: 'manual' } })).toBe('owner');
  });

  it('treats imported material as reference, whatever it says', () => {
    for (const source of ['file_upload', 'crawl', 'api', 'something_new']) {
      expect(knowledgeTrust({ metadata: { source } })).toBe('reference');
    }
  });

  it('classifies documents saved before sources were recorded', () => {
    expect(knowledgeTrust({ sourceUrl: 'https://shop.test/about', metadata: {} })).toBe('reference');
    expect(knowledgeTrust({ metadata: { contentHash: 'abc' } })).toBe('reference');
    expect(knowledgeTrust({ metadata: {} })).toBe('owner');
    expect(knowledgeTrust({})).toBe('owner');
  });
});
