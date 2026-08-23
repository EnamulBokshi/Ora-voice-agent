'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Package, Database, CheckCircle2, ArrowRight } from 'lucide-react';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { getProductsApi } from '@/services/products-service';

export function KnowledgePreview() {
  const [docCount, setDocCount] = useState<number>(2);
  const [productCount, setProductCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getKnowledgeDocsApi({ limit: 10 }),
      getProductsApi({ limit: 10 }),
    ]).then(([docsRes, prodsRes]) => {
      if (!active) return;
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        setDocCount(docsRes.value.length);
      }
      if (prodsRes.status === 'fulfilled' && prodsRes.value) {
        setProductCount(prodsRes.value.pagination?.total ?? prodsRes.value.items?.length ?? 0);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const items = [
    {
      type: 'doc',
      name: 'Shipping & Return Policies',
      status: docCount > 0 ? 'Indexed' : 'Pending',
      meta: docCount > 0 ? `${docCount} documents chunked & vectorized` : 'Upload PDF/Doc to index',
      icon: FileText,
    },
    {
      type: 'catalog',
      name: 'Product Catalog & Inventory',
      status: productCount > 0 ? 'Synced' : 'Ready',
      meta: productCount > 0 ? `${productCount} products live in memory` : 'Sync from Shopify or CSV',
      icon: Package,
    },
    {
      type: 'faq',
      name: 'Store Knowledge & FAQs',
      status: 'Active',
      meta: 'Instant semantic RAG retrieval',
      icon: Database,
    },
  ];

  return (
    <div className="w-full h-full min-h-[260px] rounded-xl border border-border/80 bg-surface-lowest/90 p-4 sm:p-5 flex flex-col justify-between select-none relative overflow-hidden group">
      {/* Glow */}
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center text-primary">
            <Database size={13} />
          </div>
          <span className="text-[12.5px] font-semibold text-foreground">Knowledge & RAG Engine</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
          <CheckCircle2 size={10} />
          Vector Embeddings Live
        </span>
      </div>

      {/* Ingestion list items */}
      <div className="space-y-2.5 my-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-surface-high/80 border border-border/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-surface-highest flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <Icon size={13} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-[10.5px] text-muted-foreground font-mono truncate">{item.meta}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-primary/10 text-primary uppercase tracking-wider flex-shrink-0">
                {item.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Instant semantic retrieval</span>
        <span className="font-mono text-foreground font-medium flex items-center gap-0.5">
          &lt; 85ms RAG latency
        </span>
      </div>
    </div>
  );
}
