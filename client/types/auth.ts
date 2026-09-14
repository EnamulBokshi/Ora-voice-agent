export type UserRole = 'super_admin' | 'owner' | 'admin' | 'staff' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface Business {
  id: string;
  name: string;
  domain?: string;
  publishableKey?: string | null;
  status?: string;
  isWidgetActive?: boolean;
  /**
   * True once the widget has opened at least one real voice session from a storefront
   * page. Derived server-side from `detectedOrigins`, which the voice gateway writes on
   * connection — the only client-visible proof the embed is actually installed.
   */
  hasWidgetTraffic?: boolean;
  /** The agent profile currently serving traffic. */
  activeArchetype?: string;
  /**
   * Whether this business actually sells from a catalogue. Catalogue surfaces
   * in the dashboard are shown on this evidence rather than to everybody.
   */
  hasCatalog?: boolean;
}

export interface AuthResponseData {
  accessToken: string;
  user: User;
  business: Business;
}

export interface RefreshResponseData {
  accessToken: string;
}

export interface ProfileResponseData {
  user: User;
  business: Business | null;
}

export interface OtpResponseData {
  message: string;
  emailVerified?: boolean;
}

export interface ForgotPasswordResponseData {
  message: string;
  devToken?: string;
}

export interface VerifyResetTokenResponseData {
  valid: boolean;
  email?: string;
}

export interface ResetPasswordResponseData {
  message: string;
  accessToken?: string;
  user?: User;
  business?: Business;
}

export interface ApiError {
  code: string;
  message: string;
  correlationId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
