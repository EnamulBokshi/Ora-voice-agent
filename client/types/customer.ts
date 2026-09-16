export interface Customer {
  _id: string;
  id?: string;
  businessId: string;
  name: string;
  emailEncrypted?: string;
  phoneEncrypted?: string;
  email?: string | null;
  phone?: string | null;
  isAnonymous?: boolean;
  isMerged?: boolean;
  mergedIntoCustomerId?: string | null;
  deviceIds?: string[];
  externalCustomerId?: string | null;
  extractedPreferences?: Record<string, unknown>;
  pastOrderIds?: string[];
  metadata?: Record<string, unknown>;
  lastActiveAt?: string | Date;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  extractedPreferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  extractedPreferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
