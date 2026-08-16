import { Injectable, Logger } from '@nestjs/common';
import TurndownService from 'turndown';
import { ExtractedKnowledgeDoc, DiscoveredUrlKind } from '../types/ingestion.types';
import { ContentHasher } from '../utils/content-hasher.util';
import { UrlNormalizer } from '../utils/url-normalizer.util';

const MIN_CONTENT_LENGTH = 120; // below this, Readability likely grabbed only nav/footer

/**
 * Strips boilerplate (navbars, footers, headers, ads) from a policy/FAQ/general/service page
 * and converts the article content to clean Markdown for chunking into KnowledgeBase.
 */
@Injectable()
export class ReadabilityExtractor {
  private readonly logger = new Logger(ReadabilityExtractor.name);
  private readonly turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  extract(
    html: string,
    sourceUrl: string,
    kind: Extract<DiscoveredUrlKind, 'policy' | 'faq' | 'page'>,
  ): ExtractedKnowledgeDoc | null {
    try {
      const { JSDOM } = require('jsdom');
      const { Readability } = require('@mozilla/readability');
      const normalizedUrl = UrlNormalizer.normalizeUrl(sourceUrl) || sourceUrl;
      const dom = new JSDOM(html, { url: normalizedUrl });
      const article = new Readability(dom.window.document).parse();

      if (!article?.content || (article.textContent || '').trim().length < MIN_CONTENT_LENGTH) {
        this.logger.debug(`Readability yielded insufficient content for ${normalizedUrl}, skipping`);
        return null;
      }

      const markdown = this.turndown.turndown(article.content).trim();
      const contentHash = ContentHasher.hashText(markdown);
      const category = this.categorizeContent(normalizedUrl, kind, article.title || undefined);

      return {
        sourceUrl: normalizedUrl,
        category,
        title: article.title || this.titleFromUrl(normalizedUrl),
        markdown,
        contentHash,
      };
    } catch (err) {
      this.logger.warn(`Readability extraction failed for ${sourceUrl}: ${(err as Error).message}`);
      return null;
    }
  }

  private categorizeContent(
    url: string,
    kind: Extract<DiscoveredUrlKind, 'policy' | 'faq' | 'page'>,
    title?: string,
  ): 'policy' | 'faq' | 'general' | 'services' | 'pricing' {
    const combined = `${url} ${title || ''}`.toLowerCase();

    if (/service|solutions|offerings|capabilities|packages/i.test(combined)) {
      return 'services';
    }
    if (/pricing|plans|rates|fees/i.test(combined)) {
      return 'pricing';
    }
    if (kind === 'policy' || /refund|return|shipping|privacy|terms|legal|disclaimer/i.test(combined)) {
      return 'policy';
    }
    if (kind === 'faq' || /faq|frequently-asked|questions|help-center/i.test(combined)) {
      return 'faq';
    }
    return 'general';
  }

  private titleFromUrl(url: string): string {
    try {
      const path = new URL(url).pathname.replace(/\/+$/, '');
      const last = path.split('/').pop() || url;
      return last.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
    } catch {
      return url;
    }
  }
}
