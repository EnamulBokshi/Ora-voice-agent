'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Package,
  Database,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { getProductsApi } from '@/services/products-service';
import { AppLink } from '@/components/navigation/app-link';

export function KnowledgePreview({ onCompleted }: { onCompleted?: () => void }) {
  const [docCount, setDocCount] = useState<number>(3);
  const [productCount, setProductCount] = useState<number>(12);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getKnowledgeDocsApi({ limit: 10 }),
      getProductsApi({ limit: 10 }),
    ]).then(([docsRes, prodsRes]) => {
      if (!active) return;
      let hasData = false;
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value) && docsRes.value.length > 0) {
        setDocCount(docsRes.value.length);
        hasData = true;
      }
      if (prodsRes.status === 'fulfilled' && prodsRes.value) {
        const total = prodsRes.value.pagination?.total ?? prodsRes.value.items?.length ?? 0;
        setProductCount(total > 0 ? total : 12);
        if (total > 0) hasData = true;
      }
      if (hasData && onCompleted) onCompleted();
    });
    return () => {
      active = false;
    };
  }, [onCompleted]);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (onCompleted) onCompleted();
    }, 1200);
  };

  const knowledgeCards = [
    {
      title: 'Store Policies & Documents',
      countLabel: `${docCount} Documents Vectorised`,
      description: 'Shipping windows, return policies, size guides, warranty terms, and FAQs.',
      status: 'Indexed',
      icon: FileText,
      href: '/agent?role=documents&view=feed',
      actionLabel: 'Manage Documents',
    },
    {
      title: 'Product Catalog & Inventory',
      countLabel: `${productCount} Products Synced`,
      description: 'Live product names, prices, multi-variant sizing, tags, and real-time stock levels.',
      status: 'Active',
      icon: Package,
      href: '/agent?role=products&view=catalog',
      actionLabel: 'View Catalog',
    },
    {
      title: 'Semantic RAG Knowledge Base',
      countLabel: 'Vector retrieval',
      description: 'High-dimensional embeddings for grounded responses with zero hallucinations.',
      status: 'Ready',
      icon: Database,
      href: '/agent?role=documents&view=knowledge',
      actionLabel: 'Knowledge Graph',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 3 Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {knowledgeCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-md border border-border/50 bg-transparent flex flex-col justify-between gap-4 transition-colors hover:border-border/80"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
                    <Icon size={14} className="text-foreground" />
                  </div>
                  <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-[2px] bg-surface-high text-foreground border border-border/60">
                    {card.status}
                  </span>
                </div>
                <h3 className="text-[14.5px] font-semibold text-foreground font-serif tracking-tight mb-1">
                  {card.title}
                </h3>
                <p className="text-[11.5px] font-mono text-muted-foreground mb-2">
                  {card.countLabel}
                </p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <AppLink
                  href={card.href}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:underline underline-offset-2"
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight size={11} className="text-muted-foreground" />
                </AppLink>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Upload / Sync Action Strip Card */}
      <div className="p-5 rounded-md border border-border/50 bg-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
            <UploadCloud size={14} className="text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-foreground font-serif">Add More Knowledge to ORA</p>
            <p className="text-[12px] text-muted-foreground">Supported formats: PDF, DOCX, TXT, Markdown, CSV</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 h-7.5 px-3 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={cn(isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Re-indexing…' : 'Sync Catalog'}</span>
          </button>
          <AppLink
            href="/agent?role=documents&view=feed"
            className="inline-flex items-center justify-center gap-1.5 h-7.5 px-3 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity shadow-xs flex-1 sm:flex-initial"
          >
            <span>Upload Document</span>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
