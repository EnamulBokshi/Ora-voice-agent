export interface Customer {
  _id: string;
  businessId: string;
  name: string;
  emailEncrypted?: string;
  phoneEncrypted?: string;
  email?: string;
  phone?: string;
  extractedPreferences?: Record<string, any>;
  pastOrderIds?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  extractedPreferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  extractedPreferences?: Record<string, any>;
  metadata?: Record<string, any>;
}
