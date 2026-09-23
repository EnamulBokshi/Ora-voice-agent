'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { formatRelativeTime, formatDateTime } from '@/lib/format';

interface CustomersTableProps {
  customers: Customer[];
  selectedId: string;
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  selectedId,
  onSelectCustomer,
}: CustomersTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="rounded-md border border-border/60 bg-background overflow-hidden flex flex-col flex-1 min-h-[460px] shadow-xs">
      {customers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2 text-muted-foreground">
          <p className="text-xs font-medium text-foreground">No customers match your criteria</p>
          <p className="text-[11.5px] max-w-sm">
            Try adjusting your search query or filter selection to show matching customer profiles.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar flex-1">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground uppercase text-[11px] tracking-wider font-medium select-none bg-surface-low/40">
                <th className="py-3 px-4 sm:px-5">Customer</th>
                <th className="py-3 px-4 sm:px-5">Contact</th>
                <th className="py-3 px-4 sm:px-5 hidden sm:table-cell">Preferences</th>
                <th className="py-3 px-4 sm:px-5 hidden md:table-cell">Last Active</th>
                <th className="py-3 px-3 text-right w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-foreground">
              {customers.map((c) => {
                const customerId = c._id || c.id || '';
                const isSelected = customerId === selectedId;
                const isAnonymous = c.isAnonymous ?? (!c.email && !c.phone);
                const preferences = c.extractedPreferences || {};
                const prefEntries = Object.entries(preferences);

                return (
                  <tr
                    key={customerId}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectCustomer(c);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setTimeout(() => {
                          document
                            .getElementById('customer-detail-section')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 50);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCustomer(c);
                      }
                    }}
                    className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring touch-manipulation group ${
                      isSelected
                        ? 'bg-primary/[0.05] border-l-2 border-primary'
                        : 'hover:bg-surface-high/30 border-l-2 border-transparent'
                    }`}
                  >
                    {/* 1. Customer */}
                    <td className="py-3.5 sm:py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11.5px] font-semibold bg-surface-high border border-border/60 text-foreground select-none">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${
                              isAnonymous ? 'bg-muted-foreground/40' : 'bg-primary'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[200px] text-[13px]">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            <span className={!isAnonymous ? 'text-primary font-medium' : ''}>
                              {isAnonymous ? 'Guest' : 'Verified'}
                            </span>
                            {c.externalCustomerId && (
                              <span>• Shopify</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Contact details */}
                    <td className="py-3.5 sm:py-4 px-4 sm:px-5">
                      <div className="space-y-0.5 max-w-[180px] sm:max-w-none">
                        {c.email ? (
                          <div className="flex items-center gap-2 text-[12px] text-foreground truncate group/mail">
                            <span className="truncate tabular-nums">{c.email}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, c.email!, `mail-${customerId}`)}
                              className="opacity-0 group-hover/mail:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Copy email"
                            >
                              {copiedKey === `mail-${customerId}` ? (
                                <Check size={11} className="text-primary" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        ) : c.phone ? (
                          <div className="flex items-center gap-2 text-[12px] text-foreground truncate group/phone">
                            <span className="truncate tabular-nums">{c.phone}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, c.phone!, `phone-${customerId}`)}
                              className="opacity-0 group-hover/phone:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Copy phone"
                            >
                              {copiedKey === `phone-${customerId}` ? (
                                <Check size={11} className="text-primary" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Preferences */}
                    <td className="py-3.5 sm:py-4 px-4 sm:px-5 hidden sm:table-cell">
                      {prefEntries.length === 0 ? (
                        <span className="text-[11.5px] text-muted-foreground/50">
                          None recorded
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                          {prefEntries.slice(0, 2).map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-surface-high/60 border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors truncate max-w-[135px]"
                              title={`${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`}
                            >
                              <span className="truncate">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </span>
                          ))}
                          {prefEntries.length > 2 && (
                            <span className="text-[10px] tabular-nums text-muted-foreground px-1.5 py-0.5 rounded bg-surface-high/40">
                              +{prefEntries.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Last active */}
                    <td className="py-3.5 sm:py-4 px-4 sm:px-5 text-muted-foreground text-[11.5px] hidden md:table-cell tabular-nums">
                      <span title={c.lastActiveAt ? formatDateTime(c.lastActiveAt) : 'Recently'}>
                        {c.lastActiveAt ? formatRelativeTime(c.lastActiveAt) : '—'}
                      </span>
                    </td>

                    {/* 5. Action chevron */}
                    <td className="py-3.5 sm:py-4 px-3 text-right">
                      <ChevronRight
                        size={14}
                        className={`transition-transform inline-block ${
                          isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5'
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
