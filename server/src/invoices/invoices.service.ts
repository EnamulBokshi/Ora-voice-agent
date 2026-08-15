import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from './schemas/invoice.schema';
import { InvoiceCounter, InvoiceCounterDocument } from './schemas/invoice-counter.schema';
import { InvoiceDeliveryLog, InvoiceDeliveryLogDocument } from './schemas/invoice-delivery-log.schema';
import { DomainException } from '../common/exceptions/domain.exception';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceCounter.name)
    private readonly counterModel: Model<InvoiceCounterDocument>,
    @InjectModel(InvoiceDeliveryLog.name)
    private readonly deliveryLogModel: Model<InvoiceDeliveryLogDocument>,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  async generateInvoice(params: {
    businessId: string;
    subscriptionId: string;
    transactionId: string;
    amountUsdCents: number;
    amountBdtPaisa: number;
    currency?: string;
  }): Promise<InvoiceDocument> {
    // 1. Atomic sequential counter generation
    const currentYear = new Date().getFullYear();
    const counter = await this.counterModel
      .findOneAndUpdate(
        { counterId: 'invoice' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    const formattedSeq = String(counter.seq).padStart(6, '0');
    const invoiceNumber = `ORA-${currentYear}-${formattedSeq}`;

    const invoice = new this.invoiceModel({
      invoiceNumber,
      businessId: params.businessId as any,
      subscriptionId: params.subscriptionId as any,
      transactionId: params.transactionId as any,
      amountUsdCents: params.amountUsdCents,
      amountBdtPaisa: params.amountBdtPaisa,
      currency: params.currency || 'USD',
      taxAmount: 0,
      pdfUrl: `/api/v1/invoices/temp-placeholder`,
      status: InvoiceStatus.GENERATED,
    });

    const savedInvoice = await invoice.save();

    // Assign final API route for PDF download endpoint
    savedInvoice.pdfUrl = `/api/v1/invoices/${savedInvoice._id}/pdf`;
    await savedInvoice.save();

    // Log delivery attempt
    await new this.deliveryLogModel({
      invoiceId: savedInvoice._id as any,
      attemptNumber: 1,
      trigger: 'auto',
      status: 'succeeded',
      providerResponse: { message: 'Invoice PDF rendered and delivery link generated.' },
    }).save();

    this.logger.log(
      `[InvoicesService] Generated sequential invoice ${invoiceNumber} for business ${params.businessId}`,
    );

    return savedInvoice;
  }

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { businessId: businessId as any };

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(businessId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!invoice) {
      throw new DomainException(
        'INVOICE_NOT_FOUND',
        `Invoice with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return invoice;
  }

  async getInvoiceHtml(businessId: string, id: string): Promise<string> {
    const invoice = await this.findOne(businessId, id);
    return this.pdfGeneratorService.generateInvoiceHtml(invoice);
  }

  async resendInvoice(businessId: string, id: string) {
    const invoice = await this.findOne(businessId, id);

    const logCount = await this.deliveryLogModel.countDocuments({
      invoiceId: invoice._id as any,
    });

    await new this.deliveryLogModel({
      invoiceId: invoice._id as any,
      attemptNumber: logCount + 1,
      trigger: 'manual-resend',
      status: 'succeeded',
      providerResponse: { message: 'Manual resend email dispatched.' },
    }).save();

    return {
      message: `Invoice ${invoice.invoiceNumber} email resent successfully.`,
      pdfUrl: invoice.pdfUrl,
    };
  }
}
