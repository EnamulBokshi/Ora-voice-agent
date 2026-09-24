import { Injectable } from '@nestjs/common';
import { InvoiceDocument } from '../schemas/invoice.schema';

@Injectable()
export class PdfGeneratorService {
  /**
   * Generates formatted invoice HTML string suitable for viewing or PDF rendering
   */
  generateInvoiceHtml(invoice: InvoiceDocument, businessName?: string): string {
    const formattedAmount =
      invoice.currency === 'BDT'
        ? `৳${(invoice.amountBdtPaisa / 100).toFixed(2)} BDT`
        : `$${(invoice.amountUsdCents / 100).toFixed(2)} USD`;

    const createdAt = new Date((invoice as any).createdAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #0d1c2d; border: 1px solid #1c2b3c; border-radius: 16px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2C5745; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 800; color: #3d7a60; letter-spacing: 2px; }
    .badge { background: #2C5745; color: #EBE3A7; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .field-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .field-value { font-size: 16px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    th { background: #122131; text-align: left; padding: 14px; font-size: 12px; color: #94a3b8; text-transform: uppercase; }
    td { padding: 16px 14px; border-bottom: 1px solid #1c2b3c; font-size: 14px; }
    .total-row td { border-bottom: none; font-size: 18px; font-weight: 800; color: #EB7D00; }
    .footer { text-align: center; border-top: 1px solid #1c2b3c; padding-top: 20px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ORA AI SALES ASSISTANT</div>
      <div class="badge">${invoice.status || 'PAID'}</div>
    </div>
    
    <div class="details">
      <div>
        <div class="field-label">Billed To</div>
        <div class="field-value">${businessName || `Merchant (${invoice.businessId})`}</div>
      </div>
      <div style="text-align: right;">
        <div class="field-label">Invoice Number</div>
        <div class="field-value" style="color: #3d7a60;">${invoice.invoiceNumber}</div>
        <div class="field-label" style="margin-top: 10px;">Date</div>
        <div class="field-value">${createdAt}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Period</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ORA Merchant Subscription Plan</td>
          <td>${invoice.billingCycle === 'year' ? 'Yearly Recurring' : 'Monthly Recurring'}</td>
          <td style="text-align: right;">${formattedAmount}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">Total Paid</td>
          <td style="text-align: right;">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Thank you for powering your store with ORA AI Sales Assistant. For support, contact billing@ora.ai.
    </div>
  </div>
</body>
</html>`;
  }
}
