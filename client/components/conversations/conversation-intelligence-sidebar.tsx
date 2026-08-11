'use client';

import { BrainCircuit, Smile, ShoppingBag, CheckCircle } from 'lucide-react';
import { ConversationIntelligence } from './conversation-types';

interface ConversationIntelligenceSidebarProps {
  intelligence: ConversationIntelligence;
}

export function ConversationIntelligenceSidebar({ intelligence }: ConversationIntelligenceSidebarProps) {
  const intel = intelligence;

  return (
    <div
      className="w-[280px] shrink-0 border-l flex flex-col gap-4 p-4 overflow-y-auto hidden 2xl:flex"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Intelligence Card */}
      <div
        className="rounded-xl p-3.5 border relative overflow-hidden flex flex-col gap-2.5"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <BrainCircuit size={15} style={{ color: 'var(--primary)' }} />
          <h3 className="text-[11px] font-bold text-foreground tracking-wider uppercase">
            Intelligence
          </h3>
        </div>

        <div className="space-y-2.5 text-xs">
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold block mb-0.5">Intent</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--secondary)' }} />
              <span className="font-semibold text-foreground text-xs">{intel.intent}</span>
            </div>
          </div>

          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold block mb-0.5">Sentiment</span>
            <div className="flex items-center gap-1 font-medium text-xs" style={{ color: 'var(--ora-success)' }}>
              <Smile size={13} />
              <span>{intel.sentiment}</span>
            </div>
          </div>

          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold block mb-0.5">Extracted Budget</span>
            <div
              className="px-2 py-0.5 rounded-md border inline-block text-[11px] font-mono font-bold"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              {intel.extractedBudget}
            </div>
          </div>
        </div>
      </div>

      {/* Products Discussed */}
      <div>
        <h3 className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <ShoppingBag size={13} className="text-muted-foreground" />
          Products Discussed
        </h3>

        {intel.productsDiscussed.length > 0 ? (
          <div className="space-y-2">
            {intel.productsDiscussed.map((prod) => (
              <div
                key={prod.id}
                className="rounded-xl p-2 border flex items-center gap-2.5 transition-colors"
                style={{
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              >
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-9 h-9 rounded-lg object-cover border shrink-0"
                  style={{ borderColor: 'var(--glass-border)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{prod.name}</p>
                  <p className="text-[11px] font-mono font-bold" style={{ color: 'var(--primary)' }}>
                    {prod.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">No products explicitly discussed yet.</p>
        )}
      </div>

      {/* Sales Outcome */}
      {intel.salesOutcome && (
        <div className="mt-auto">
          <div
            className="rounded-xl p-3.5 border relative overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--secondary) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
            }}
          >
            <h3 className="text-[11px] font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--secondary)' }}>
              <CheckCircle size={13} />
              Sales Outcome
            </h3>
            <p className="text-xs font-bold text-foreground">{intel.salesOutcome.status}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {intel.salesOutcome.ref}</p>
          </div>
        </div>
      )}
    </div>
  );
}
