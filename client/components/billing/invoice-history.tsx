'use client';

import { Download } from 'lucide-react';
import { Invoice } from '@/types/invoices';
import { resendInvoiceApi } from '@/services/invoices-service';
import { formatCurrency } from '@/lib/format';

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
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Invoice history</h3>
      </div>

      {invoices.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-muted-foreground">
          No invoices yet. Invoices are generated when your subscription renews.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px] tracking-wider font-medium">
                <th className="py-3 px-5">Invoice</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-surface-high transition-colors">
                  <td className="py-3 px-5 font-mono font-medium">{inv.invoiceNumber}</td>
                  <td className="py-3 px-5 text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-5 text-right font-medium tabular-nums">
                    {formatCurrency(inv.amountUsdCents / 100, 'USD')}
                  </td>
                  <td className="py-3 px-5 text-center capitalize text-muted-foreground">
                    {inv.status}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => handleResend(inv._id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                      title="Resend invoice email"
                    >
                      <Download size={13} /> Resend
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
