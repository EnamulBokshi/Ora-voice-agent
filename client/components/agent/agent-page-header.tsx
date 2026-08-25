'use client';

import { Mic, FileText, Package, Database, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentSection = 'voice' | 'documents' | 'products';

const SECTION_META: Record<AgentSection, { icon: React.ElementType; title: string; description: string }> = {
  voice: {
    icon:        Mic,
    title:       'Talk to ORA',
    description: 'Real-time bidirectional voice assistant — speak products, policies, and knowledge into ORA\'s memory.',
  },
  documents: {
    icon:        FileText,
    title:       'Documents',
    description: 'Upload store policies, return conditions, warranty guides, and FAQs for ORA to index.',
  },
  products: {
    icon:        Package,
    title:       'Product Catalog',
    description: 'View and manage items synced from your storefront or uploaded via CSV.',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentPageHeaderProps {
  section:      AgentSection;
  totalDocs?:   number;
  onVoiceTest?: () => void;
  rightSlot?:   React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentPageHeader({
  section,
  totalDocs = 0,
  onVoiceTest,
  rightSlot,
}: AgentPageHeaderProps) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="flex-shrink-0 border-b border-border bg-background">

      {/* ── Header bar ── */}
      <div className="h-12 flex items-center justify-between px-6">
        {/* Left: icon + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-[14px] font-semibold text-foreground truncate">{meta.title}</span>

          {/* Docs indexed badge */}
          {totalDocs > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-muted-foreground flex-shrink-0">
              <Database size={10} className="text-primary" />
              <span className="font-semibold tabular-nums">{totalDocs}</span>
              <span>indexed</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className={cn('flex items-center gap-2 flex-shrink-0')}>
          {rightSlot}
          {section !== 'voice' && onVoiceTest && (
            <button
              onClick={onVoiceTest}
              className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Radio size={11} className="animate-pulse" />
              Talk to ORA
            </button>
          )}
        </div>
      </div>

      {/* ── Subtitle strip ── */}
      <div className="px-6 pb-2.5">
        <p className="text-[12px] text-muted-foreground leading-normal">{meta.description}</p>
      </div>

    </div>
  );
}
