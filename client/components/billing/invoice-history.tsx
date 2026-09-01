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
    <div className="pt-4">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <h3 className="text-[13.5px] font-semibold text-foreground">Invoice History</h3>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 text-center text-[12px] text-muted-foreground">
          No invoices recorded yet. Invoices are automatically generated upon renewal.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider">
                <th className="py-2.5 px-3">Invoice</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-surface-high/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-foreground">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums font-mono">
                    {formatCurrency(inv.amountUsdCents / 100, 'USD')}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] capitalize text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleResend(inv._id)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
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
