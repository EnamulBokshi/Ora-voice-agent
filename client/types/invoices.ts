export interface Invoice {
  _id: string;
  invoiceNumber: string;
  businessId: string;
  subscriptionId: string;
  transactionId: string;
  amountUsdCents: number;
  amountBdtPaisa: number;
  currency: string;
  taxAmount: number;
  pdfUrl: string;
  status: 'generated' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesPaginatedResponse {
  items: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ResendInvoiceResponse {
  message: string;
  pdfUrl: string;
}
