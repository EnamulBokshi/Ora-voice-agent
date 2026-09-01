'use client';

import { Customer } from '@/types/customer';
import { updateCustomerApi } from '@/services/customers-service';

interface CustomerDetailPanelProps {
  customer: Customer;
  onReload: () => void;
}

export function CustomerDetailPanel({ customer, onReload }: CustomerDetailPanelProps) {
  const c = customer;
  const preferences = c.extractedPreferences;

  const handleSaveName = async (name: string) => {
    if (!name.trim() || name === c.name) return;
    try {
      await updateCustomerApi(c._id, { name });
      onReload();
    } catch {
      // silent
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold bg-surface-high text-foreground shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <input
              type="text"
              defaultValue={c.name}
              onBlur={(e) => handleSaveName(e.target.value)}
              className="text-sm font-semibold text-foreground bg-transparent border border-transparent focus:border-primary rounded px-1 py-0.5 w-full outline-none focus:bg-surface-high"
              aria-label="Customer name"
            />
            <p className="text-xs text-muted-foreground truncate">{c.email ?? c.phone ?? 'No contact'}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto text-[13px]">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md border border-border bg-surface-low">
            <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">Orders</p>
            <p className="font-semibold text-foreground tabular-nums">{c.pastOrderIds?.length ?? 0}</p>
          </div>
          <div className="p-3 rounded-md border border-border bg-surface-low">
            <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">Member since</p>
            <p className="font-semibold text-foreground tabular-nums">
              {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {preferences && Object.keys(preferences).length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">
              Customer preferences
            </h4>
            <div className="space-y-1.5">
              {Object.entries(preferences).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between text-[12px] py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-foreground font-medium truncate ml-4">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
