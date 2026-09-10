import type { MetadataRoute } from 'next';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://tryora.live';

/**
 * Static files under public/ that are part of ORA's answerable knowledge surface.
 *
 * These are listed alongside the HTML pages deliberately. ORA's own sitemap crawler
 * (server/src/ingestion/services/sitemap-discovery.service.ts) and external AI crawlers
 * both discover content through /sitemap.xml, so anything omitted here is effectively
 * invisible to them — which is why ORA could not answer from llms.txt or the merchant
 * manual even though both are publicly served.
 *
 * Only add paths that robots.ts permits. Dashboard, admin and auth routes are excluded
 * on purpose: they are gated, uncrawlable, and must never be advertised for indexing.
 */
const KNOWLEDGE_FILES = [
  'llms.txt',
  'llms-full.txt',
  'docs/ORA-Merchant-Owner-Manual.md',
] as const;

/**
 * Real modification time of a public file, so lastModified means something.
 *
 * Stamping every entry with `new Date()` tells crawlers the whole site changed on every
 * build, which trains them to ignore the field. Falls back to the build timestamp if the
 * file cannot be stat'd (the sitemap is prerendered at build time, where public/ is present).
 */
function publicFileLastModified(relativePath: string, fallback: Date): Date {
  try {
    return statSync(join(process.cwd(), 'public', relativePath)).mtime;
  } catch {
    return fallback;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date();

  const pages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: buildDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const knowledge: MetadataRoute.Sitemap = KNOWLEDGE_FILES.map((file) => ({
    url: `${BASE_URL}/${file}`,
    lastModified: publicFileLastModified(file, buildDate),
    changeFrequency: 'weekly' as const,
    // Below the pages: these are reference material for agents and crawlers,
    // not landing pages competing for search placement.
    priority: 0.6,
  }));

  return [...pages, ...knowledge];
}
