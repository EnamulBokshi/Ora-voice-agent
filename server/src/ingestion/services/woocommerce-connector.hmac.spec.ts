import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { WooCommerceConnectorService } from './woocommerce-connector.service';
import { ProductsService } from '../../products/products.service';
import { Business } from '../../users/schemas/business.schema';

describe('WooCommerceConnectorService.verifyWebhookHmac', () => {
  const secret = 'woo_test_secret';
  const rawBody = Buffer.from('{"id":7,"name":"Widget"}');

  const sign = (body: Buffer, key: string) =>
    crypto.createHmac('sha256', key).update(body).digest('base64');

  const build = async (configured?: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WooCommerceConnectorService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(configured) },
        },
        { provide: ProductsService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: {} },
      ],
    }).compile();

    return module.get<WooCommerceConnectorService>(WooCommerceConnectorService);
  };

  it('accepts a signature computed with the configured secret', async () => {
    const service = await build(secret);
    expect(service.verifyWebhookHmac(rawBody, sign(rawBody, secret))).toBe(true);
  });

  it('rejects a shorter signature without throwing a RangeError', async () => {
    const service = await build(secret);
    expect(() => service.verifyWebhookHmac(rawBody, 'short')).not.toThrow();
    expect(service.verifyWebhookHmac(rawBody, 'short')).toBe(false);
  });

  it('rejects every signature when no secret is configured', async () => {
    const service = await build(undefined);
    expect(
      service.verifyWebhookHmac(
        rawBody,
        sign(rawBody, 'ora_woocommerce_secret_dev_key'),
      ),
    ).toBe(false);
  });
});
