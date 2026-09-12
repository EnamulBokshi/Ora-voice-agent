'use client';

import Link from 'next/link';
import { Mic, FileText, Package, Database, Radio } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { AppLink } from '@/components/navigation/app-link';

interface AgentHeaderProps {
  activeSection: 'voice' | 'documents' | 'products';
  totalDocs?: number;
}

const SECTION_HEADERS = {
  voice: {
    title: 'Talk to ORA',
    subtitle: 'Real-time bidirectional voice assistant. Ask product questions or speak store knowledge.',
    icon: <Mic size={20} className="text-primary" />,
  },
  documents: {
    title: 'Store & Policy Documents',
    subtitle: 'Upload store policies, return conditions, warranty guidelines, FAQs, and reference documents.',
    icon: <FileText size={20} className="text-primary" />,
  },
  products: {
    title: 'Product Details',
    subtitle: 'Add product specifications, pricing rules, variant options, stock notes, and size guides.',
    icon: <Package size={20} className="text-primary" />,
  },
};

export function AgentHeader({ activeSection, totalDocs = 0 }: AgentHeaderProps) {
  const meta = SECTION_HEADERS[activeSection] || SECTION_HEADERS.voice;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
            {meta.icon}
            {meta.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">· Store Assistant</span>
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {meta.title}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 max-w-2xl">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-low border border-border text-xs text-muted-foreground">
          <Database size={13} className="text-primary" />
          <span className="font-semibold text-foreground tabular-nums">{totalDocs}</span>
          <span>docs indexed</span>
        </div>

        {activeSection !== 'voice' && (
          <AppLink
            href="/agent?tab=voice"
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: 'gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs',
            })}
          >
            <Radio size={13} className="animate-pulse" />
            Talk to ORA
          </AppLink>
        )}
      </div>
    </div>
  );
}
