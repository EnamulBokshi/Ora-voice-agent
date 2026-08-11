import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { Invoice } from './schemas/invoice.schema';
import { InvoiceCounter } from './schemas/invoice-counter.schema';
import { InvoiceDeliveryLog } from './schemas/invoice-delivery-log.schema';

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getModelToken(Invoice.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: getModelToken(InvoiceCounter.name),
          useValue: {
            findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ seq: 123 }) }),
          },
        },
        {
          provide: getModelToken(InvoiceDeliveryLog.name),
          useValue: {
            countDocuments: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
