import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceCounter, InvoiceCounterSchema } from './schemas/invoice-counter.schema';
import { InvoiceDeliveryLog, InvoiceDeliveryLogSchema } from './schemas/invoice-delivery-log.schema';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: InvoiceCounter.name, schema: InvoiceCounterSchema },
      { name: InvoiceDeliveryLog.name, schema: InvoiceDeliveryLogSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfGeneratorService],
  exports: [InvoicesService, PdfGeneratorService, MongooseModule],
})
export class InvoicesModule {}
