'use client';

import { Store, ShoppingBag, ShoppingCart, Code2, Rss } from 'lucide-react';

const INTEGRATIONS = [
  { name: 'WooCommerce',           icon: Store,        colorVar: 'var(--secondary)' },
  { name: 'BigCommerce',           icon: ShoppingBag,  colorVar: 'var(--primary)'   },
  { name: 'Magento',               icon: ShoppingCart, colorVar: 'var(--chart-4)'   },
  { name: 'Custom API',            icon: Code2,        colorVar: 'var(--chart-3)'   },
  { name: 'Product Feed (CSV/XML)',icon: Rss,          colorVar: 'var(--ora-success)'},
];

export function AvailableIntegrations() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-foreground">Available Integrations</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTEGRATIONS.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.name}
              className="p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-200 hover:scale-[1.01] cursor-pointer group backdrop-blur-md"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    background: 'var(--surface-high)',
                    borderColor: 'var(--glass-border)',
                    color: item.colorVar,
                  }}
                >
                  <Icon size={18} />
                </div>
                <span className="font-semibold text-xs text-foreground">{item.name}</span>
              </div>

              <button
                className="text-xs font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Connect
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
