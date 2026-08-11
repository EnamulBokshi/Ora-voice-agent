'use client';

import { CreditCard, Building, Download, CheckCircle2 } from 'lucide-react';

const INVOICES = [
  { date: 'Aug 10, 2026', desc: 'Pro Plan - Monthly',           amount: '$199.00', status: 'Paid' },
  { date: 'Jul 10, 2026', desc: 'Pro Plan - Monthly + Overage', amount: '$224.50', status: 'Paid' },
  { date: 'Jun 10, 2026', desc: 'Pro Plan - Monthly',           amount: '$199.00', status: 'Paid' },
  { date: 'May 10, 2026', desc: 'Pro Plan - Monthly',           amount: '$199.00', status: 'Paid' },
];

export function PaymentAndHistory() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Payment & Billing Info (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Payment Method */}
        <div
          className="rounded-2xl p-5 border backdrop-blur-md"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 pb-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            Payment Method
          </h3>

          <div
            className="p-3.5 rounded-xl border flex items-center gap-3 mb-3"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="w-10 h-7 rounded bg-white flex items-center justify-center font-bold text-xs italic text-blue-800 shrink-0">
              VISA
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Visa ending in 4242</p>
              <p className="text-[11px] text-muted-foreground">Expires 12/28</p>
            </div>
          </div>

          <button className="text-xs font-semibold text-[var(--primary)] hover:underline">
            Update payment method
          </button>
        </div>

        {/* Billing Info */}
        <div
          className="rounded-2xl p-5 border backdrop-blur-md"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 pb-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            Billing Info
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Company</span>
              <span className="text-foreground font-medium">Acme Corp Intelligence</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Email</span>
              <span className="text-foreground font-medium">billing@acmecorp.com</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Address</span>
              <span className="text-foreground font-medium">123 AI Boulevard, San Francisco, CA 94105</span>
            </div>
          </div>

          <button className="text-xs font-semibold text-[var(--primary)] hover:underline mt-3 block">
            Edit billing details
          </button>
        </div>
      </div>

      {/* Billing History Table (8 cols) */}
      <div
        className="lg:col-span-8 rounded-2xl border p-5 backdrop-blur-md flex flex-col justify-between"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            Billing History & Invoices
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">DESCRIPTION</th>
                  <th className="py-3 px-4 text-right">AMOUNT</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">INVOICE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)] text-foreground">
                {INVOICES.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-high)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium">{inv.date}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{inv.desc}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">{inv.amount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1"
                        style={{
                          background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                          color: 'var(--ora-success)',
                        }}
                      >
                        <CheckCircle2 size={10} /> {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--surface-high)] transition-colors"
                        title="Download Invoice PDF"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-4 text-center border-t mt-4" style={{ borderColor: 'var(--glass-border)' }}>
          <button className="text-xs font-semibold text-[var(--primary)] hover:underline">
            View older transactions
          </button>
        </div>
      </div>
    </div>
  );
}
