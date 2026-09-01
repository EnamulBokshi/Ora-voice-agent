import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BkashProvider } from './bkash.provider';

describe('BkashProvider', () => {
  let provider: BkashProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BkashProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'BKASH_APP_KEY':
                  return 'test_app_key';
                case 'BKASH_APP_SECRET':
                  return 'test_app_secret';
                case 'BKASH_USERNAME':
                  return 'test_user';
                case 'BKASH_PASSWORD':
                  return 'test_pass';
                case 'BKASH_BASE_URL':
                  return 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<BkashProvider>(BkashProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
