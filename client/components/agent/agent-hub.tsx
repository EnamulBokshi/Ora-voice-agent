'use client';

import Link from 'next/link';
import { ChevronDown, Mic, FileText, Package, Radio } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ─── Section definitions ──────────────────────────────────────────────────────
// Colored title + icon matching Intercom's "colored role name" pattern.

const SECTIONS = [
  {
    id:            'voice',
    tab:           'voice',
    Icon:          Mic,
    title:         'Talk to ORA',
    titleClass:    'text-primary',              // lime
    iconClass:     'text-primary',
    description:   'Train your agent by speaking.',
    descClass:     'text-primary/60',
    bullets:       ['Real-time bidirectional voice', 'Speak products into memory', 'Instant knowledge indexing'],
    previewSrc:    '/previews/voice-preview.jpg',
    previewAlt:    'ORA voice interface',
  },
  {
    id:            'documents',
    tab:           'documents',
    Icon:          FileText,
    title:         'Documents',
    titleClass:    'text-[color:var(--ora-info)]',
    iconClass:     'text-[color:var(--ora-info)]',
    description:   'Build your knowledge base.',
    descClass:     'text-[color:var(--ora-info)]/60',
    bullets:       ['Store policies & guidelines', 'Return & warranty documents', 'FAQ and reference files'],
    previewSrc:    '/previews/docs-preview.jpg',
    previewAlt:    'ORA knowledge base',
  },
  {
    id:            'products',
    tab:           'products',
    Icon:          Package,
    title:         'Product Catalog',
    titleClass:    'text-[color:var(--ora-warning)]',
    iconClass:     'text-[color:var(--ora-warning)]',
    description:   'Sync your inventory.',
    descClass:     'text-[color:var(--ora-warning)]/60',
    bullets:       ['Sync from Shopify or WooCommerce', 'Upload CSV product data', 'Verify live product accuracy'],
    previewSrc:    '/previews/products-preview.jpg',
    previewAlt:    'ORA product catalog',
  },
] as const;

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'What is ORA?', a: 'ORA is an AI-powered voice and chat sales agent for ecommerce stores. It answers product questions, guides shoppers, and drives purchases — all without human intervention.' },
  { q: 'How do I train ORA?', a: "Use the Train section to feed ORA your store data — upload documents, sync your product catalog, or talk to ORA directly via voice to input knowledge." },
  { q: 'Does ORA work with Shopify?', a: 'Yes. ORA integrates natively with Shopify via your Publishable Key. Product sync, order context, and checkout guidance are all supported.' },
  { q: 'How do I deploy ORA to my store?', a: "After training, go to the Deploy section to embed the ORA widget on your storefront. You'll receive a snippet to paste into your theme." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentHub() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="w-full px-10 py-10">

        {/* ── Hero ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-container mb-4">
            <Radio size={16} className="text-muted-foreground" />
          </div>
          <h1 className="text-[30px] font-bold text-foreground tracking-tight leading-tight">
            One agent for your entire store
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            ORA switches between modes to engage shoppers at every stage.{' '}
            <span className="text-primary cursor-pointer hover:underline">Learn more.</span>
          </p>
        </div>

        {/* ── Role cards — 3 columns, fill full width ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/agent?tab=${s.tab}`}
              className="group flex flex-col rounded-lg border border-border/25 bg-surface-container overflow-hidden hover:border-border/60 transition-all duration-150"
            >
              {/* Screenshot — edge-to-edge, fills top of card */}
              <div className="relative w-full h-[150px] overflow-hidden bg-surface-low flex-shrink-0">
                <Image
                  src={s.previewSrc}
                  alt={s.previewAlt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col flex-1">
                {/* Colored icon + colored title — Intercom pattern */}
                <div className="flex items-center gap-1.5 mb-1">
                  <s.Icon size={13} className={s.iconClass} />
                  <h2 className={cn('text-[13.5px] font-semibold', s.titleClass)}>
                    {s.title}
                  </h2>
                </div>

                {/* Colored description */}
                <p className={cn('text-[12px] mb-4 leading-snug', s.descClass)}>
                  {s.description}
                </p>

                {/* Bullets */}
                <ul className="space-y-1.5 mb-5 flex-1">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
                      <span className="mt-[5px] w-1 h-1 rounded-full bg-muted-foreground/35 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Get started — auto-width, left-aligned, NOT full-width */}
                <div>
                  <span className="inline-flex items-center h-7 px-3 rounded border border-border/50 text-[11.5px] font-medium text-foreground group-hover:bg-surface-high group-hover:border-border transition-colors">
                    Get started
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── More roles coming soon ── */}
        <div className="flex items-center gap-3 border border-dashed border-border/40 py-2.5 px-4 mb-10 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 flex-shrink-0" />
          <span className="text-[12px] text-muted-foreground font-medium">More capabilities coming soon</span>
        </div>

        {/* ── FAQ ── */}
        <div>
          <p className="text-[13px] font-semibold text-foreground text-center mb-5">
            Frequently asked questions
          </p>
          <div className="divide-y divide-border/40">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-3.5 text-left hover:opacity-75 transition-opacity"
                >
                  <span className="text-[13px] font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    size={13}
                    className={cn('text-muted-foreground flex-shrink-0 transition-transform duration-150 ml-4', openFaq === i && 'rotate-180')}
                  />
                </button>
                {openFaq === i && (
                  <div className="pb-4 animate-in fade-in duration-150">
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
