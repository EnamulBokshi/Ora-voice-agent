import { PiiRedactor } from './pii-redactor.util';

describe('PiiRedactor', () => {
  it('should redact email addresses from text', () => {
    const input = 'My email is alice.smith@example.com, please send the invoice.';
    const output = PiiRedactor.redact(input);
    expect(output).toBe('My email is [REDACTED_EMAIL], please send the invoice.');
  });

  it('should redact phone numbers from text', () => {
    const input = 'You can reach me at +1-555-234-5678 or (800) 123-4567.';
    const output = PiiRedactor.redact(input);
    expect(output).toBe('You can reach me at [REDACTED_PHONE] or [REDACTED_PHONE].');
  });

  it('should redact addresses with full redaction', () => {
    const input = 'Please deliver to 742 Evergreen Terrace, Apt 4B.';
    const output = PiiRedactor.redactFull(input);
    expect(output).toContain('[REDACTED_ADDRESS]');
  });
});
