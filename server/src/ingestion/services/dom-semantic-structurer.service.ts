import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DomTelemetryDto } from '../dto/dom-telemetry.dto';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { ProductsService } from '../../products/products.service';
import { ContentHasher } from '../utils/content-hasher.util';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';
import {
  AgentConfig,
  AgentConfigDocument,
} from '../../agent-config/schemas/agent-config.schema';

@Injectable()
export class DomSemanticStructurerService {
  private readonly logger = new Logger(DomSemanticStructurerService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly productsService: ProductsService,
    @InjectModel(AgentConfig.name)
    private readonly agentConfigModel: Model<AgentConfigDocument>,
  ) {}

  async processTelemetry(businessId: string, telemetry: DomTelemetryDto) {
    const { url, title, headings = [], cards = [], contacts, bodyTextSnippet, product } = telemetry;
    let projectsCount = 0;
    let servicesCount = 0;
    let productsCount = 0;
    let docsCount = 0;

    // 1. Detect Business Archetype based on DOM signals
    const detectedArchetype = this.inferArchetype(telemetry);

    // 2. Ingest E-Commerce Product if present
    if (product && product.name && (product.price !== undefined && product.price !== null)) {
      try {
        const pHash = ContentHasher.hashProduct({
          name: product.name,
          price: product.price,
          currency: product.currency || 'USD',
          availability: product.availability || 'in_stock',
        });

        await this.productsService.batchSync(businessId, {
          sourceTier: SourceTier.TIER3_PASSIVE,
          products: [
            {
              nativeProductId: product.sku || `dom_${Math.abs(url.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36)}`,
              name: product.name,
              description: telemetry.metaDescription || bodyTextSnippet?.slice(0, 300) || '',
              price: product.price,
              currency: product.currency || 'USD',
              stockQuantity: product.availability === 'out_of_stock' ? 0 : 10,
              availability: product.availability === 'out_of_stock' ? ProductAvailability.OUT_OF_STOCK : ProductAvailability.IN_STOCK,
              category: 'General',
              images: [],
              attributes: { sourceUrl: url, contentHash: pHash },
              sourceTier: SourceTier.TIER3_PASSIVE,
              confidenceScore: 0.8,
            },
          ],
        });
        productsCount += 1;
      } catch (err: any) {
        this.logger.warn(`[DomStructurer] Product sync note: ${err.message}`);
      }
    }

    // 3. Ingest Cards (Projects, Portfolio items, Services, Features)
    if (cards && cards.length > 0) {
      for (const card of cards) {
        if (!card.title || card.title.length < 2) continue;

        const isProject =
          detectedArchetype === 'portfolio' ||
          /project|work|case study|built|app|demo|repo/i.test(card.title) ||
          (card.tags && card.tags.some((t) => /react|next|node|python|ts|vue|ai|sql|aws|docker|tailwind/i.test(t)));

        const category = isProject ? 'services' : 'general';
        const tagLine = card.tags && card.tags.length > 0 ? `\n\n**Tech Stack / Tags:** ${card.tags.join(', ')}` : '';
        const linkLine = card.link ? `\n\n**Link / Demo:** ${card.link}` : '';

        const markdown = `### ${card.title}\n\n${card.description || 'Project item showcased on portfolio.'}${tagLine}${linkLine}`;
        const cHash = ContentHasher.hashText(markdown);

        const res = await this.knowledgeService.upsertExtractedDoc(businessId, {
          title: card.title,
          category,
          markdown,
          sourceUrl: card.link || url,
          contentHash: cHash,
        });

        if (res.updated) {
          if (isProject) projectsCount += 1;
          else servicesCount += 1;
        }
      }
    }

    // 4. Ingest Contact Details & Social Links
    if (contacts && ((contacts.emails && contacts.emails.length > 0) || (contacts.links && contacts.links.length > 0))) {
      const contactLines: string[] = [];
      if (contacts.emails && contacts.emails.length > 0) {
        contactLines.push(`• **Official Contact Email(s):** ${contacts.emails.join(', ')}`);
      }
      if (contacts.links && contacts.links.length > 0) {
        contactLines.push(`• **Social / Booking Links:**\n${contacts.links.map((l) => `  - ${l}`).join('\n')}`);
      }

      const contactMd = `## Contact Channels & Social Links\n\n${contactLines.join('\n\n')}\n\n*Use these direct channels whenever visitors ask how to get in touch, contact, hire, or book a meeting.*`;
      const contactHash = ContentHasher.hashText(contactMd);

      await this.knowledgeService.upsertExtractedDoc(businessId, {
        title: 'Official Contact & Social Channels',
        category: 'general',
        markdown: contactMd,
        sourceUrl: url,
        contentHash: contactHash,
      });
      docsCount += 1;
    }

    // 5. Ingest Page Overview / Structure
    if (headings.length > 0 || (bodyTextSnippet && bodyTextSnippet.length >= 50)) {
      const headingList = headings.map((h) => `${h.level === 'h1' ? '#' : h.level === 'h2' ? '##' : '###'} ${h.text}`).join('\n\n');
      const pageSummaryMd = `# ${title || 'Page Overview'}\n\n**URL:** ${url}\n\n${telemetry.metaDescription ? `> ${telemetry.metaDescription}\n\n` : ''}${headingList}\n\n### Page Summary Content\n${bodyTextSnippet?.slice(0, 1500) || ''}`;
      const pageHash = ContentHasher.hashText(pageSummaryMd);

      const pageRes = await this.knowledgeService.upsertExtractedDoc(businessId, {
        title: title || `Page: ${telemetry.pathname || '/'}`,
        category: 'general',
        markdown: pageSummaryMd,
        sourceUrl: url,
        contentHash: pageHash,
      });
      if (pageRes.updated) docsCount += 1;
    }

    // 6. Update Agent Archetype and Summary in AgentConfig
    try {
      const config = await this.agentConfigModel.findOne({ businessId: businessId as any }).exec();
      if (config) {
        let changed = false;
        if (config.businessArchetype === 'general' || !config.businessArchetype) {
          config.businessArchetype = detectedArchetype;
          changed = true;
        }

        const summaryCandidate = `${title ? `${title}. ` : ''}${telemetry.metaDescription || ''}`.trim();
        if (summaryCandidate && (!config.businessSummary || config.businessSummary.length < summaryCandidate.length)) {
          config.businessSummary = summaryCandidate.slice(0, 300);
          changed = true;
        }

        if (changed) {
          await config.save();
        }
      }
    } catch (err: any) {
      this.logger.debug(`[DomStructurer] AgentConfig auto-update note: ${err.message}`);
    }

    this.logger.log(
      `[DomStructurer] Ingested DOM telemetry for business ${businessId} (${url}): Archetype=${detectedArchetype}, Projects=${projectsCount}, Services=${servicesCount}, Products=${productsCount}, Docs=${docsCount}`,
    );

    return {
      success: true,
      archetype: detectedArchetype,
      projectsIngested: projectsCount,
      servicesIngested: servicesCount,
      productsIngested: productsCount,
      knowledgeDocsIngested: docsCount,
    };
  }

  private inferArchetype(telemetry: DomTelemetryDto): string {
    const combinedText = [
      telemetry.title || '',
      telemetry.metaDescription || '',
      ...(telemetry.headings || []).map((h) => h.text),
      ...(telemetry.cards || []).map((c) => `${c.title} ${(c.tags || []).join(' ')}`),
      telemetry.bodyTextSnippet || '',
      telemetry.url || '',
    ].join(' ').toLowerCase();

    // 1. Portfolio / Personal Engineer Site
    const portfolioSignals = [
      'portfolio',
      'developer',
      'software engineer',
      'full stack',
      'frontend engineer',
      'backend engineer',
      'resume',
      'cv',
      'github.com',
      'my projects',
      'featured projects',
      'tech stack',
      'skills & experience',
      'about me',
    ];
    const portfolioScore = portfolioSignals.filter((s) => combinedText.includes(s)).length;
    if (portfolioScore >= 2) return 'portfolio';

    // 2. Digital Agency / Studio / Services
    const agencySignals = [
      'agency',
      'our services',
      'what we do',
      'case studies',
      'clients',
      'creative studio',
      'marketing agency',
      'consulting agency',
      'packages',
      'book a call',
    ];
    const agencyScore = agencySignals.filter((s) => combinedText.includes(s)).length;
    if (agencyScore >= 2) return 'agency_services';

    // 3. SaaS / Software Product
    const saasSignals = [
      'pricing plans',
      'start free trial',
      'documentation',
      'api reference',
      'dashboard',
      'features',
      'integrations',
      'sign in',
      'sign up',
    ];
    const saasScore = saasSignals.filter((s) => combinedText.includes(s)).length;
    if (saasScore >= 2) return 'saas';

    // 4. E-Commerce
    if (
      telemetry.product ||
      /add to cart|checkout|product details|shop now|in stock|sku|shipping policy|refund policy/i.test(combinedText)
    ) {
      return 'ecommerce';
    }

    return 'general';
  }
}
