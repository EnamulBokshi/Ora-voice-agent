'use client';

import { CheckCircle2, Tag, Check } from 'lucide-react';

interface CatalogLiveVerificationCardProps {
  price: string;
  inventoryCount: number;
  embeddings: string[];
}

export function CatalogLiveVerificationCard({
  price,
  inventoryCount,
  embeddings,
}: CatalogLiveVerificationCardProps) {
  return (
    <div className="space-y-4">
      {/* Live Verification Card */}
      <div
        className="p-3.5 rounded-md border space-y-2.5"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <CheckCircle2 size={15} style={{ color: 'var(--ora-success)' }} />
          <h4 className="text-xs font-semibold text-foreground">Live Verification</h4>
        </div>
        <ul className="space-y-2 text-xs">
          <li className="flex justify-between items-center text-muted-foreground">
            <span>Price</span>
            <span className="font-medium flex items-center gap-1" style={{ color: 'var(--ora-success)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ora-success)' }} />
              {price} Verified
            </span>
          </li>
          <li className="flex justify-between items-center text-muted-foreground">
            <span>Inventory</span>
            <span className="font-medium flex items-center gap-1" style={{ color: 'var(--ora-success)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ora-success)' }} />
              {inventoryCount} Live
            </span>
          </li>
          <li className="flex justify-between items-center text-muted-foreground">
            <span>Availability</span>
            <span className="font-medium flex items-center gap-1" style={{ color: 'var(--ora-success)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ora-success)' }} />
              Available Live
            </span>
          </li>
        </ul>
      </div>

      {/* ORA Knows (Embeddings) */}
      <div>
        <h4 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Tag size={12} /> ORA Knows (Embeddings)
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {embeddings.map((emb, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border"
              style={{
                background: 'var(--surface-high)',
                borderColor: 'var(--border)',
                color: 'var(--muted-foreground)',
              }}
            >
              <Check size={10} style={{ color: 'var(--ora-success)' }} />
              {emb}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
