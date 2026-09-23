import type { VoiceTicketMode } from './voice-ticket.service';

export interface VoiceOperator {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId?: string;
}

export interface SessionIdentityInput {
  /** The dashboard user who redeemed a voice ticket, if any. */
  operator?: VoiceOperator;
  /** The mode that ticket was issued for. */
  ticketMode?: VoiceTicketMode;
  /** The tenant behind the publishable key. */
  businessId: string;
  /** Whether that tenant is ORA's own platform assistant. */
  isPlatformBusiness: boolean;
}

export interface SessionIdentity {
  /** The identity the model and the conversation record see. Undefined means a shopper. */
  authenticatedUser?: VoiceOperator;
  sessionMode: 'customer' | 'training';
  /** The store's own staff testing or training it: kept out of listings, analytics and usage. */
  isTest: boolean;
  /** Whether this connection may open a session while the store's widget is disabled. */
  mayBypassDisabledWidget: boolean;
}

/**
 * Decides who a voice session is talking to.
 *
 * A dashboard user is not a shopper. Their identity reaches the model only on
 * ORA's own platform assistant, which is meant to greet merchants, or when the
 * owner trains their own store. A test session meets ORA the way a stranger
 * would. A ticket from another tenant grants nothing: no identity, no training,
 * no test bookkeeping, no way past a disabled widget.
 */
export function resolveSessionIdentity({
  operator,
  ticketMode,
  businessId,
  isPlatformBusiness,
}: SessionIdentityInput): SessionIdentity {
  const operatorOwnsBusiness = !!operator && !!operator.businessId && operator.businessId === businessId;

  const sessionMode = ticketMode === 'training' && operatorOwnsBusiness ? 'training' : 'customer';
  const isTest = operatorOwnsBusiness && (ticketMode === 'test' || ticketMode === 'training');

  const authenticatedUser =
    operator && (isPlatformBusiness || sessionMode === 'training') ? operator : undefined;

  // A disabled widget turns away the public. The store's own staff still get
  // through to train and test, as does anyone on the platform assistant.
  const mayBypassDisabledWidget = operatorOwnsBusiness || (isPlatformBusiness && !!operator);

  return { authenticatedUser, sessionMode, isTest, mayBypassDisabledWidget };
}
