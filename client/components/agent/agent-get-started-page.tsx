'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mic,
  FileText,
  Package,
  ChevronDown,
  ArrowRight,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AgentRole } from '@/lib/agent-roles';
import { AppLink } from '@/components/navigation/app-link';

// ─── Per-Role Editorial & Image Definitions ───────────────────────────────────

type HowRow = {
  stepLabel: string;
  title: string;
  description: string;
  imageSrc: string;
};

type FaqItem = { q: string; a: string };

type RolePageContent = {
  Icon: React.ElementType;
  iconBgClass: string;
  iconTextClass: string;
  roleName: string;
  heroTitle: string;
  heroDesc: string;
  heroImageSrc: string;
  cta1Label: string;
  cta1Href: string;
  cta2Label: string;
  howLabel: string;
  rows: HowRow[];
  faqs: FaqItem[];
};

/**
 * This whole page is disabled (see lib/disabled-features.ts) and kept only so
 * it can be restored. The map is therefore partial: roles added after it was
 * switched off have no editorial copy, and inventing some for a page nobody
 * sees would be worse than falling back.
 */
const ROLE_CONTENT: Partial<Record<AgentRole, RolePageContent>> = {
  prompt: {
    Icon: Sliders,
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    roleName: 'System Prompt & Persona',
    heroTitle: 'Configure ORA with custom instructions & persona',
    heroDesc:
      'Instruct ORA on what to do, how to greet and treat your shoppers, 25+ supported spoken languages & dialects, and topics to strictly avoid.',
    heroImageSrc: '/previews/agent-persona-role.jpg',
    cta1Label: 'Configure System Prompt',
    cta1Href: '/agent?role=prompt',
    cta2Label: 'Learn more',
    howLabel: 'HOW SYSTEM PROMPTS EMPOWER ORA',
    rows: [
      {
        stepLabel: '1. DIRECTIVES',
        title: 'Tell ORA what to do & goals to achieve',
        description:
          'Provide custom operational rules, store policies, active promotional discount codes, and product recommendation guidelines.',
        imageSrc: '/previews/step-engage-v2.jpg',
      },
      {
        stepLabel: '2. TREATMENT',
        title: 'Define greeting & consumer treatment',
        description:
          'Set custom opening greeting phrases, brand voice demeanor, consultative sales pacing, and empathy rules.',
        imageSrc: '/previews/step-understand-v2.jpg',
      },
      {
        stepLabel: '3. LANGUAGE',
        title: 'Enforce 25+ spoken languages & dialects',
        description:
          'Instruct ORA to speak in English, Bengali, Spanish, French, Hindi, Arabic, or auto-detect multilingual shopper dialects in real time.',
        imageSrc: '/previews/step-discover-v2.jpg',
      },
      {
        stepLabel: '4. RESTRICTIONS',
        title: 'Guardrails & topics to avoid',
        description:
          'Enforce strict negative constraints so ORA never mentions competitors, never promises unverified discounts, and stays on topic.',
        imageSrc: '/previews/step-convert-v2.jpg',
      },
    ],
    faqs: [
      {
        q: 'Is configuring a system prompt mandatory?',
        a: 'No, it is completely optional. If left blank, ORA uses its intelligent business archetype baseline.',
      },
      {
        q: 'Can I force ORA to speak only in a specific language (e.g. Spanish, Bengali, French)?',
        a: 'Yes. Select your preferred language from the Supported Languages dropdown to ensure ORA speaks and greets exclusively in that language.',
      },
      {
        q: 'How fast do prompt changes take effect?',
        a: 'Instantly. Saving your prompt immediately invalidates the runtime cache so active and future sessions use the latest directives without restarting.',
      },
    ],
  },

  voice: {
    Icon: Mic,
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    roleName: 'ORA for Voice',
    heroTitle: 'ORA for Voice drives purchases on your store',
    heroDesc:
      'ORA for Voice connects seamlessly with your store catalog to aid with product discovery, answer sizing questions, and reduce buying friction.',
    heroImageSrc: '/previews/role-voice-v2.jpg',
    cta1Label: 'Set up ORA for Voice',
    cta1Href: '/agent?role=voice&view=feed',
    cta2Label: 'Learn more',
    howLabel: 'HOW ORA FOR VOICE WORKS',
    rows: [
      {
        stepLabel: '1. ENGAGE',
        title: 'ORA engages shoppers on your store',
        description:
          "ORA greets visitors proactively on high-intent product pages — whether they arrive with a specific question, land on a product page, or are just browsing.",
        imageSrc: '/previews/step-engage-v2.jpg',
      },
      {
        stepLabel: '2. UNDERSTAND',
        title: 'ORA understands shopper needs',
        description:
          'Through natural voice conversation, ORA figures out what the customer actually needs. It asks the right questions about size, use case, preferences, and budget.',
        imageSrc: '/previews/step-understand-v2.jpg',
      },
      {
        stepLabel: '3. DISCOVER',
        title: 'ORA guides product discovery',
        description:
          "ORA searches your catalog and recommends products that match. It can compare options, explain differences, suggest alternatives if something's out of stock, and answer detailed product questions.",
        imageSrc: '/previews/step-discover-v2.jpg',
      },
      {
        stepLabel: '4. CONVERT',
        title: 'ORA drives purchases',
        description:
          'Once the customer is ready, ORA manages the cart, handles last-minute questions about shipping or returns, and guides them directly to checkout.',
        imageSrc: '/previews/step-convert-v2.jpg',
      },
    ],
    faqs: [
      {
        q: 'Can I use ORA for Voice if I do not use Shopify?',
        a: 'Yes. ORA works with any web platform. You can embed the widget on any site with a single script tag. Native connectors are also provided for WooCommerce and custom React storefronts.',
      },
      {
        q: 'How is it different from a regular chatbot?',
        a: 'ORA is an ultra-low-latency real-time voice AI that speaks, listens, and understands context. Unlike text bots, it has conversational human timing, natural interruptions, and consultative selling ability.',
      },
      {
        q: 'How does ORA engage shoppers?',
        a: 'ORA can trigger proactive greetings based on visitor behavior (e.g. dwell time on high-intent product pages or cart abandonment) and responds dynamically to natural customer queries.',
      },
      {
        q: 'How does ORA connect to my store?',
        a: 'Via your Publishable Key. Copy the one-line embed script from the Setup section and paste it into your theme layout to go live instantly.',
      },
    ],
  },

  documents: {
    Icon: FileText,
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    roleName: 'ORA for Knowledge',
    heroTitle: 'ORA for Knowledge makes your store smarter',
    heroDesc:
      "ORA answers from your own store documents, so replies stay grounded in what you have published.",
    heroImageSrc: '/previews/role-docs-v2.jpg',
    cta1Label: 'Set up Knowledge Base',
    cta1Href: '/agent?role=documents&view=feed',
    cta2Label: 'Learn more',
    howLabel: 'HOW ORA KNOWLEDGE WORKS',
    rows: [
      {
        stepLabel: '1. UPLOAD',
        title: 'Upload your store documents',
        description:
          'Add store policies, shipping guidelines, size charts, warranty terms, and FAQs. ORA accepts PDF, DOCX, TXT, and Markdown.',
        imageSrc: '/previews/docs-step1-upload.jpg',
      },
      {
        stepLabel: '2. INDEX',
        title: 'ORA indexes and vectorises content',
        description:
          "ORA chunks and embeds your documents so it can retrieve the most relevant passage for a shopper's question.",
        imageSrc: '/previews/docs-step2-index.jpg',
      },
      {
        stepLabel: '3. ANSWER',
        title: 'ORA answers questions accurately',
        description:
          'When a shopper asks about return windows or warranty terms, ORA retrieves the verified document passage and quotes precise facts.',
        imageSrc: '/previews/docs-step3-answer.jpg',
      },
      {
        stepLabel: '4. IMPROVE',
        title: 'Knowledge improves over time',
        description:
          'Update documents anytime and ORA re-indexes in seconds. Discover unanswered customer queries to close knowledge gaps.',
        imageSrc: '/previews/docs-step4-improve.jpg',
      },
    ],
    faqs: [
      {
        q: 'What file types does ORA accept?',
        a: 'ORA accepts PDF, DOCX, TXT, and Markdown files. You can also paste raw text directly into the knowledge editor.',
      },
      {
        q: 'How quickly does ORA index new documents?',
        a: 'Indexing is near-instant (under 30 seconds for most documents). Vector embeddings are stored and ready immediately.',
      },
      {
        q: 'Does ORA hallucinate answers?',
        a: 'No. ORA uses strict grounded RAG retrieval. If an answer cannot be verified from your uploaded documents, it gracefully offers human escalation.',
      },
      {
        q: 'Can I delete or update documents?',
        a: 'Yes. You can edit, update, or permanently delete documents from the Knowledge view at any time.',
      },
    ],
  },

  products: {
    Icon: Package,
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    roleName: 'ORA for Catalog',
    heroTitle: 'ORA Catalog keeps your products searchable',
    heroDesc:
      'Sync your product inventory so ORA can answer stock availability, recommend items, and guide shoppers through checkout using live catalog data.',
    heroImageSrc: '/previews/role-products-v2.jpg',
    cta1Label: 'Sync Product Catalog',
    cta1Href: '/agent?role=products&view=catalog',
    cta2Label: 'Learn more',
    howLabel: 'HOW ORA CATALOG WORKS',
    rows: [
      {
        stepLabel: '1. SYNC',
        title: 'Connect your store inventory',
        description:
          'Connect your Shopify, WooCommerce, or custom CSV catalog. ORA imports titles, descriptions, prices, variants, and live stock counts.',
        imageSrc: '/previews/products-step1-sync.jpg',
      },
      {
        stepLabel: '2. SEARCH',
        title: 'Real-time semantic product search',
        description:
          'Shoppers describe what they need in natural speech or text. ORA matches intent against your catalog with instant stock checks.',
        imageSrc: '/previews/products-step2-search.jpg',
      },
      {
        stepLabel: '3. RECOMMEND',
        title: 'Smart upsells and alternative matching',
        description:
          'If an item is out of stock, ORA suggests matching alternatives. It cross-sells complementary products based on shopper preferences.',
        imageSrc: '/previews/step-discover-v2.jpg',
      },
      {
        stepLabel: '4. CONVERT',
        title: 'Direct cart adding and checkout',
        description:
          'Shoppers add products to their cart directly during the voice conversation. ORA provides instant checkout links for high conversion.',
        imageSrc: '/previews/step-convert-v2.jpg',
      },
    ],
    faqs: [
      {
        q: 'How does ORA keep track of inventory changes?',
        a: 'ORA syncs stock counts automatically via webhook on every purchase or stock update from Shopify and WooCommerce.',
      },
      {
        q: 'Can ORA handle variant options like size and color?',
        a: 'Yes. ORA understands multi-variant SKUs, asking clarifying questions about color, size, and style before adding to cart.',
      },
      {
        q: 'What if a product is out of stock?',
        a: 'ORA checks live stock before recommending items and proactively suggests similar in-stock alternatives.',
      },
      {
        q: 'Can ORA apply promotional discount codes?',
        a: 'Yes. ORA can apply valid coupon codes directly to the cart session.',
      },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AgentGetStartedPageProps {
  role: AgentRole;
}

export function AgentGetStartedPage({ role }: AgentGetStartedPageProps) {
  const content = ROLE_CONTENT[role] ?? ROLE_CONTENT.voice!;
  const {
    Icon,
    iconBgClass,
    iconTextClass,
    heroTitle,
    heroDesc,
    heroImageSrc,
    cta1Label,
    cta1Href,
    cta2Label,
    howLabel,
    rows,
    faqs,
  } = content;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="max-w-5xl mx-auto px-8 lg:px-12 pt-8 pb-16">

        {/* ── 1. HERO SECTION (INTERCOM FIN AI AGENT STYLE — SUBTLE ROUNDED-MD) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
          {/* Left Text Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Top Icon Badge */}
            <div className={cn('w-9 h-9 rounded-md flex items-center justify-center shadow-xs mb-1', iconBgClass)}>
              <Icon size={18} className={iconTextClass} />
            </div>

            {/* Display Title in Editorial Serif */}
            <h1 className="text-[28px] lg:text-[32px] font-semibold text-foreground tracking-tight leading-[1.2]">
              {heroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-[13.5px] text-muted-foreground/90 leading-relaxed max-w-lg mb-2">
              {heroDesc}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <AppLink
                href={cta1Href}
                className="inline-flex items-center h-8.5 px-4 rounded-md bg-foreground text-background font-semibold text-[12.5px] hover:opacity-90 transition-opacity shadow-xs"
              >
                {cta1Label}
              </AppLink>
              <AppLink
                href="/docs"
                className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-md border border-border/70 bg-surface-container/60 hover:bg-surface-container text-[12.5px] font-medium text-foreground transition-colors"
              >
                <BookOpen size={12} className="text-muted-foreground" />
                <span>{cta2Label}</span>
              </AppLink>
            </div>
          </div>

          {/* Right Mockup Card (5 cols) */}
          <div className="lg:col-span-5 h-[200px] w-full relative rounded-md overflow-hidden border border-border/40 shadow-xs bg-surface-container">
            <Image
              src={heroImageSrc}
              alt={heroTitle}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 420px"
              priority
            />
          </div>
        </div>

        {/* ── 2. SECTION DIVIDER: HOW IT WORKS ── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
            {howLabel}
          </p>
        </div>

        {/* ── 3. STEP ROWS (COMPACT PREMIUM CARDS ON LEFT, EDITORIAL ON RIGHT — SUBTLE ROUNDED-MD) ── */}
        <div className="space-y-8 mb-16">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-2"
            >
              {/* Left Column: Visual Mockup Box (5 cols) */}
              <div className="md:col-span-5 h-[190px] w-full relative rounded-md overflow-hidden border border-border/40 shadow-xs bg-surface-container">
                <Image
                  src={row.imageSrc}
                  alt={row.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 380px"
                />
              </div>

              {/* Right Column: Editorial Step Info (7 cols) */}
              <div className="md:col-span-7 flex flex-col gap-2 pl-0 md:pl-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {row.stepLabel}
                </p>
                <h2 className="text-[22px] font-semibold text-foreground tracking-tight leading-snug">
                  {row.title}
                </h2>
                <p className="text-[14px] text-muted-foreground leading-relaxed max-w-xl">
                  {row.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 4. FREQUENTLY ASKED QUESTIONS (INTERCOM ACCORDION STYLE) ── */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
            Frequently Asked Questions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
          {/* Left: Ask ORA link */}
          <div className="md:col-span-4 flex flex-col gap-2 pt-1">
            <p className="text-[13.5px] text-muted-foreground leading-relaxed">
              Can&apos;t find the answer here?
            </p>
            <AppLink
              href="/setup?step=persona"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-foreground dark:text-[#C8F031] font-medium underline underline-offset-4"
              fallback={
                <AppLink
                  href="/agent?role=voice&view=test"
                  className="inline-flex items-center gap-1.5 text-[13.5px] text-foreground dark:text-[#C8F031] font-medium underline underline-offset-4"
                >
                  <span>Ask ORA Agent</span>
                  <ArrowRight size={13} />
                </AppLink>
              }
            >
              <span>Ask ORA Agent</span>
              <ArrowRight size={13} />
            </AppLink>
          </div>

          {/* Right: FAQ Accordions */}
          <div className="md:col-span-8 space-y-2.5">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-md border border-border/50 bg-transparent hover:border-border/80 transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-[14px] font-medium text-foreground pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        'text-muted-foreground flex-shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180 text-foreground',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 animate-in fade-in duration-150 border-t border-border/30 mt-1">
                      <p className="text-[13.5px] text-muted-foreground leading-relaxed pt-2.5">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
