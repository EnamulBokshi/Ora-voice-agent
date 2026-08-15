export type UserRole = 'super_admin' | 'owner' | 'admin' | 'staff';

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
  publishableKey: string;
  status?: string;
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
