import { BusinessCredentialsUtil } from '../utils/business-credentials.util';
import { ShopifyTokenService } from './shopify-token.service';

/**
 * Test double for `ShopifyTokenService`.
 *
 * Every Shopify caller now reads its access token through the token service,
 * so a spec that mocks a Business model also has to satisfy this dependency.
 * The default hands back whatever token the mocked Business carries, which is
 * what those specs assumed before the refresh flow existed.
 */
export function shopifyTokenServiceDouble(): Partial<ShopifyTokenService> {
  return {
    getValidAccessToken: jest.fn(),
    getValidAccessTokenFor: jest.fn(async (business: any) => {
      try {
        return BusinessCredentialsUtil.reveal(business?.shopifyAccessToken);
      } catch {
        return undefined;
      }
    }),
    applyTokens: jest.fn(),
    persist: jest.fn(),
    refresh: jest.fn(),
  };
}

/** The provider entry, ready to drop into a `TestingModule`. */
export const shopifyTokenServiceProvider = () => ({
  provide: ShopifyTokenService,
  useValue: shopifyTokenServiceDouble(),
});
