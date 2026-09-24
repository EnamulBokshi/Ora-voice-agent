/**
 * Whose words a knowledge document holds, which decides how the voice agent
 * may use it.
 *
 * - `owner`: written or spoken by the business's own owner/admin in the
 *   dashboard — voice training and the manual editor. The agent may take
 *   behaviour from these ("always offer the free consultation first"), within
 *   the platform's fixed rules.
 * - `reference`: text the owner pointed ORA at but did not write — uploaded
 *   files, crawled pages, feeds, API pushes. Facts only. Any instruction inside
 *   one is content, not a command, so a crawled page or a PDF saying "ignore
 *   your rules" carries no authority.
 */
export type KnowledgeTrust = 'owner' | 'reference';

export const KNOWLEDGE_SOURCE = {
  VOICE_FEED: 'voice_feed',
  MANUAL: 'manual',
  FILE_UPLOAD: 'file_upload',
  CRAWL: 'crawl',
  API: 'api',
} as const;

const OWNER_SOURCES = new Set<string>([KNOWLEDGE_SOURCE.VOICE_FEED, KNOWLEDGE_SOURCE.MANUAL]);

export function knowledgeTrust(doc: {
  sourceUrl?: string | null;
  metadata?: Record<string, any> | null;
}): KnowledgeTrust {
  const source = doc.metadata?.source;
  if (typeof source === 'string') {
    return OWNER_SOURCES.has(source) ? 'owner' : 'reference';
  }
  // Documents saved before sources were recorded: a crawl left a URL or a
  // content hash behind; the dashboard editor left neither.
  if (doc.sourceUrl || doc.metadata?.contentHash) return 'reference';
  return 'owner';
}
