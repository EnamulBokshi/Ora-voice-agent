'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SetupArchetype, ARCHETYPES } from './setup-section-nav';

// ─── Per-archetype editorial content ─────────────────────────────────────────

type HowRow = {
  stepLabel: string;
  title: string;
  description: string;
  containerClass: string;
};

type FaqItem    = { q: string; a: string };
type GetStarted = { action: string; desc: string; href: string };

type ArchPageContent = {
  heroTitle: string;
  heroDesc: string;
  cta1Label: string;
  cta1Href: string;
  heroImageSrc: string;
  howLabel: string;
  rows: HowRow[];
  faqs: FaqItem[];
  gettingStarted: GetStarted[];
};

const ARCH_CONTENT: Record<SetupArchetype, ArchPageContent> = {
  ecommerce: {
    heroTitle:    'ORA for E-Commerce drives purchases on your store',
    heroDesc:     'ORA connects seamlessly with your store to aid with product discovery and reduce buying friction through real-time voice AI.',
    cta1Label:    'Set up ORA for E-Commerce',
    cta1Href:     '/setup?archetype=ecommerce&step=persona',
    heroImageSrc: '/previews/products-preview.jpg',
    howLabel:     'HOW ORA FOR E-COMMERCE WORKS',
    rows: [
      { stepLabel: '1. ENGAGE',    title: 'ORA engages shoppers on your store',   description: 'ORA greets visitors and picks up on what they\'re looking for — whether they arrive with a specific question, land on a product page, or are just browsing.', containerClass: 'bg-primary/[0.08]' },
      { stepLabel: '2. UNDERSTAND',title: 'ORA understands shopper needs',         description: 'Through natural voice conversation, ORA finds out what the customer actually needs — size, use case, preferences, and budget.',                              containerClass: 'bg-primary/[0.08]' },
      { stepLabel: '3. DISCOVER',  title: 'ORA guides product discovery',          description: 'ORA searches your catalog and recommends products that match. It can compare options, explain differences, and suggest alternatives.',                         containerClass: 'bg-primary/[0.08]' },
      { stepLabel: '4. CONVERT',   title: 'ORA drives purchases',                  description: 'Once the customer is ready, ORA handles cart management, last-minute shipping questions, and guides them to checkout.',                                        containerClass: 'bg-[color:var(--ora-info)]/[0.08]' },
    ],
    faqs: [
      { q: 'Can I use ORA without Shopify?',    a: 'Yes. ORA works with WooCommerce, custom React stores, or any platform via a script tag.' },
      { q: 'How does ORA know my products?',    a: 'Sync your catalog from Shopify/WooCommerce or upload a CSV. ORA indexes all product data for fast retrieval.' },
      { q: 'Does ORA handle cart recovery?',    a: 'Yes. ORA proactively engages with cart-abandonment context and guides shoppers back to checkout.' },
      { q: 'How quickly can I go live?',        a: 'Typically 3–5 minutes: set persona, embed the widget, sync catalog, and run a voice test.' },
    ],
    gettingStarted: [
      { action: 'Configure your persona →',   desc: 'Select E-Commerce archetype and set your brand voice tone.',                  href: '/setup?archetype=ecommerce&step=persona'     },
      { action: 'Embed ORA on your store →',  desc: 'Copy the widget snippet and paste it into your store theme or layout.',       href: '/setup?archetype=ecommerce&step=integration' },
    ],
  },

  saas: {
    heroTitle:    'ORA for SaaS converts trials and reduces churn',
    heroDesc:     'ORA guides prospects through your product, explains subscription tiers, handles feature questions, and proactively reduces trial drop-off.',
    cta1Label:    'Set up ORA for SaaS',
    cta1Href:     '/setup?archetype=saas&step=persona',
    heroImageSrc: '/previews/voice-preview.jpg',
    howLabel:     'HOW ORA FOR SAAS WORKS',
    rows: [
      { stepLabel: '1. QUALIFY',   title: 'ORA qualifies incoming prospects',      description: 'ORA asks the right questions to understand the prospect\'s team size, use case, and pain points — routing high-intent leads to your sales team.', containerClass: 'bg-[color:var(--ora-info)]/[0.08]' },
      { stepLabel: '2. EDUCATE',   title: 'ORA explains features and tiers',       description: 'ORA walks prospects through your product capabilities, compares pricing plans, and answers technical questions accurately from your docs.',      containerClass: 'bg-[color:var(--ora-info)]/[0.08]' },
      { stepLabel: '3. CONVERT',   title: 'ORA drives trial sign-ups',             description: 'When a prospect is ready, ORA guides them to sign up, apply a discount code, or book a demo — without leaving the conversation.',               containerClass: 'bg-[color:var(--ora-info)]/[0.08]' },
      { stepLabel: '4. RETAIN',    title: 'ORA reduces trial-to-paid churn',       description: 'During trial, ORA proactively reaches out, helps users discover key features, and surfaces upgrade prompts at the right moment.',               containerClass: 'bg-primary/[0.08]' },
    ],
    faqs: [
      { q: 'Can ORA answer technical product questions?',  a: 'Yes. Upload your docs, help articles, and changelogs. ORA\'s RAG engine retrieves accurate answers in real time.' },
      { q: 'Does ORA support multi-tier pricing?',         a: 'Yes. Configure ORA to explain your pricing tiers, feature differences, and upgrade paths conversationally.' },
      { q: 'Can ORA book demos?',                          a: 'ORA can guide users to your booking link or trigger a Calendly embed during conversation.' },
      { q: 'How does ORA reduce churn?',                   a: 'ORA monitors trial milestones and proactively engages users who haven\'t activated key features.' },
    ],
    gettingStarted: [
      { action: 'Configure your persona →',   desc: 'Select SaaS archetype and set your product\'s voice tone.',             href: '/setup?archetype=saas&step=persona'     },
      { action: 'Upload your docs →',         desc: 'Add help articles, feature docs, and pricing info to ORA\'s knowledge.', href: '/setup?archetype=saas&step=knowledge'   },
    ],
  },

  agency: {
    heroTitle:    'ORA for Agencies books more clients on autopilot',
    heroDesc:     'ORA presents your service packages, qualifies inbound leads, handles scoping questions, and books discovery calls — without a sales team.',
    cta1Label:    'Set up ORA for Agency',
    cta1Href:     '/setup?archetype=agency&step=persona',
    heroImageSrc: '/previews/docs-preview.jpg',
    howLabel:     'HOW ORA FOR AGENCIES WORKS',
    rows: [
      { stepLabel: '1. ENGAGE',    title: 'ORA engages new inquiries',             description: 'ORA greets visitors browsing your services, answers questions about your process, and builds trust before any human involvement.',           containerClass: 'bg-[color:var(--ora-warning)]/[0.08]' },
      { stepLabel: '2. QUALIFY',   title: 'ORA qualifies and scopes the project',  description: 'ORA asks about project scope, timeline, budget range, and team size — filtering serious leads from tyre-kickers automatically.',            containerClass: 'bg-[color:var(--ora-warning)]/[0.08]' },
      { stepLabel: '3. PRESENT',   title: 'ORA presents your service packages',    description: 'ORA walks prospects through your service tiers, explains what\'s included, and answers comparison questions without you being involved.',      containerClass: 'bg-[color:var(--ora-warning)]/[0.08]' },
      { stepLabel: '4. BOOK',      title: 'ORA books discovery calls',             description: 'When a prospect is ready to move forward, ORA guides them to your booking link or captures their details for a follow-up.',                 containerClass: 'bg-primary/[0.08]' },
    ],
    faqs: [
      { q: 'Can ORA handle different service packages?',  a: 'Yes. Upload your service menu and ORA presents the right package based on the client\'s needs and budget.' },
      { q: 'How does ORA qualify leads?',                 a: 'ORA asks structured scoping questions and passes qualified lead data to your CRM or email.' },
      { q: 'Does ORA work on a portfolio site?',          a: 'Yes. Add the ORA widget with one script tag to any website — WordPress, Webflow, or custom HTML.' },
      { q: 'Can ORA book calls directly?',               a: 'ORA can guide prospects to Calendly, Cal.com, or any booking link during the conversation.' },
    ],
    gettingStarted: [
      { action: 'Configure your persona →',     desc: 'Select Agency archetype and set your brand\'s voice and tone.',           href: '/setup?archetype=agency&step=persona'     },
      { action: 'Upload your service menu →',   desc: 'Add service packages, pricing, and process docs to ORA\'s knowledge.',     href: '/setup?archetype=agency&step=knowledge'   },
    ],
  },

  portfolio: {
    heroTitle:    'ORA for Creators showcases your work and books clients',
    heroDesc:     'ORA presents your portfolio, answers project inquiries, explains your rates and availability, and books clients directly — 24/7.',
    cta1Label:    'Set up ORA for Creator',
    cta1Href:     '/setup?archetype=portfolio&step=persona',
    heroImageSrc: '/previews/voice-preview.jpg',
    howLabel:     'HOW ORA FOR CREATORS WORKS',
    rows: [
      { stepLabel: '1. SHOWCASE',  title: 'ORA showcases your best work',          description: 'Visitors can ask about your projects, skills, and process. ORA walks them through your portfolio with context and storytelling.', containerClass: 'bg-[color:var(--ora-success)]/[0.08]' },
      { stepLabel: '2. ANSWER',    title: 'ORA answers availability & rate Qs',    description: 'ORA handles common questions about your rates, timeline, and availability — so you spend time creating, not answering emails.', containerClass: 'bg-[color:var(--ora-success)]/[0.08]' },
      { stepLabel: '3. QUALIFY',   title: 'ORA qualifies project fit',             description: 'ORA asks about project scope, budget, and timeline to ensure the inquiry is a good fit before passing it to you.',             containerClass: 'bg-[color:var(--ora-success)]/[0.08]' },
      { stepLabel: '4. BOOK',      title: 'ORA books the project',                 description: 'Ready clients are guided to your booking form or discovery call link — captured and qualified without any manual effort.',       containerClass: 'bg-primary/[0.08]' },
    ],
    faqs: [
      { q: 'Can ORA show portfolio images?',              a: 'ORA can describe and link to portfolio items using the knowledge you upload — URLs, project briefs, and descriptions.' },
      { q: 'Does ORA know my rates?',                    a: 'Yes. Upload a rates document or FAQ and ORA will reference it accurately when asked.' },
      { q: 'Can ORA work on a Webflow or Squarespace site?', a: 'Yes. Add the ORA widget script to any site builder that allows custom code injection.' },
      { q: 'How does ORA handle booking?',               a: 'ORA guides interested visitors to your Calendly, booking form, or contact page at the right moment.' },
    ],
    gettingStarted: [
      { action: 'Configure your persona →',       desc: 'Select Creator archetype and set a voice that matches your brand.',          href: '/setup?archetype=portfolio&step=persona'   },
      { action: 'Upload your portfolio info →',   desc: 'Add project briefs, rates, and availability info to ORA\'s knowledge base.',  href: '/setup?archetype=portfolio&step=knowledge' },
    ],
  },

  general: {
    heroTitle:    'ORA for Enterprise answers questions at scale',
    heroDesc:     'ORA handles high volumes of inbound questions using your company knowledge base — policies, FAQs, procedures — with sub-85ms accuracy.',
    cta1Label:    'Set up ORA for Enterprise',
    cta1Href:     '/setup?archetype=general&step=persona',
    heroImageSrc: '/previews/docs-preview.jpg',
    howLabel:     'HOW ORA FOR ENTERPRISE WORKS',
    rows: [
      { stepLabel: '1. INDEX',     title: 'ORA indexes your company knowledge',    description: 'Upload policies, procedures, HR docs, and FAQs. ORA\'s RAG engine vectorises and retrieves them with sub-85ms latency.',       containerClass: 'bg-muted/[0.08]' },
      { stepLabel: '2. ANSWER',    title: 'ORA answers questions accurately',      description: 'Employees or customers ask questions in natural language. ORA retrieves the precise policy passage or procedure — no hallucinations.', containerClass: 'bg-muted/[0.08]' },
      { stepLabel: '3. ESCALATE',  title: 'ORA routes complex cases',              description: 'When ORA can\'t answer confidently, it flags the query and routes it to the right human — reducing support ticket volume.', containerClass: 'bg-muted/[0.08]' },
      { stepLabel: '4. IMPROVE',   title: 'Knowledge improves over time',          description: 'Track the most common questions, identify knowledge gaps, and update documents. ORA re-indexes instantly.',                    containerClass: 'bg-primary/[0.08]' },
    ],
    faqs: [
      { q: 'What file types does ORA support?',           a: 'PDF, DOCX, TXT, and plain text. Spreadsheets can be exported as CSV for upload.' },
      { q: 'How many documents can I upload?',            a: 'No document limit — plan limits apply to total indexed tokens.' },
      { q: 'Does ORA work for internal teams?',           a: 'Yes. Embed ORA on an internal portal to answer HR, IT, or policy questions for employees.' },
      { q: 'Can ORA be restricted to certain topics?',   a: 'Yes. Configure ORA\'s persona to scope answers to specific document collections.' },
    ],
    gettingStarted: [
      { action: 'Configure your persona →',   desc: 'Select Enterprise archetype and set the appropriate voice and scope.',         href: '/setup?archetype=general&step=persona'   },
      { action: 'Upload your knowledge →',    desc: 'Add company policies, FAQs, and procedure docs to ORA\'s knowledge base.',     href: '/setup?archetype=general&step=knowledge' },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface SetupArchIntroPageProps {
  archetype: SetupArchetype;
}

export function SetupArchIntroPage({ archetype }: SetupArchIntroPageProps) {
  const arch    = ARCHETYPES.find((a) => a.id === archetype)!;
  const content = ARCH_CONTENT[archetype];
  const { Icon, iconClass } = arch;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="w-full px-8 lg:px-10 pt-8 pb-14">

        {/* ── Hero ── */}
        <div className="flex items-start gap-10 mb-10">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={22} className={iconClass} />
            </div>
            <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-snug mb-3">
              {content.heroTitle}
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5 max-w-lg">
              {content.heroDesc}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={content.cta1Href}
                className="inline-flex items-center h-8 px-4 rounded-md border border-border text-[12px] font-medium text-foreground hover:bg-surface-container transition-colors"
              >
                {content.cta1Label}
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1 h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <span className="w-3.5 h-3.5 border border-current rounded-sm flex items-center justify-center text-[8px]">?</span>
                Learn more
              </Link>
            </div>
          </div>

          {/* Right: screenshot */}
          <div className="relative w-[300px] h-[175px] flex-shrink-0 rounded-xl overflow-hidden bg-surface-container">
            <Image src={content.heroImageSrc} alt={content.heroTitle} fill className="object-cover object-top" sizes="300px" />
          </div>
        </div>

        {/* ── HOW IT WORKS label ── */}
        <div className="flex items-center gap-2 mb-7">
          <span className="w-[3px] h-3.5 rounded-full bg-primary flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            {content.howLabel}
          </p>
        </div>

        {/* ── HOW IT WORKS rows ── */}
        <div className="space-y-8 mb-12">
          {content.rows.map((row, i) => (
            <div key={i} className="flex gap-8 items-center">
              {/* Left: colored container — placeholder gradient */}
              <div className={cn('flex-1 min-w-0 rounded-xl overflow-hidden flex items-center justify-center', row.containerClass)} style={{ minHeight: '180px' }}>
                <div className="w-full" style={{ paddingTop: '56%', position: 'relative' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-30">
                      <Icon size={32} className={iconClass} />
                    </div>
                  </div>
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

        {/* ── FAQ ── */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-[3px] h-3.5 rounded-full bg-primary flex-shrink-0" />
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Frequently Asked Questions
          </p>
        </div>

        <div className="flex gap-10 mb-12">
          <div className="w-[220px] flex-shrink-0 pt-1">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-2">
              Can't find the answer here?
            </p>
            <Link href="/live-desk" className="inline-flex items-center gap-1 text-[12.5px] text-primary font-medium hover:underline">
              Ask ORA <ArrowRight size={11} />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-border/30">
            {content.faqs.map((faq, i) => (
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
          <div className="flex-1 space-y-4">
            {content.gettingStarted.map((step, i) => (
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
        </div>

      </div>
    </div>
  );
}
