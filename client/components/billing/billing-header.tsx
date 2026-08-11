'use client';

import { Receipt, Download, CreditCard } from 'lucide-react';

interface BillingHeaderProps {
  onDownloadInvoice?: () => void;
  onManagePayment?: () => void;
}

export function BillingHeader({ onDownloadInvoice, onManagePayment }: BillingHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <Receipt size={24} style={{ color: 'var(--primary)' }} />
          Billing & Subscriptions
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your ORA subscription tier, usage quotas, payment methods, and invoices.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onDownloadInvoice}
          className="px-3.5 py-2 rounded-xl text-xs font-medium border text-foreground flex items-center gap-2 transition-all hover:bg-[var(--surface-high)] shadow-sm"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Download size={14} style={{ color: 'var(--secondary)' }} />
          Download invoice
        </button>

        <button
          onClick={onManagePayment}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <CreditCard size={15} />
          Manage payment
        </button>
      </div>
    </div>
  );
}
