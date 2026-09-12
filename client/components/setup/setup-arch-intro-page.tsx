'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ChevronDown,
  ArrowRight,
  BookOpen,
  ShoppingBag,
  Layers,
  Briefcase,
  Users,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SetupArchetype, ARCHETYPES } from './setup-section-nav';
import { AppLink } from '@/components/navigation/app-link';

// ─── Per-Archetype Editorial & Image Definitions ──────────────────────────────

type HowRow = {
  stepLabel: string;
  title: string;
  description: string;
  imageSrc: string;
};

type FaqItem = { q: string; a: string };

type ArchPageContent = {
  iconBgClass: string;
  iconTextClass: string;
  heroTitle: string;
  heroDesc: string;
  cta1Label: string;
  cta1Href: string;
  heroImageSrc: string;
  howLabel: string;
  rows: HowRow[];
  faqs: FaqItem[];
};

const ARCH_CONTENT: Record<SetupArchetype, ArchPageContent> = {
  ecommerce: {
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    heroTitle: 'ORA for E-Commerce drives purchases on your store',
    heroDesc:
      'ORA connects seamlessly with your store catalog to guide product discovery, answer live sizing questions, and reduce buying friction through real-time voice AI.',
    cta1Label: 'Set up ORA for E-Commerce',
    cta1Href: '/setup?archetype=ecommerce&step=persona',
    heroImageSrc: '/previews/ecom-hero.jpg',
    howLabel: 'HOW ORA FOR E-COMMERCE WORKS',
    rows: [
      {
        stepLabel: '1. ENGAGE',
        title: 'ORA engages shoppers on your store',
        description:
          "ORA greets visitors proactively on high-intent product pages or during cart pauses — picking up on what they're looking for whether they arrive with a question or are just browsing.",
        imageSrc: '/previews/ecom-step1.jpg',
      },
      {
        stepLabel: '2. UNDERSTAND',
        title: 'ORA understands shopper needs',
        description:
          'Through natural voice and text conversation, ORA clarifies what the customer actually needs — asking the right questions about sizing, materials, intended use, and budget.',
        imageSrc: '/previews/ecom-step2.jpg',
      },
      {
        stepLabel: '3. DISCOVER',
        title: 'ORA guides product discovery',
        description:
          "ORA searches your live inventory and recommends matching products. It compares specifications side-by-side, explains key differences, and surfaces in-stock alternatives.",
        imageSrc: '/previews/ecom-step3.jpg',
      },
      {
        stepLabel: '4. CONVERT',
        title: 'ORA drives purchases',
        description:
          'Once the customer is ready, ORA manages the cart, applies active promotional discounts, answers last-minute shipping or return questions, and guides them directly to checkout.',
        imageSrc: '/previews/ecom-step4.jpg',
      },
    ],
    faqs: [
      {
        q: 'Can I use ORA without Shopify?',
        a: 'Yes. ORA works with WooCommerce, custom React storefronts, or any web platform via a single script tag. Native connectors are also provided for one-click setup.',
      },
      {
        q: 'How does ORA know my products & inventory?',
        a: 'Sync your catalog from Shopify or WooCommerce, or upload a product CSV. ORA indexes product titles, descriptions, prices, variants, and stock counts for instant retrieval.',
      },
      {
        q: 'Does ORA handle abandoned carts & hesitant buyers?',
        a: 'Yes. ORA detects checkout dwell time and proactive exit intent, answering last-minute shipping and warranty objections to recover abandoned carts.',
      },
      {
        q: 'How quickly can I go live on my storefront?',
        a: 'Typically under 5 minutes: select your voice persona, copy the one-line embed script snippet, sync your catalog, and launch a test conversation.',
      },
    ],
  },

  saas: {
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    heroTitle: 'ORA for SaaS converts trials and reduces churn',
    heroDesc:
      'ORA guides prospective users through your platform, compares subscription tiers, answers technical API questions, and accelerates trial-to-paid activation.',
    cta1Label: 'Set up ORA for SaaS',
    cta1Href: '/setup?archetype=saas&step=persona',
    heroImageSrc: '/previews/saas-hero.jpg',
    howLabel: 'HOW ORA FOR SAAS WORKS',
    rows: [
      {
        stepLabel: '1. QUALIFY',
        title: 'ORA qualifies incoming prospects',
        description:
          "ORA asks targeted questions to understand team size, use case, and technical requirements — routing high-intent enterprise leads directly to your sales pipeline.",
        imageSrc: '/previews/saas-hero.jpg',
      },
      {
        stepLabel: '2. EDUCATE',
        title: 'ORA explains features and tiers',
        description:
          'ORA walks prospects through your product capabilities, compares pricing plans, and answers technical API questions accurately from your uploaded documentation.',
        imageSrc: '/previews/ecom-step2.jpg',
      },
      {
        stepLabel: '3. CONVERT',
        title: 'ORA drives trial sign-ups',
        description:
          'When a prospect is ready, ORA guides them to start a trial, apply promo codes, or book a live demo — all without leaving the conversation.',
        imageSrc: '/previews/saas-hero.jpg',
      },
      {
        stepLabel: '4. RETAIN',
        title: 'ORA reduces trial-to-paid churn',
        description:
          'During the trial period, ORA proactively assists new users, helps them discover key integrations, and surfaces upgrade prompts at the optimal moment.',
        imageSrc: '/previews/ecom-step4.jpg',
      },
    ],
    faqs: [
      {
        q: 'Can ORA answer technical product and API questions?',
        a: "Yes. Upload your API documentation, help center articles, and changelogs. ORA's grounded RAG engine retrieves accurate technical answers with zero hallucination.",
      },
      {
        q: 'Does ORA support multi-tier subscription models?',
        a: 'Yes. Configure ORA to explain tier differences (Starter, Pro, Enterprise), seat allowances, and custom add-on pricing conversationally.',
      },
      {
        q: 'Can ORA book demos directly on my calendar?',
        a: 'ORA can guide qualified leads to Calendly, Cal.com, or your custom booking URL directly during the conversation.',
      },
      {
        q: 'How does ORA help reduce trial drop-off?',
        a: 'ORA monitors user milestones and proactively assists trial accounts who haven’t completed essential onboarding steps.',
      },
    ],
  },

  agency: {
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    heroTitle: 'ORA for Agencies qualifies leads and books clients',
    heroDesc:
      'ORA presents your core service packages, scopes incoming inquiries by timeline and budget, and books discovery calls directly into your calendar — 24/7.',
    cta1Label: 'Set up ORA for Agency',
    cta1Href: '/setup?archetype=agency&step=persona',
    heroImageSrc: '/previews/agency-hero.jpg',
    howLabel: 'HOW ORA FOR AGENCIES WORKS',
    rows: [
      {
        stepLabel: '1. ENGAGE',
        title: 'ORA engages prospective clients',
        description:
          'ORA greets visitors browsing your portfolio and services, answers questions about your design and engineering process, and builds credibility upfront.',
        imageSrc: '/previews/agency-hero.jpg',
      },
      {
        stepLabel: '2. QUALIFY',
        title: 'ORA qualifies and scopes the project',
        description:
          'ORA asks about project deliverables, desired timeline, budget parameters, and team stakeholders — filtering serious engagements from low-intent inquiries automatically.',
        imageSrc: '/previews/ecom-step2.jpg',
      },
      {
        stepLabel: '3. PRESENT',
        title: 'ORA presents your service packages',
        description:
          "ORA walks prospects through your service tiers (e.g. Brand Sprint, Full Stack Build), explains what's included, and compares engagement models.",
        imageSrc: '/previews/agency-hero.jpg',
      },
      {
        stepLabel: '4. BOOK',
        title: 'ORA books discovery calls',
        description:
          'When a prospect is ready to move forward, ORA guides them to your booking calendar or captures their details for immediate team follow-up.',
        imageSrc: '/previews/ecom-step4.jpg',
      },
    ],
    faqs: [
      {
        q: 'Can ORA handle custom agency scopes and retainers?',
        a: "Yes. Upload your service menu, pricing tiers, and case studies. ORA presents the right engagement model based on the client's needs and budget.",
      },
      {
        q: 'How does ORA filter qualified leads?',
        a: 'ORA asks structured scoping questions and passes complete lead summaries to your CRM or team notification channels.',
      },
      {
        q: 'Does ORA work on Webflow or WordPress sites?',
        a: 'Yes. Add the one-line ORA widget script to any site builder or custom CMS that allows custom code injection.',
      },
      {
        q: 'Can ORA book calls directly with team members?',
        a: 'ORA can integrate with Calendly, Cal.com, or HubSpot Meetings to let clients pick an open time slot right in the widget.',
      },
    ],
  },

  portfolio: {
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    heroTitle: 'ORA for Creators showcases your work and books clients',
    heroDesc:
      'ORA presents your creative portfolio, answers project inquiries, explains your rates and availability, and books clients directly — 24/7.',
    cta1Label: 'Set up ORA for Creator',
    cta1Href: '/setup?archetype=portfolio&step=persona',
    heroImageSrc: '/previews/portfolio-hero.jpg',
    howLabel: 'HOW ORA FOR CREATORS WORKS',
    rows: [
      {
        stepLabel: '1. SHOWCASE',
        title: 'ORA showcases your best work',
        description:
          'Visitors can ask about your past projects, creative philosophy, and tools. ORA walks them through your portfolio with compelling narrative context.',
        imageSrc: '/previews/portfolio-hero.jpg',
      },
      {
        stepLabel: '2. ANSWER',
        title: 'ORA answers availability & rate Qs',
        description:
          'ORA handles common questions about your day rates, project minimums, and upcoming calendar availability — saving you hours of email back-and-forth.',
        imageSrc: '/previews/ecom-step2.jpg',
      },
      {
        stepLabel: '3. QUALIFY',
        title: 'ORA qualifies project fit',
        description:
          'ORA asks about project scope, budget, and timeline to ensure the client’s vision matches your creative direction before forwarding the inquiry.',
        imageSrc: '/previews/portfolio-hero.jpg',
      },
      {
        stepLabel: '4. BOOK',
        title: 'ORA books the project',
        description:
          'Ready clients are guided directly to your booking form, contract deposit page, or discovery call link without manual overhead.',
        imageSrc: '/previews/ecom-step4.jpg',
      },
    ],
    faqs: [
      {
        q: 'Can ORA describe portfolio pieces & link to case studies?',
        a: 'Yes. Upload project briefs, media URLs, and client results. ORA references them accurately when prospective clients inquire.',
      },
      {
        q: 'Does ORA know my pricing & day rates?',
        a: 'Yes. Upload your rate card or minimum engagement terms, and ORA will quote them transparently when asked.',
      },
      {
        q: 'Can ORA work on Squarespace or Framer sites?',
        a: 'Yes. Simply copy and paste the one-line ORA embed snippet into your custom site settings.',
      },
      {
        q: 'How does ORA handle booking confirmations?',
        a: 'ORA guides clients to your booking link or deposit checkout page at the exact moment of peak interest.',
      },
    ],
  },

  general: {
    iconBgClass: 'bg-surface-high border border-border/60 shadow-sm',
    iconTextClass: 'text-foreground',
    heroTitle: 'ORA for Enterprise delivers verified answers at scale',
    heroDesc:
      'ORA handles high-volume corporate questions using your verified company knowledge base — policies, FAQs, standard operating procedures — with sub-85ms accuracy.',
    cta1Label: 'Set up ORA for Enterprise',
    cta1Href: '/setup?archetype=general&step=persona',
    heroImageSrc: '/previews/enterprise-hero.jpg',
    howLabel: 'HOW ORA FOR ENTERPRISE WORKS',
    rows: [
      {
        stepLabel: '1. INDEX',
        title: 'ORA indexes company knowledge',
        description:
          "Upload policies, procedures, compliance guidelines, and FAQs. ORA's enterprise RAG engine vectorises and indexes them with sub-85ms latency.",
        imageSrc: '/previews/enterprise-hero.jpg',
      },
      {
        stepLabel: '2. ANSWER',
        title: 'ORA answers questions accurately',
        description:
          'Employees and customers ask questions in natural speech or text. ORA retrieves the exact policy passage with source citations and zero hallucinations.',
        imageSrc: '/previews/ecom-step2.jpg',
      },
      {
        stepLabel: '3. ESCALATE',
        title: 'ORA routes complex cases',
        description:
          'When ORA encounters an unverified edge case, it flags the conversation and routes it seamlessly to the responsible human department.',
        imageSrc: '/previews/enterprise-hero.jpg',
      },
      {
        stepLabel: '4. IMPROVE',
        title: 'Knowledge improves over time',
        description:
          'Track frequent questions, identify knowledge gaps, and update documents. ORA re-indexes instantly to keep organizational intelligence up to date.',
        imageSrc: '/previews/ecom-step4.jpg',
      },
    ],
    faqs: [
      {
        q: 'What document formats are supported?',
        a: 'PDF, DOCX, TXT, and Markdown files. Structured data like CSV spreadsheets are also indexed automatically.',
      },
      {
        q: 'How does ORA maintain data security & compliance?',
        a: 'All data is encrypted in transit and at rest with strict tenant isolation. Customer conversations are never used to train global models.',
      },
      {
        q: 'Can ORA be deployed on internal intranets?',
        a: 'Yes. Embed ORA on internal company portals, employee dashboards, or customer support desks with authenticated scoping.',
      },
      {
        q: 'Can ORA restrict answers by department or role?',
        a: "Yes. Configure ORA's custom directives and collection tags to scope access to designated knowledge bases.",
      },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface SetupArchIntroPageProps {
  archetype: SetupArchetype;
}

export function SetupArchIntroPage({ archetype }: SetupArchIntroPageProps) {
  const arch = ARCHETYPES.find((a) => a.id === archetype) || ARCHETYPES[0];
  const content = ARCH_CONTENT[archetype] || ARCH_CONTENT.ecommerce;
  const { Icon } = arch;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="max-w-5xl mx-auto px-8 lg:px-12 pt-8 pb-16">

        {/* ── 1. HERO SECTION (INTERCOM FIN AI AGENT STYLE) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
          {/* Left Text Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Top Icon Badge */}
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shadow-md mb-1', content.iconBgClass)}>
              <Icon size={18} className={content.iconTextClass} />
            </div>

            {/* Display Title in Editorial Serif */}
            <h1 className="text-[28px] lg:text-[32px] font-semibold text-foreground tracking-tight leading-[1.2] font-serif">
              {content.heroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-[13.5px] text-muted-foreground/90 leading-relaxed max-w-lg mb-2">
              {content.heroDesc}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <AppLink
                href={content.cta1Href}
                className="inline-flex items-center h-8.5 px-4 rounded-lg bg-white text-neutral-950 font-semibold text-[12.5px] hover:bg-neutral-200 transition-colors shadow-sm"
              >
                {content.cta1Label}
              </AppLink>
              <AppLink
                href="/docs"
                className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-lg border border-border/70 bg-surface-container/60 hover:bg-surface-container text-[12.5px] font-medium text-foreground transition-colors"
              >
                <BookOpen size={12} className="text-muted-foreground" />
                <span>Learn more</span>
              </AppLink>
            </div>
          </div>

          {/* Right Mockup Card (5 cols) */}
          <div className="lg:col-span-5 h-[200px] w-full relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl bg-surface-container">
            <Image
              src={content.heroImageSrc}
              alt={content.heroTitle}
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
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
            {content.howLabel}
          </p>
        </div>

        {/* ── 3. STEP ROWS (COMPACT PREMIUM CARDS ON LEFT, EDITORIAL ON RIGHT) ── */}
        <div className="space-y-8 mb-16">
          {content.rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-2"
            >
              {/* Left Column: Visual Mockup Box (5 cols) */}
              <div className="md:col-span-5 h-[190px] w-full relative rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-surface-container">
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
                <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {row.stepLabel}
                </p>
                <h2 className="text-[22px] font-semibold text-foreground tracking-tight leading-snug font-serif">
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
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
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
              className="inline-flex items-center gap-1.5 text-[13.5px] text-primary font-medium hover:underline"
            >
              <span>Ask ORA Agent</span>
              <ArrowRight size={13} />
            </AppLink>
          </div>

          {/* Right: FAQ Accordions */}
          <div className="md:col-span-8 space-y-2.5">
            {content.faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-surface-container/30 hover:border-border/80 transition-colors overflow-hidden"
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
