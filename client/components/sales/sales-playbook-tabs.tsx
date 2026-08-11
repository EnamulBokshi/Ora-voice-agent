'use client';

export type PlaybookTab =
  | 'overview'
  | 'recommendations'
  | 'upsell'
  | 'cross-sell'
  | 'promotions'
  | 'coupons'
  | 'rules';

interface SalesPlaybookTabsProps {
  activeTab: PlaybookTab;
  onTabChange: (t: PlaybookTab) => void;
}

const TABS: { id: PlaybookTab; label: string }[] = [
  { id: 'overview',        label: 'Overview'        },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'upsell',          label: 'Upsell'          },
  { id: 'cross-sell',      label: 'Cross-sell'      },
  { id: 'promotions',      label: 'Promotions'      },
  { id: 'coupons',         label: 'Coupons'         },
  { id: 'rules',           label: 'Rules'           },
];

export function SalesPlaybookTabs({ activeTab, onTabChange }: SalesPlaybookTabsProps) {
  return (
    <div className="flex gap-6 border-b mb-6 overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--glass-border)' }}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`text-xs font-semibold pb-3 whitespace-nowrap transition-colors relative ${
              isActive ? 'text-[var(--primary)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
