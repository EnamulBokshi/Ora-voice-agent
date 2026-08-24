'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Package, Database, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) setDocCount(docsRes.value.length);
      if (prodsRes.status === 'fulfilled' && prodsRes.value) {
        setProductCount(prodsRes.value.pagination?.total ?? prodsRes.value.items?.length ?? 0);
      }
    });
    return () => { active = false; };
  }, []);

  const items = [
    {
      label: 'Shipping & Return Policies',
      status: docCount > 0 ? 'Indexed' : 'Pending',
      meta: docCount > 0 ? `${docCount} documents vectorised` : 'Upload PDF or Doc to index',
      ok: docCount > 0,
      icon: FileText,
    },
    {
      label: 'Product Catalog & Inventory',
      status: productCount > 0 ? 'Synced' : 'Ready',
      meta: productCount > 0 ? `${productCount} products in memory` : 'Sync from Shopify or CSV',
      ok: productCount > 0,
      icon: Package,
    },
    {
      label: 'Store Knowledge & FAQs',
      status: 'Active',
      meta: 'Instant semantic RAG retrieval',
      ok: true,
      icon: Database,
    },
  ];

  return (
    <div className="space-y-0">
      {/* Rows — same as SalesFunnel funnel steps */}
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon size={13} className="text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{item.meta}</p>
              </div>
            </div>
            <span
              className={cn(
                'text-[10.5px] font-mono font-semibold flex-shrink-0 ml-4',
                item.ok ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.status}
            </span>
          </div>
        );
      })}

      {/* Footer action — same as SalesFunnel overall rate row */}
      <div className="flex items-center justify-between pt-3 text-[12px]">
        <span className="text-muted-foreground">Instant semantic retrieval · &lt; 85ms</span>
        <a href="/agent?tab=documents" className="flex items-center gap-1 text-primary hover:underline font-medium">
          Manage docs
          <ArrowRight size={10} />
        </a>
      </div>
    </div>
  );
}
