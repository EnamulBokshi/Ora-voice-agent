import { resolveSessionIdentity, VoiceOperator } from './session-identity';

const owner: VoiceOperator = {
  id: 'u1',
  name: 'Store Owner',
  email: 'owner@example.com',
  role: 'owner',
  businessId: 'biz-a',
};

describe('resolveSessionIdentity', () => {
  it('treats the owner testing their own store as an anonymous shopper in a test session', () => {
    const result = resolveSessionIdentity({
      operator: owner,
      ticketMode: 'test',
      businessId: 'biz-a',
      isPlatformBusiness: false,
    });
    expect(result.authenticatedUser).toBeUndefined();
    expect(result.sessionMode).toBe('customer');
    expect(result.isTest).toBe(true);
    expect(result.mayBypassDisabledWidget).toBe(true);
  });

  it('keeps the owner identity when they train their own store', () => {
    const result = resolveSessionIdentity({
      operator: owner,
      ticketMode: 'training',
      businessId: 'biz-a',
      isPlatformBusiness: false,
    });
    expect(result.authenticatedUser).toBe(owner);
    expect(result.sessionMode).toBe('training');
    expect(result.isTest).toBe(true);
  });

  it('gives a ticket from another tenant no identity, training, test flag or widget bypass', () => {
    for (const ticketMode of ['test', 'training', 'visitor'] as const) {
      const result = resolveSessionIdentity({
        operator: owner,
        ticketMode,
        businessId: 'biz-b',
        isPlatformBusiness: false,
      });
      expect(result.authenticatedUser).toBeUndefined();
      expect(result.sessionMode).toBe('customer');
      expect(result.isTest).toBe(false);
      expect(result.mayBypassDisabledWidget).toBe(false);
    }
  });

  it('greets a logged-in merchant on the platform assistant without marking it a test', () => {
    const result = resolveSessionIdentity({
      operator: owner,
      ticketMode: 'visitor',
      businessId: 'platform',
      isPlatformBusiness: true,
    });
    expect(result.authenticatedUser).toBe(owner);
    expect(result.sessionMode).toBe('customer');
    expect(result.isTest).toBe(false);
    expect(result.mayBypassDisabledWidget).toBe(true);
  });

  it('leaves a public shopper anonymous, untracked as test, and subject to the widget switch', () => {
    const result = resolveSessionIdentity({ businessId: 'biz-a', isPlatformBusiness: false });
    expect(result.authenticatedUser).toBeUndefined();
    expect(result.sessionMode).toBe('customer');
    expect(result.isTest).toBe(false);
    expect(result.mayBypassDisabledWidget).toBe(false);
  });

  it('does not match an operator with no business to any tenant', () => {
    const result = resolveSessionIdentity({
      operator: { ...owner, businessId: undefined },
      ticketMode: 'training',
      businessId: 'biz-a',
      isPlatformBusiness: false,
    });
    expect(result.authenticatedUser).toBeUndefined();
    expect(result.sessionMode).toBe('customer');
    expect(result.mayBypassDisabledWidget).toBe(false);
  });
});
