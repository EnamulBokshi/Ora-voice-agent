import { Injectable, Logger } from '@nestjs/common';
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import { ExtractedKnowledgeDoc, DiscoveredUrlKind } from '../types/ingestion.types';
import { ContentHasher } from '../utils/content-hasher.util';
import { UrlNormalizer } from '../utils/url-normalizer.util';

const MIN_CONTENT_LENGTH = 100; // below this, fallback to direct DOM extraction

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
    kind: DiscoveredUrlKind = 'page',
  ): ExtractedKnowledgeDoc | null {
    const normalizedUrl = UrlNormalizer.normalizeUrl(sourceUrl) || sourceUrl;

    // Plain text / markdown document handling (e.g. llms.txt, llms-full.txt, README.md)
    if (
      normalizedUrl.endsWith('.txt') ||
      normalizedUrl.endsWith('.md') ||
      (!html.includes('<html') && !html.includes('<body') && !html.includes('<div') && html.trim().length > 20)
    ) {
      const title = this.titleFromUrl(normalizedUrl);
      const markdown = html.trim();
      const contentHash = ContentHasher.hashText(markdown);
      const category = this.categorizeContent(normalizedUrl, kind, title);
      return {
        sourceUrl: normalizedUrl,
        category,
        title,
        markdown,
        contentHash,
      };
    }

    // 1. Extract Schema.org JSON-LD Knowledge (Person, Projects, Experience, Skills)
    const jsonLdMarkdown = this.extractJsonLdKnowledge(html);

    // 2. Extract Next.js RSC Flight data (experiences, projects, skills, bio)
    const rscMarkdown = this.extractNextJsRscData(html);

    // 3. Extract DOM Article / Content text
    let domMarkdown = '';
    let pageTitle = '';

    try {
      const { JSDOM } = require('jsdom');
      const { Readability } = require('@mozilla/readability');
      const dom = new JSDOM(html, { url: normalizedUrl });
      const article = new Readability(dom.window.document).parse();

      if (article?.content && (article.textContent || '').trim().length >= MIN_CONTENT_LENGTH) {
        domMarkdown = this.turndown.turndown(article.content).trim();
        pageTitle = article.title || '';
      }
    } catch (err) {
      this.logger.debug(`Mozilla Readability parse skipped: ${(err as Error).message}`);
    }

    // 4. Fallback to Cheerio DOM if Readability yielded minimal text
    if (!domMarkdown || domMarkdown.length < MIN_CONTENT_LENGTH) {
      const $ = cheerio.load(html);
      pageTitle =
        pageTitle ||
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().replace(/\|.*$/, '').trim();

      $('script, style, noscript, svg, iframe').remove();
      const contentRoot = $('main').length ? $('main') : $('body');
      domMarkdown = this.turndown.turndown(contentRoot.html() || '').trim();
    }

    const title = pageTitle || this.titleFromUrl(normalizedUrl);
    const markdownParts = [jsonLdMarkdown, rscMarkdown, domMarkdown].filter(
      (part) => part && part.trim().length > 20,
    );

    const combinedMarkdown = Array.from(new Set(markdownParts)).join('\n\n').trim();

    if (!combinedMarkdown || combinedMarkdown.length < 25) {
      return null;
    }

    const contentHash = ContentHasher.hashText(combinedMarkdown);
    const category = this.categorizeContent(normalizedUrl, kind, title);

    return {
      sourceUrl: normalizedUrl,
      category,
      title,
      markdown: combinedMarkdown,
      contentHash,
    };
  }

  private extractJsonLdKnowledge(html: string): string {
    const sections: string[] = [];
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).contents().text().trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          this.formatJsonLdItem(item, sections);
        }
      } catch {
        // ignore invalid json-ld
      }
    });

    return Array.from(new Set(sections.filter(Boolean))).join('\n\n');
  }

  private formatJsonLdItem(item: any, sections: string[]): void {
    if (!item || typeof item !== 'object') return;

    // Person / Creator / Author profile
    if (item['@type'] === 'Person') {
      const lines = [`# ${item.name || 'Profile'}`];
      if (item.jobTitle) lines.push(`**Title / Role:** ${item.jobTitle}`);
      if (item.worksFor?.name) lines.push(`**Company / Organization:** ${item.worksFor.name}`);
      if (item.email) lines.push(`**Email:** ${item.email}`);
      if (item.url) lines.push(`**Website:** ${item.url}`);
      if (item.description) lines.push(`\n**Bio / Summary:**\n${item.description}`);
      if (Array.isArray(item.knowsAbout) && item.knowsAbout.length > 0) {
        lines.push(`\n**Core Expertise & Skills:**\n${item.knowsAbout.map((k: string) => `- ${k}`).join('\n')}`);
      }
      if (Array.isArray(item.sameAs) && item.sameAs.length > 0) {
        lines.push(`\n**Social Links & Profiles:**\n${item.sameAs.map((s: string) => `- ${s}`).join('\n')}`);
      }
      sections.push(lines.join('\n'));
    }

    // ItemList (Projects, Competencies, Experience History)
    if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
      const listTitle = item.name || 'Featured Projects & Experience';
      const lines = [`## ${listTitle}`];
      for (const el of item.itemListElement) {
        const sub = el.item || el;
        if (sub['@type'] === 'SoftwareSourceCode' || sub['@type'] === 'CreativeWork') {
          lines.push(`### ${sub.name || 'Project'}`);
          if (sub.description) lines.push(sub.description);
          if (Array.isArray(sub.programmingLanguage)) {
            lines.push(`*Technologies:* ${sub.programmingLanguage.join(', ')}`);
          }
          if (sub.url) lines.push(`*Project URL:* ${sub.url}`);
          if (sub.codeRepository) lines.push(`*Repository:* ${sub.codeRepository}`);
          lines.push('');
        } else if (sub['@type'] === 'Role') {
          lines.push(`### ${sub.roleName || 'Role'} at ${sub.subjectOf?.name || 'Company'}`);
          if (sub.startDate) lines.push(`*Period:* ${sub.startDate} to ${sub.endDate || 'Present'}`);
          if (sub.subjectOf?.address) lines.push(`*Location:* ${sub.subjectOf.address}`);
          if (sub.description) lines.push(sub.description);
          lines.push('');
        } else if (sub.name) {
          lines.push(`- **${sub.name}:** ${sub.description || ''}`);
        }
      }
      sections.push(lines.join('\n'));
    }

    // FAQPage
    if (item['@type'] === 'FAQPage' && Array.isArray(item.mainEntity)) {
      const lines = ['## Frequently Asked Questions'];
      for (const q of item.mainEntity) {
        const question = q.name || q.question;
        const answer = q.acceptedAnswer?.text || q.answer;
        if (question && answer) {
          lines.push(`**Q: ${question}**\nA: ${answer}\n`);
        }
      }
      sections.push(lines.join('\n'));
    }
  }

  private extractNextJsRscData(html: string): string {
    const sections: string[] = [];
    const $ = cheerio.load(html);

    $('script').each((_, el) => {
      const scriptText = $(el).contents().text();
      if (!scriptText || !scriptText.includes('__next_f')) return;

      // Extract raw chunks inside self.__next_f.push([1, "..."])
      const matches = scriptText.matchAll(/self\.__next_f\.push\(\[\s*\d+\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]\)/g);
      for (const m of Array.from(matches)) {
        if (!m[1]) continue;
        try {
          // Unescape JS string
          const unescaped = JSON.parse(`"${m[1]}"`);
          this.parseJsonBlobs(unescaped, sections);
        } catch {
          this.extractTextFromFlightString(m[1], sections);
        }
      }
    });

    return Array.from(new Set(sections.filter(Boolean))).join('\n\n');
  }

  private parseJsonBlobs(str: string, sections: string[]): void {
    let depth = 0;
    let startIdx = -1;

    for (let i = 0; i < str.length; i++) {
      if (str[i] === '{') {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (str[i] === '}') {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          const candidate = str.substring(startIdx, i + 1);
          try {
            const parsed = JSON.parse(candidate);
            this.formatRscJsonToMarkdown(parsed, sections);
          } catch {
            // sub-chunk fallback
          }
          startIdx = -1;
        }
      }
    }
  }

  private formatRscJsonToMarkdown(obj: any, sections: string[]): void {
    if (!obj || typeof obj !== 'object') return;

    // Experiences / Work History
    if (Array.isArray(obj.experiences) && obj.experiences.length > 0) {
      const lines = ['## Work Experience & History'];
      for (const exp of obj.experiences) {
        lines.push(`### ${exp.role || 'Role'} at ${exp.company || 'Company'} (${exp.location || 'Remote'})`);
        if (exp.description) lines.push(exp.description);
        if (Array.isArray(exp.highlights)) {
          for (const h of exp.highlights) lines.push(`- ${h}`);
        }
        if (Array.isArray(exp.techTags)) {
          lines.push(`*Technologies:* ${exp.techTags.join(', ')}`);
        }
        lines.push('');
      }
      sections.push(lines.join('\n'));
    }

    // Projects / Portfolio Work
    if (Array.isArray(obj.projects) && obj.projects.length > 0) {
      const lines = ['## Featured Projects'];
      for (const proj of obj.projects) {
        lines.push(`### ${proj.title || proj.name || 'Project'}`);
        if (proj.description) lines.push(proj.description);
        if (Array.isArray(proj.techTags)) lines.push(`*Technologies:* ${proj.techTags.join(', ')}`);
        if (proj.liveUrl || proj.link) lines.push(`*Live URL:* ${proj.liveUrl || proj.link}`);
        lines.push('');
      }
      sections.push(lines.join('\n'));
    }

    // Technical Skills
    if (Array.isArray(obj.skills) && obj.skills.length > 0) {
      const skillsByCategory: Record<string, string[]> = {};
      for (const s of obj.skills) {
        const cat = s.category || 'General';
        skillsByCategory[cat] = skillsByCategory[cat] || [];
        skillsByCategory[cat].push(s.name);
      }
      const lines = ['## Technical Skills & Stack'];
      for (const [cat, names] of Object.entries(skillsByCategory)) {
        lines.push(`- **${cat}:** ${names.join(', ')}`);
      }
      sections.push(lines.join('\n'));
    }

    // Achievements
    if (Array.isArray(obj.achievements) && obj.achievements.length > 0) {
      const lines = ['## Achievements & Recognition'];
      for (const ach of obj.achievements) {
        lines.push(`- **${ach.title}:** ${ach.description || ''}`);
      }
      sections.push(lines.join('\n'));
    }

    // Specializations / Core Focus
    if (Array.isArray(obj.beltItems) && obj.beltItems.length > 0) {
      const labels = obj.beltItems.map((b: any) => b.label).filter(Boolean);
      if (labels.length > 0) {
        sections.push(`## Core Specializations\n${labels.map((l: string) => `- ${l}`).join('\n')}`);
      }
    }
  }

  private extractTextFromFlightString(raw: string, sections: string[]): void {
    const stringMatches = raw.match(/"([^"\\]{40,})"/g) || [];
    const collected: string[] = [];
    for (const str of stringMatches) {
      const clean = str.replace(/^"|"$/g, '').trim();
      if (
        clean.length > 40 &&
        !clean.startsWith('$') &&
        !clean.includes('className') &&
        !clean.includes('style')
      ) {
        collected.push(clean);
      }
    }
    if (collected.length > 0) {
      sections.push(collected.join('\n\n'));
    }
  }

  private categorizeContent(
    url: string,
    kind?: DiscoveredUrlKind,
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
