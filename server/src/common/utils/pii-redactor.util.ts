export class PiiRedactor {
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  private static readonly PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g;
  
  // Matches typical address street patterns when contextualized (house number + street name + street suffix)
  private static readonly CONTEXTUAL_ADDRESS_REGEX = /\b\d{1,5}\s+[\w\s,.]+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|way|court|ct|house|apt|suite|fl|floor|block)\b/gi;

  /**
   * Redacts emails and phone numbers across general conversation text.
   */
  static redact(text: string): string {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(this.EMAIL_REGEX, '[REDACTED_EMAIL]')
      .replace(this.PHONE_REGEX, '[REDACTED_PHONE]');
  }

  /**
   * Redacts delivery address details specifically in ordering context.
   */
  static redactAddress(text: string): string {
    if (!text || typeof text !== 'string') return text;
    return text.replace(this.CONTEXTUAL_ADDRESS_REGEX, '[REDACTED_ADDRESS]');
  }

  /**
   * Full redaction for turns known to contain customer PII/checkout info.
   */
  static redactFull(text: string): string {
    if (!text || typeof text !== 'string') return text;
    return this.redactAddress(this.redact(text));
  }
}
