'use client';

import { Package, Smartphone, Headphones } from 'lucide-react';

const TOP_PRODUCTS = [
  { name: 'Nike Pegasus 41',      revenue: '$4,820',  conv: '18.4%', icon: Package,    colorVar: 'var(--secondary)' },
  { name: 'iPhone 16 Pro',        revenue: '$28,764', conv: '16.2%', icon: Smartphone, colorVar: 'var(--primary)'   },
  { name: 'Sony WH-1000XM6',      revenue: '$11,172', conv: '14.8%', icon: Headphones, colorVar: 'var(--primary)'   },
  { name: 'Samsung Galaxy S25',   revenue: '$16,478', conv: '13.9%', icon: Smartphone, colorVar: 'var(--muted-foreground)' },
];

export function TopProductsTable() {
  return (
    <div
      className="rounded-2xl border overflow-hidden backdrop-blur-md flex flex-col"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Top Products Through ORA</h3>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-4">PRODUCT NAME</th>
              <th className="py-3 px-4 text-right">REVENUE</th>
              <th className="py-3 px-4 text-right">CONV. RATE</th>
              <th className="py-3 px-4 text-center">TREND</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)] text-foreground">
            {TOP_PRODUCTS.map((prod) => {
              const Icon = prod.icon;

              return (
                <tr key={prod.name} className="hover:bg-[var(--surface-high)]/50 transition-colors">
                  <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                      style={{
                        background: 'var(--surface-high)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <span>{prod.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold" style={{ color: 'var(--primary)' }}>
                    {prod.revenue}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                      style={{
                        background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                        color: prod.colorVar,
                      }}
                    >
                      {prod.conv}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <svg className="w-12 h-4 inline-block" viewBox="0 0 50 15">
                      <path
                        d="M0,10 L10,12 L20,8 L30,14 L40,5 L50,2"
                        fill="none"
                        stroke={prod.colorVar}
                        strokeWidth="1.5"
                      />
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
