'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AgentRole } from './agent-section-nav';

// ─── Content definitions per role ─────────────────────────────────────────────

type HowRow = {
  stepLabel: string;
  title: string;
  description: string;
  imageSrc: string;
  containerClass: string; // bg tint class for the screenshot container
};

type FaqItem = { q: string; a: string };
type GetStartedStep = { action: string; desc: string; href: string };

type RolePageContent = {
  Icon: React.ElementType;
  iconClass: string;
  heroTitle: string;
  heroDesc: string;
  cta1Label: string;
  cta1Href: string;
  cta2Label: string;
  heroImageSrc: string;
  howLabel: string;
  rows: HowRow[];
  faqs: FaqItem[];
  gettingStarted: GetStartedStep[];
  gsImageSrc: string;
};

import { Mic, FileText, Package } from 'lucide-react';

const ROLE_CONTENT: Record<AgentRole, RolePageContent> = {
  voice: {
    Icon: Mic,
    iconClass: 'text-primary',
    heroTitle: 'ORA Voice drives purchases on your store',
    heroDesc: 'ORA connects seamlessly with your store to aid with product discovery and reduce buying friction through real-time voice AI.',
    cta1Label: 'Set up ORA Voice',
    cta1Href: '/setup',
    cta2Label: 'Learn more',
    heroImageSrc: '/previews/voice-preview.jpg',
    howLabel: 'HOW ORA VOICE WORKS',
    rows: [
      {
        stepLabel: '1. ENGAGE',
        title: 'ORA engages shoppers on your store',
        description: "ORA greets visitors and picks up on what they're looking for — whether they arrive with a specific question, land on a product page, or are just browsing.",
        imageSrc: '/previews/voice-preview.jpg',
        containerClass: 'bg-primary/[0.08]',
      },
      {
        stepLabel: '2. UNDERSTAND',
        title: 'ORA understands shopper needs',
        description: 'Through natural voice conversation, ORA finds out what the customer actually needs. It asks the right questions about size, use case, preferences, and budget.',
        imageSrc: '/previews/voice-preview.jpg',
        containerClass: 'bg-primary/[0.08]',
      },
      {
        stepLabel: '3. DISCOVER',
        title: 'ORA guides product discovery',
        description: "ORA searches your catalog and recommends products that match. It can compare options, explain differences, and suggest alternatives if something's out of stock.",
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-primary/[0.08]',
      },
      {
        stepLabel: '4. CONVERT',
        title: 'ORA drives purchases',
        description: 'Once the customer is ready, ORA manages the cart, handles last-minute questions about shipping or returns, and guides them to checkout — all without leaving the conversation.',
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-[color:var(--ora-info)]/[0.08]',
      },
    ],
    faqs: [
      { q: 'Can I use ORA Voice without Shopify?', a: 'Yes. ORA works with any platform. Embed the widget on any site using a script tag. Shopify and WooCommerce have native integrations.' },
      { q: 'How is ORA different from a regular chatbot?', a: 'ORA is a real-time speech-to-speech AI that speaks and listens. Unlike text chatbots, it handles complex multi-turn voice conversations naturally.' },
      { q: 'How does ORA engage shoppers?', a: "ORA initiates conversations proactively based on the shopper's context — product page, cart, or search query — and responds to their voice naturally." },
      { q: 'How does ORA connect to my store?', a: 'Via your Publishable Key. Copy the widget snippet from the Setup page and paste it into your store theme or layout.' },
    ],
    gettingStarted: [
      { action: 'Train ORA with your products →', desc: 'Upload store policies and use voice training to feed product knowledge directly to ORA.', href: '/agent?role=voice&view=feed' },
      { action: 'Deploy ORA to your store →', desc: 'Embed the ORA widget on your storefront with a single script tag.', href: '/setup' },
    ],
    gsImageSrc: '/previews/voice-preview.jpg',
  },

  documents: {
    Icon: FileText,
    iconClass: 'text-[color:var(--ora-info)]',
    heroTitle: 'ORA Knowledge makes your store smarter',
    heroDesc: "ORA's knowledge base connects seamlessly with your store documents to provide accurate, instant answers — eliminating hallucinations and improving trust.",
    cta1Label: 'Set up Knowledge',
    cta1Href: '/setup',
    cta2Label: 'Learn more',
    heroImageSrc: '/previews/docs-preview.jpg',
    howLabel: 'HOW KNOWLEDGE WORKS',
    rows: [
      {
        stepLabel: '1. UPLOAD',
        title: 'Upload your store documents',
        description: 'Add policies, shipping guides, FAQs, warranty documents, and any reference files. ORA accepts PDF, DOCX, TXT, and plain text.',
        imageSrc: '/previews/docs-preview.jpg',
        containerClass: 'bg-[color:var(--ora-info)]/[0.08]',
      },
      {
        stepLabel: '2. INDEX',
        title: 'ORA indexes and vectorises content',
        description: "ORA's RAG engine processes your documents, splits them into chunks, and stores them in a vector database for sub-85ms retrieval.",
        imageSrc: '/previews/docs-preview.jpg',
        containerClass: 'bg-[color:var(--ora-info)]/[0.08]',
      },
      {
        stepLabel: '3. ANSWER',
        title: 'ORA answers questions accurately',
        description: 'When a shopper asks about return windows, shipping times, or warranty terms, ORA retrieves the precise document passage and responds accurately.',
        imageSrc: '/previews/docs-preview.jpg',
        containerClass: 'bg-[color:var(--ora-info)]/[0.08]',
      },
      {
        stepLabel: '4. IMPROVE',
        title: 'Knowledge improves over time',
        description: 'Update documents and ORA re-indexes instantly. Track which topics shoppers ask about most, and fill knowledge gaps proactively.',
        imageSrc: '/previews/docs-preview.jpg',
        containerClass: 'bg-primary/[0.08]',
      },
    ],
    faqs: [
      { q: 'What file types does ORA accept?', a: 'ORA accepts PDF, DOCX, TXT, and plain text files. Spreadsheets can be exported as CSV or PDF for upload.' },
      { q: 'How many documents can I upload?', a: 'There is no hard limit on document count. The plan limit applies to total indexed tokens.' },
      { q: 'How quickly does ORA index new documents?', a: 'Indexing is near-instant for most documents (under 30 seconds). Larger files may take a few minutes.' },
      { q: 'Can I update or delete documents?', a: 'Yes. From the knowledge base view you can re-upload, update, or permanently delete any document.' },
    ],
    gettingStarted: [
      { action: 'Upload your store policies →', desc: 'Add return policies, shipping guides, and FAQ documents to ORA.', href: '/agent?role=documents&view=feed' },
      { action: 'Sync your product catalog →', desc: 'Connect Shopify or WooCommerce so ORA has live product data.', href: '/agent?role=products' },
    ],
    gsImageSrc: '/previews/docs-preview.jpg',
  },

  products: {
    Icon: Package,
    iconClass: 'text-[color:var(--ora-warning)]',
    heroTitle: 'ORA Catalog keeps your products searchable',
    heroDesc: 'Sync your product inventory so ORA can answer availability questions, recommend items, and guide shoppers through checkout using live catalog data.',
    cta1Label: 'Sync your catalog',
    cta1Href: '/setup',
    cta2Label: 'Learn more',
    heroImageSrc: '/previews/products-preview.jpg',
    howLabel: 'HOW PRODUCT CATALOG WORKS',
    rows: [
      {
        stepLabel: '1. SYNC',
        title: 'Connect your Shopify or WooCommerce',
        description: 'Link your store via the native Shopify or WooCommerce integration. ORA pulls live product data — titles, descriptions, prices, variants, and inventory.',
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-[color:var(--ora-warning)]/[0.08]',
      },
      {
        stepLabel: '2. INDEX',
        title: 'Products are indexed for fast search',
        description: "ORA's vector engine indexes your entire catalog. Shoppers can search by natural language — 'a lightweight running shoe under $80' — and ORA finds matches instantly.",
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-[color:var(--ora-warning)]/[0.08]',
      },
      {
        stepLabel: '3. RECOMMEND',
        title: 'ORA recommends relevant products',
        description: 'ORA matches shopper intent to catalog items, handles variant selection, compares alternatives, and answers detailed product questions without human help.',
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-[color:var(--ora-warning)]/[0.08]',
      },
      {
        stepLabel: '4. CONVERT',
        title: 'ORA guides shoppers to checkout',
        description: 'Once a shopper selects a product, ORA assists with cart management, applies discount codes, answers last-minute shipping questions, and guides them to complete the purchase.',
        imageSrc: '/previews/products-preview.jpg',
        containerClass: 'bg-primary/[0.08]',
      },
    ],
    faqs: [
      { q: 'Does ORA work without Shopify?', a: 'Yes. You can upload a CSV product file or connect WooCommerce. Shopify has the deepest native integration.' },
      { q: 'How often does ORA sync product data?', a: 'ORA syncs on-demand. Click "Sync now" in the catalog view, or we will auto-sync every 24 hours.' },
      { q: 'Can ORA handle product variants?', a: 'Yes. ORA understands size, color, material, and other variant attributes and helps shoppers select the right one.' },
      { q: 'What happens when a product is out of stock?', a: 'ORA detects out-of-stock status and proactively suggests alternatives from your catalog.' },
    ],
    gettingStarted: [
      { action: 'Connect your store →', desc: 'Link your store so ORA can access your product catalog, inventory, and order data.', href: '/agent?role=products&view=catalog' },
      { action: 'Deploy ORA to your store →', desc: 'Embed the ORA widget on your storefront so shoppers can start using it.', href: '/setup' },
    ],
    gsImageSrc: '/previews/products-preview.jpg',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AgentGetStartedPageProps {
  role: AgentRole;
}

export function AgentGetStartedPage({ role }: AgentGetStartedPageProps) {
  const content = ROLE_CONTENT[role];
  const { Icon, iconClass, heroTitle, heroDesc, cta1Label, cta1Href, cta2Label, heroImageSrc, howLabel, rows, faqs, gettingStarted, gsImageSrc } = content;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="w-full px-8 lg:px-10 pt-8 pb-14">

        {/* ── Hero — icon+text LEFT | screenshot RIGHT ── */}
        <div className="flex items-start gap-10 mb-10">
          {/* Left text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={22} className={iconClass} />
            </div>
            <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-snug mb-3">
              {heroTitle}
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5 max-w-lg">
              {heroDesc}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={cta1Href}
                className="inline-flex items-center h-8 px-4 rounded-md border border-border text-[12px] font-medium text-foreground hover:bg-surface-container transition-colors"
              >
                {cta1Label}
              </Link>
              <button className="inline-flex items-center gap-1 h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium">
                <span className="w-3.5 h-3.5 border border-current rounded-sm flex items-center justify-center text-[8px]">?</span>
                {cta2Label}
              </button>
            </div>
          </div>

          {/* Right: screenshot */}
          <div className="relative w-[300px] h-[175px] flex-shrink-0 rounded-xl overflow-hidden bg-surface-container">
            <Image src={heroImageSrc} alt={heroTitle} fill className="object-cover object-top" sizes="300px" />
          </div>
        </div>

        {/* ── HOW IT WORKS — section label ── */}
        <div className="flex items-center gap-2 mb-7">
          <span className="w-[3px] h-3.5 rounded-full bg-primary flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            {howLabel}
          </p>
        </div>

        {/* ── HOW IT WORKS rows ── */}
        <div className="space-y-8 mb-12">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-8 items-center">
              {/* Left: colored container with screenshot */}
              <div className={cn('flex-1 min-w-0 rounded-xl overflow-hidden', row.containerClass)}>
                <div className="relative w-full" style={{ paddingTop: '60%' }}>
                  <Image
                    src={row.imageSrc}
                    alt={row.stepLabel}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1200px) 50vw, 600px"
                  />
                </div>
              </div>

              {/* Right: step info */}
              <div className="w-[320px] flex-shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {row.stepLabel}
                </p>
                <h2 className="text-[19px] font-bold text-foreground leading-snug mb-2">
                  {row.title}
                </h2>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {row.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FREQUENTLY ASKED QUESTIONS ── */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-[3px] h-3.5 rounded-full bg-primary flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Frequently Asked Questions
          </p>
        </div>

        <div className="flex gap-10 mb-12">
          {/* Left: can't find + contact */}
          <div className="w-[220px] flex-shrink-0 pt-1">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-2">
              Can't find the answer here?
            </p>
            <Link href="/live-desk" className="inline-flex items-center gap-1 text-[12.5px] text-primary font-medium hover:underline">
              Ask ORA AI Agent <ArrowRight size={11} />
            </Link>
          </div>

          {/* Right: FAQ accordion */}
          <div className="flex-1 divide-y divide-border/30">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-3 text-left hover:opacity-75 transition-opacity"
                >
                  <span className="text-[13px] font-medium text-foreground pr-4">{faq.q}</span>
                  <ChevronDown
                    size={13}
                    className={cn('text-muted-foreground flex-shrink-0 transition-transform duration-150', openFaq === i && 'rotate-180')}
                  />
                </button>
                {openFaq === i && (
                  <div className="pb-3 animate-in fade-in duration-150">
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── HOW TO GET STARTED ── */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-[3px] h-3.5 rounded-full bg-primary flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            How to Get Started
          </p>
        </div>

        <div className="flex gap-10 items-start">
          {/* Left: numbered steps */}
          <div className="flex-1 space-y-4">
            {gettingStarted.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-[12px] text-muted-foreground font-medium w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div>
                  <Link href={step.href} className="text-[13px] font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {step.action} <ArrowRight size={11} className="flex-shrink-0" />
                  </Link>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Link href="/docs" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground font-medium transition-colors">
                <span className="w-3.5 h-3.5 border border-current rounded-sm flex items-center justify-center text-[8px]">i</span>
                Learn more
              </Link>
            </div>
          </div>

          {/* Right: screenshot */}
          <div className="relative w-[280px] h-[180px] flex-shrink-0 rounded-xl overflow-hidden bg-surface-container">
            <Image src={gsImageSrc} alt="Get started" fill className="object-cover object-top" sizes="280px" />
          </div>
        </div>

      </div>
    </div>
  );
}
