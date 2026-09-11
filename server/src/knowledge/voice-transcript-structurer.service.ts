import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocType } from './schemas/knowledge-base.schema';

/** One turn of a merchant's voice-feed session. */
export interface TranscriptTurn {
  speaker: 'merchant' | 'ora';
  text: string;
}

/** A single self-contained piece of knowledge extracted from a session. */
export interface StructuredKnowledgeEntry {
  docType: DocType;
  title: string;
  content: string;
  tags: string[];
  /** 0-1. Entries the model is unsure about are dropped before they are saved. */
  confidence: number;
}

/** Below this the extraction is treated as noise rather than knowledge. */
const MIN_CONFIDENCE = 0.45;

/** A single session should not be able to flood the knowledge base. */
const MAX_ENTRIES = 12;
const MAX_TITLE_CHARS = 90;
const MAX_CONTENT_CHARS = 4000;

/** Transcript turns shorter than this carry no durable knowledge. */
const MIN_TURN_CHARS = 12;

/**
 * Keyword evidence per category, used only when the model is unavailable.
 * Ordered most specific first: a sentence mentioning both "return" and "price"
 * is a returns policy, not pricing.
 */
const HEURISTIC_RULES: { docType: DocType; label: string; patterns: RegExp[] }[] = [
  {
    docType: DocType.POLICY,
    label: 'Policies',
    patterns: [
      /\b(return|refund|exchange|warranty|guarantee)\b/i,
      /\b(shipping|delivery|courier|dispatch|freight)\b/i,
      /\b(privacy|terms|cancellation|liability)\b/i,
    ],
  },
  {
    docType: DocType.PRODUCT_MANUAL,
    label: 'Product details',
    patterns: [
      /\b(size|sizing|material|fabric|dimension|weight|colour|color options)\b/i,
      /\b(made (of|from)|leather|cotton|wool|denim|silk|stainless|ceramic)\b/i,
      /\b(how to (use|install|assemble|care for)|instructions|manual)\b/i,
      /\b(wash|washing|clean|cleaning|condition|conditioned|maintenance)\b/i,
      /\b(in stock|out of stock|inventory|variant|sku|bestseller)\b/i,
    ],
  },
  {
    docType: DocType.FAQ,
    label: 'Frequently asked',
    patterns: [
      /\b(customers|people|shoppers|clients) (often|usually|always|frequently) ask\b/i,
      /\b(faq|common question|they ask|gets asked)\b/i,
      /\?\s*$/,
    ],
  },
  {
    docType: DocType.SALES_PLAYBOOK,
    label: 'Sales guidance',
    patterns: [
      /\b(upsell|cross.?sell|discount|offer|promo|bundle|objection)\b/i,
      /\b(recommend|suggest|pitch|convince|close the sale)\b/i,
      /\b(price|pricing|cost|charge|fee)\b/i,
    ],
  },
  {
    docType: DocType.BRAND_RULE,
    label: 'Brand and tone',
    patterns: [
      /\b(tone|voice|never say|always say|don't mention|avoid saying)\b/i,
      /\b(brand|our style|we are known for|positioning)\b/i,
    ],
  },
];

/**
 * Turns a spoken merchant session into categorised knowledge entries.
 *
 * The merchant talks in whatever order things occur to them — a return window,
 * then a bestseller, then how to greet a hesitant shopper. Saving that verbatim
 * as one document makes it almost unretrievable: RAG matches a chunk, and a
 * chunk spanning three unrelated topics answers none of them well. So the
 * transcript is segmented by topic, each topic classified into the existing
 * DocType taxonomy, and each saved as its own document.
 *
 * Extraction is model-first with a keyword fallback, so a missing API key
 * degrades the quality of the categorisation rather than losing the merchant's
 * work.
 */
@Injectable()
export class VoiceTranscriptStructurerService {
  private readonly logger = new Logger(VoiceTranscriptStructurerService.name);

  constructor(private readonly configService: ConfigService) {}

  /** True when structured extraction is available; otherwise heuristics run. */
  isModelAvailable(): boolean {
    return !!this.configService.get<string>('GEMINI_API_KEY');
  }

  async structure(
    turns: TranscriptTurn[],
    targetCategory?: DocType | 'all',
  ): Promise<{
    entries: StructuredKnowledgeEntry[];
    method: 'model' | 'heuristic';
  }> {
    const merchantText = this.merchantOnlyTranscript(turns);
    if (!merchantText.trim()) return { entries: [], method: 'heuristic' };

    if (this.isModelAvailable()) {
      try {
        const entries = await this.structureWithModel(merchantText, targetCategory);
        if (entries.length > 0) return { entries, method: 'model' };
        // An empty model result on non-empty speech usually means the session
        // was pure chatter. Fall through so heuristics get a look at it.
      } catch (err: any) {
        this.logger.warn(
          `[VoiceTranscriptStructurer] Model extraction failed, falling back to heuristics: ${err.message}`,
        );
      }
    }

    return {
      entries: this.structureWithHeuristics(merchantText, targetCategory),
      method: 'heuristic',
    };
  }

  /**
   * Only the merchant teaches. ORA's own replies are echoes of what it already
   * knows, and feeding them back in would compound its own errors over time.
   */
  private merchantOnlyTranscript(turns: TranscriptTurn[]): string {
    return turns
      .filter((t) => t.speaker === 'merchant')
      .map((t) => (t.text || '').trim())
      .filter((t) => t.length >= MIN_TURN_CHARS)
      .join('\n');
  }

  private async structureWithModel(
    merchantText: string,
    targetCategory?: DocType | 'all',
  ): Promise<StructuredKnowledgeEntry[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model =
      this.configService.get<string>('GEMINI_STRUCTURER_MODEL') ||
      'gemini-2.0-flash';

    const categoryDirective =
      targetCategory && targetCategory !== 'all'
        ? `- The merchant indicated this session is specifically about "${targetCategory}". Prioritize classifying valid knowledge under this category unless the content clearly belongs elsewhere.\n`
        : '';

    const instruction = [
      'You organise a merchant\'s spoken notes into a retrieval knowledge base for their AI sales agent.',
      '',
      'Split the transcript into distinct topics. Output one entry per topic.',
      '',
      'Rules:',
      '- Keep ONLY durable business facts and instructions. Discard greetings, thinking aloud, corrections of speech, questions addressed to the assistant, and anything about the recording itself.',
      '- Each entry must stand alone. A reader with no access to the transcript must understand it, so resolve references like "that one" or "as I said" into explicit nouns.',
      '- Write content as clean prose or short bullet lists, in the merchant\'s own voice ("we", "our"). Never write "the merchant said".',
      '- Do NOT invent details, prices, or policies that were not spoken.',
      '- Merge fragments about the same topic that were said minutes apart into ONE entry.',
      '- title: a specific noun phrase a person would search for, at most 8 words (e.g. "30-Day Return Policy", "Standard Shipping Delivery Times", "Organic Cotton Hoodie Sizing"). Not "Voice Note" or a date.',
      '- confidence: how certain you are that this is durable business knowledge worth saving, 0 to 1.',
      categoryDirective,
      'docType must be exactly one of:',
      '- policy: returns, refunds, shipping, delivery, warranty, privacy, terms, cancellations.',
      '- product_manual: facts about specific products — sizing, materials, care, variants, stock, dimensions.',
      '- faq: questions customers actually ask, with the answer.',
      '- sales_playbook: pricing guidance, offers, upsells, objection handling, how to persuade.',
      '- brand_rule: tone of voice, wording to use or avoid, positioning, persona instructions.',
      '',
      'If nothing in the transcript qualifies, return an empty array.',
    ].filter(Boolean).join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `TRANSCRIPT:\n${merchantText.slice(0, 24000)}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  docType: {
                    type: 'STRING',
                    enum: [
                      DocType.POLICY,
                      DocType.PRODUCT_MANUAL,
                      DocType.FAQ,
                      DocType.SALES_PLAYBOOK,
                      DocType.BRAND_RULE,
                    ],
                  },
                  title: { type: 'STRING' },
                  content: { type: 'STRING' },
                  tags: { type: 'ARRAY', items: { type: 'STRING' } },
                  confidence: { type: 'NUMBER' },
                },
                required: ['docType', 'title', 'content', 'confidence'],
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini structuring returned HTTP ${response.status}`);
    }

    const body: any = await response.json();
    const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini structuring returned no content');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Gemini structuring returned malformed JSON');
    }

    return this.sanitise(Array.isArray(parsed) ? parsed : []);
  }

  /**
   * Keyword segmentation, used when the model is unreachable. Deliberately
   * coarse: it groups sentences by the category their wording points at, so
   * the merchant's work is filed somewhere sensible and reviewable rather than
   * dumped into one undifferentiated note.
   */
  private structureWithHeuristics(
    merchantText: string,
    targetCategory?: DocType | 'all',
  ): StructuredKnowledgeEntry[] {
    const sentences = merchantText
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_TURN_CHARS);

    const buckets = new Map<DocType, { label: string; lines: string[] }>();

    for (const sentence of sentences) {
      let docType: DocType;
      let label: string;

      if (targetCategory && targetCategory !== 'all') {
        docType = targetCategory;
        const matched = HEURISTIC_RULES.find((r) => r.docType === targetCategory);
        label = matched?.label || 'Business Knowledge';
      } else {
        const rule =
          HEURISTIC_RULES.find((r) => r.patterns.some((p) => p.test(sentence))) ||
          HEURISTIC_RULES[HEURISTIC_RULES.length - 1];
        docType = rule.docType;
        label = rule.label;
      }

      const bucket = buckets.get(docType) || { label, lines: [] };
      bucket.lines.push(sentence);
      buckets.set(docType, bucket);
    }

    const deriveTitle = (type: DocType, lines: string[], defaultLabel: string): string => {
      const text = lines.join(' ');
      if (/return|refund|exchange/i.test(text)) return 'Return & Refund Policy';
      if (/shipping|delivery|courier/i.test(text)) return 'Shipping & Delivery Policy';
      if (/warranty|guarantee/i.test(text)) return 'Warranty & Guarantee Policy';
      if (/size|sizing|measurement/i.test(text)) return 'Product Sizing Guide';
      if (/material|fabric|care|wash/i.test(text)) return 'Materials & Care Instructions';
      if (/price|pricing|discount|promo/i.test(text)) return 'Pricing & Promotional Guidance';
      if (/tone|voice|brand/i.test(text)) return 'Brand Voice & Tone Directive';
      if (lines[0] && lines[0].includes('?')) {
        return lines[0].slice(0, 60);
      }
      return defaultLabel;
    };

    const entries: StructuredKnowledgeEntry[] = [];
    buckets.forEach((bucket, docType) => {
      const title = deriveTitle(docType, bucket.lines, bucket.label);
      entries.push({
        docType,
        title,
        content: bucket.lines.map((l) => `- ${l}`).join('\n'),
        tags: ['voice-feed', 'categorised-feed', 'uncategorised-review'],
        confidence: 0.6,
      });
    });

    return this.sanitise(entries);
  }

  /** Enforce the taxonomy, the size caps and the confidence floor. */
  private sanitise(raw: any[]): StructuredKnowledgeEntry[] {
    const allowed = new Set<string>(Object.values(DocType));
    const seenTitles = new Set<string>();
    const entries: StructuredKnowledgeEntry[] = [];

    for (const item of raw) {
      const title = String(item?.title || '').trim().slice(0, MAX_TITLE_CHARS);
      const content = String(item?.content || '').trim().slice(0, MAX_CONTENT_CHARS);
      if (!title || !content) continue;

      const docType = allowed.has(item?.docType)
        ? (item.docType as DocType)
        : DocType.BRAND_RULE;

      const confidence =
        typeof item?.confidence === 'number' && Number.isFinite(item.confidence)
          ? Math.min(1, Math.max(0, item.confidence))
          : 0.5;
      if (confidence < MIN_CONFIDENCE) continue;

      const dedupeKey = `${docType}::${title.toLowerCase()}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);

      entries.push({
        docType,
        title,
        content,
        tags: Array.isArray(item?.tags)
          ? item.tags.map((t: any) => String(t).slice(0, 40)).slice(0, 8)
          : [],
        confidence,
      });

      if (entries.length >= MAX_ENTRIES) break;
    }

    return entries;
  }
}
