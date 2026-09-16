'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Mic,
  FileText,
  Package,
  Layers,
  ChevronDown,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLink } from '@/components/navigation/app-link';
import { useAppRouter, useIsEmbedded } from '@/lib/navigation/app-path';
import { ShopifyEmbedCard } from '@/components/shopify/shopify-embed-card';

// ─── Role Definitions ─────────────────────────────────────────────────────────

interface AgentRoleCard {
  id: 'prompt' | 'voice' | 'documents' | 'products';
  label: string;
  category: string;
  Icon: React.ElementType;
  description: string;
  imageSrc: string;
  href: string;
}

const AGENT_ROLES: AgentRoleCard[] = [
  {
    id: 'prompt',
    label: 'System Prompt & Persona',
    category: 'Behavior & Directives',
    Icon: Sliders,
    description: 'Configure custom instructions, 25+ supported languages & dialects, greetings, and avoidances',
    imageSrc: '/previews/agent-persona-role.jpg',
    href: '/agent?role=prompt',
  },
  {
    id: 'voice',
    label: 'Talk with ORA (Voice AI)',
    category: 'Speech AI',
    Icon: Mic,
    description: 'Real-time bidirectional speech to train, test, and tune voice persona',
    imageSrc: '/previews/role-voice-v2.jpg',
    href: '/agent?role=voice',
  },
  {
    id: 'documents',
    label: 'Store Knowledge Base',
    category: 'Knowledge Base',
    Icon: FileText,
    description: 'Upload store policies, FAQs, and documentation for verified RAG search',
    imageSrc: '/previews/role-docs-v2.jpg',
    href: '/agent?role=documents',
  },
  {
    id: 'products',
    label: 'Product Catalog & Inventory',
    category: 'Catalog & Cart',
    Icon: Package,
    description: 'Sync live Shopify, WooCommerce, or CSV products with instant cart tools',
    imageSrc: '/previews/role-products-v2.jpg',
    href: '/agent?role=products',
  },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How does ORA combine Voice, Documents, and Products?',
    a: 'ORA operates as a unified multimodal AI sales agent. When a shopper asks a question, ORA searches both your product catalog and your indexed knowledge documents in parallel, replying via voice or text in real time.',
  },
  {
    q: 'How do I train ORA on my specific store policies?',
    a: 'Go to the Store Knowledge Base section and upload your shipping, return, and warranty documents or FAQ sheets. ORA chunks and vectorizes your text automatically without requiring manual prompt engineering.',
  },
  {
    q: 'Can ORA connect to live Shopify and WooCommerce inventories?',
    a: 'Yes. ORA connects natively with Shopify, WooCommerce, and custom webhooks. Inventory counts and pricing are updated in real-time so ORA never recommends out-of-stock items.',
  },
  {
    q: 'Can I test my agent before deploying to live shoppers?',
    a: 'Yes. Use the "Test ORA" capability from the Voice AI section to have a real bi-directional voice conversation directly in your browser.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentHub() {
  const router = useAppRouter();
  // The embedded app has no /setup onboarding guide, so the theme app extension
  // toggle that used to live in that guide is surfaced here instead. It is the
  // last install step and nothing else in the Shopify tree renders it.
  const isEmbedded = useIsEmbedded();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-16">

        {/* ── Hub Hero Header (Same as Setup Hub) ── */}
        <div className="mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
          <p className="text-[11.5px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
            Configuration · All Sections
          </p>
          <h1 className="text-[26px] sm:text-[34px] lg:text-[40px] font-semibold text-foreground tracking-tight leading-[1.15] mb-3.5">
            Configure one AI sales agent for your entire store
          </h1>
          <p className="text-[13.5px] sm:text-[14.5px] text-muted-foreground leading-relaxed">
            Set your store type and store overview, write the system prompt, then feed ORA your policies, documents, and product catalog.
          </p>
          <p className="text-[12.5px] sm:text-[13px] text-muted-foreground/80 mt-2">
            Want to learn how ORA indexes data? Read our{' '}
            <AppLink
              href="/docs"
              className="text-foreground dark:text-[#C8F031] font-medium underline underline-offset-4"
              fallback={<span className="font-medium">Agent Training Guide</span>}
            >
              Agent Training Guide
            </AppLink>
            .
          </p>
        </div>

        {/* ── Symmetric 2x2 Grid (Subtle Rounded-md Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          {AGENT_ROLES.map((role) => {
            const { Icon } = role;

            return (
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                aria-label={role.label}
                onClick={() => router.push(role.href)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(role.href);
                  }
                }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-border/60 bg-transparent hover:border-border transition-all duration-200 cursor-pointer shadow-xs min-h-[300px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {/* Top Image Preview Frame */}
                <div className="relative w-full h-44 bg-surface-container/50 overflow-hidden border-b border-border/40">
                  <Image
                    src={role.imageSrc}
                    alt={role.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] uppercase tracking-wider text-foreground font-semibold px-2.5 py-1 rounded-sm bg-background/90 backdrop-blur-md border border-border/60 shadow-xs">
                      {role.category}
                    </span>
                  </div>
                </div>

                {/* Bottom Content Row */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 group-hover:bg-surface-highest transition-colors">
                      <Icon size={18} className="text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-foreground group-hover:text-foreground transition-colors truncate">
                        {role.label}
                      </h3>
                      <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-md border border-border/60 flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:text-foreground group-hover:border-foreground/50 transition-colors">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* 4th Card: More capabilities coming soon (Symmetric 2x2 card) */}
          <div className="flex flex-col items-center justify-center gap-2.5 border border-dashed border-border/50 p-6 rounded-md bg-transparent text-center min-h-[300px]">
            <div className="w-8 h-8 rounded-md bg-surface-high flex items-center justify-center border border-border/40 text-muted-foreground">
              <Layers size={14} className="text-foreground dark:text-[#C8F031]" />
            </div>
            <span className="text-[14px] text-foreground font-semibold">More agent capabilities</span>
            <span className="text-[12.5px] text-muted-foreground/80 max-w-[240px] leading-relaxed">
              Autonomous inbound phone triage, multi-agent store routing, and custom CRM webhooks coming soon.
            </span>
          </div>
        </div>

        {/* ── Deploy: theme app extension toggle (embedded app only) ── */}
        {isEmbedded && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
                Deploy to your storefront
              </p>
              <div className="h-px bg-border/40 flex-1 ml-2" />
            </div>
            <ShopifyEmbedCard />
          </div>
        )}

        {/* ── Hub FAQ Section (Intercom Accordion Style) ── */}
        <div className="pt-10 border-t border-border/40 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
              Frequently Asked Questions
            </p>
            <div className="h-px bg-border/40 flex-1 ml-2" />
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-md border border-border/50 bg-transparent overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4.5 text-left text-[14px] font-medium text-foreground hover:bg-surface-high/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        'text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 pt-1 text-[13px] text-muted-foreground leading-relaxed border-t border-border/30">
                      {faq.a}
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
