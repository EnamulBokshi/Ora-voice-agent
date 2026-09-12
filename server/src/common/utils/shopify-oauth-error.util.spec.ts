import { ShopifyOAuthError } from './shopify-oauth-error.util';

const SESSION_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJkZXN0IjoiaHR0cHM6Ly9kZW1vIn0.c2lnbmF0dXJl';

describe('ShopifyOAuthError', () => {
  it('keeps the documented error fields', () => {
    const summary = ShopifyOAuthError.summarize(
      JSON.stringify({
        error: 'invalid_subject_token',
        error_description: 'The subject token is expired.',
      }),
    );

    expect(summary).toBe(
      'invalid_subject_token: The subject token is expired.',
    );
  });

  it('drops every field Shopify does not document, including a request echo', () => {
    const summary = ShopifyOAuthError.summarize(
      JSON.stringify({
        error: 'invalid_request',
        client_secret: 'shpss_the_app_secret',
        subject_token: SESSION_TOKEN,
      }),
    );

    expect(summary).toBe('invalid_request');
    expect(summary).not.toContain('shpss_the_app_secret');
    expect(summary).not.toContain(SESSION_TOKEN);
  });

  it('scrubs credentials out of a body that is not JSON', () => {
    const summary = ShopifyOAuthError.summarize(
      `Bad request: subject_token=${SESSION_TOKEN}&client_secret=shpss_secret`,
    );

    expect(summary).not.toContain(SESSION_TOKEN);
    expect(summary).not.toContain('shpss_secret');
    expect(summary).toContain('[REDACTED]');
  });

  it('scrubs a bare access token out of free text', () => {
    expect(ShopifyOAuthError.summarize('token shpat_abc123 is invalid')).toBe(
      'token [REDACTED_TOKEN] is invalid',
    );
  });

  it('caps the length so an HTML error page cannot flood the log', () => {
    expect(ShopifyOAuthError.summarize('x'.repeat(5000))).toHaveLength(300);
  });

  it('says so when there is no body at all', () => {
    expect(ShopifyOAuthError.summarize('')).toBe('no response body');
  });
});
