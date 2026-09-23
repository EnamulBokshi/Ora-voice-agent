import { Injectable } from '@nestjs/common';

const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.block',
  'throwawaymail.com',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'dispostable.com',
  'mailnesia.com',
  'getairmail.com',
  'maildrop.cc',
  'inboxkitten.com',
  'tempail.com',
  'mohmal.com',
  'fakemailgenerator.com',
  'burnermail.io',
  'mytemp.email',
  'crazymailing.com',
  'nada.ltd',
  'getnada.com',
  'emailondeck.com',
  'generator.email',
  'tempinbox.com',
]);

export function normalizeWebsiteDomain(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().toLowerCase();

  // Strip protocol
  cleaned = cleaned.replace(/^[a-zA-Z]+:\/\//, '');

  // Strip credentials if any (user:pass@)
  cleaned = cleaned.replace(/^[^@]+@/, '');

  // Strip path, query params, hash
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  cleaned = cleaned.split('#')[0];

  // Strip port
  cleaned = cleaned.split(':')[0];

  // Strip leading 'www.'
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  // Strip trailing periods or dots
  cleaned = cleaned.replace(/\.+$/, '');

  return cleaned.trim();
}

@Injectable()
export class DisposableEmailValidatorService {
  isDisposable(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];

    if (DISPOSABLE_DOMAINS.has(domain)) return true;

    // Subdomain check (e.g. *.mailinator.com)
    for (const disp of DISPOSABLE_DOMAINS) {
      if (domain.endsWith(`.${disp}`)) {
        return true;
      }
    }

    return false;
  }

  normalizeDomain(rawDomainOrUrl: string): string {
    return normalizeWebsiteDomain(rawDomainOrUrl);
  }
}
