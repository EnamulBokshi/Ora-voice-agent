'use client';

import { KnowledgeCategory } from './agent-types';

interface AgentCategoryTabsProps {
  activeCategory: 'All' | KnowledgeCategory;
  onSelectCategory: (c: 'All' | KnowledgeCategory) => void;
}

const CATEGORIES: ('All' | KnowledgeCategory)[] = [
  'All',
  'Store Policies',
  'Shipping & Delivery',
  'Returns & Refunds',
  'Payment',
  'Warranty',
  'FAQs',
  'Documents',
];

export function AgentCategoryTabs({ activeCategory, onSelectCategory }: AgentCategoryTabsProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto py-2.5 mb-5 no-scrollbar border-b shrink-0"
      style={{ borderColor: 'var(--glass-border)' }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat === activeCategory;

        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              isActive
                ? 'shadow-sm'
                : 'hover:text-foreground hover:bg-[var(--surface-high)]'
            }`}
            style={
              isActive
                ? {
                    background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                  }
                : {
                    background: 'transparent',
                    borderColor: 'transparent',
                    color: 'var(--muted-foreground)',
                  }
            }
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
