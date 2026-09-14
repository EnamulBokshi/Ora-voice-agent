'use client';

import { Download, FileText } from 'lucide-react';
import { Invoice } from '@/types/invoices';
import { resendInvoiceApi } from '@/services/invoices-service';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onResent: () => void;
}

export function InvoiceHistory({ invoices, onResent }: InvoiceHistoryProps) {
  const handleResend = async (id: string) => {
    try {
      await resendInvoiceApi(id);
      onResent();
    } catch {
      // silent
    }
  };

  return (
    <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
            Invoice History & Receipts
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            ({invoices.length})
          </span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="py-12 text-center text-[12px] text-muted-foreground select-none">
          <FileText size={20} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="font-medium text-foreground font-serif text-[13px]">No invoices recorded yet</p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Tax invoices are automatically generated and emailed upon subscription renewal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
          <table className="w-full min-w-[500px] text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase text-[11px] font-mono font-medium tracking-wider">
                <th className="py-2.5 px-3">Invoice Number</th>
                <th className="py-2.5 px-3">Billing Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-foreground">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-surface-high/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-foreground text-[12.5px]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-mono text-[11.5px]">
                    {formatDateTime(inv.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums font-mono text-[13px]">
                    {formatCurrency(inv.amountUsdCents / 100, 'USD')}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono capitalize text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleResend(inv._id)}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1 px-2 rounded hover:bg-surface-high/50 touch-manipulation"
                      title="Resend invoice email"
                    >
                      <Download size={12} />
                      <span>Resend</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
