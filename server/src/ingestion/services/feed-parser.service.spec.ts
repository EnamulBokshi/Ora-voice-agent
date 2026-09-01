import { Test, TestingModule } from '@nestjs/testing';
import { FeedParserService } from './feed-parser.service';
import { ProductsService } from '../../products/products.service';

describe('FeedParserService', () => {
  let service: FeedParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedParserService,
        {
          provide: ProductsService,
          useValue: {
            batchSync: jest.fn().mockResolvedValue({ added: 2, updated: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<FeedParserService>(FeedParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
