# ORA Monorepo API Documentation

This document provides complete API reference specifications across all backend modules, detailing endpoints, HTTP methods, headers, cookies, request DTOs, response envelopes, query parameters, and JSON payload examples.

---

## 1. Global Response Specifications

All API endpoints in ORA return a standardized envelope structure.

### 1.1 Success Envelope Type
```typescript
interface SuccessEnvelope<T> {
  success: true;
  data: T;
}
```

### 1.2 Error Envelope Type
```typescript
interface ErrorEnvelope {
  success: false;
  error: {
    code: string;           // E.g., 'INVALID_CREDENTIALS', 'PRODUCT_NOT_FOUND', 'PLAN_LIMIT_EXCEEDED'
    message: string;        // Human-readable explanation
    correlationId: string; // Unique request tracing ID (e.g. 'req-a1b2c3d4')
  };
}
```

---

## 2. Phase 1: Authentication & User Management (`/api/auth`)

### Summary

| Endpoint | Method | Auth Guard | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Provision merchant `Business` & owner `AdminUser`. Generates OTP email & sets refresh cookies. |
| `/api/auth/login` | `POST` | Public | Authenticate `AdminUser` with email/password. Returns JWT Access Token & sets httpOnly refresh cookie. |
| `/api/auth/refresh` | `POST` | Public (Cookie) | Rotate Refresh Token and reissue 15-minute JWT Access Token. Revokes session if theft detected. |
| `/api/auth/logout` | `POST` | Public (Cookie) | Revokes active Redis session and clears httpOnly authentication cookies. |
| `/api/auth/me` | `GET` | `JwtAuthGuard` | Fetch current authenticated user profile & business info. |
| `/api/auth/verify-otp` | `POST` | `JwtAuthGuard` | Validate 6-digit email verification OTP. On success, sets `emailVerified: true`. |
| `/api/auth/resend-otp` | `POST` | `JwtAuthGuard` | Request a new 6-digit verification code sent via email. |

---

## 3. Phase 2: Product Catalog & Knowledge Base (`/api/products`, `/api/knowledge`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/products` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Create a new product record in merchant catalog. |
| `/api/products` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List & search catalog products with pagination & filters. |
| `/api/products/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single product details by ID. |
| `/api/products/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Update product details (price, stock, availability, tags). |
| `/api/products/:id` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Delete a product from tenant catalog. |
| `/api/products/batch-sync` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Bulk upsert products from feeds or platform webhooks. |
| `/api/products/:id/verify-live` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Perform live verification update of price & stock. |
| `/api/knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Create store context document & auto-chunk text. |
| `/api/knowledge` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List store knowledge base documents for tenant. |
| `/api/knowledge/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single knowledge base document. |
| `/api/knowledge/:id/chunks` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Retrieve chunked text snippets for document. |
| `/api/knowledge/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Update document title/content & re-chunk. |
| `/api/knowledge/:id` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Delete document and cascade delete its chunks. |

---

## 4. Phase 3: RAG & Vector Store Pipeline (`/api/rag`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/rag/search-products` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector product search with candidate cap (top 5) & fallback. |
| `/api/rag/search-knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector search on store policies, FAQs & sales playbooks. |
| `/api/rag/search` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Combined hybrid semantic search across products and store rules. |
| `/api/rag/reindex-tenant` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Trigger bulk vector re-indexing for tenant catalog and knowledge base. |

---

## 5. Phase 4: Customer, Agent Config & Conversation Gateway (`/api/customers`, `/api/agent-config`, `/api/conversations`)

### Summary

| Endpoint / Gateway | Protocol | Auth Guard | Description |
|---|---|---|---|
| `/api/customers` | `POST` / `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Manage end-shopper profiles with AES-256 field-level PII encryption. |
| `/api/customers/:id` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Fetch or update customer PII & preferences. |
| `/api/agent-config` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve or update brand voice, voice IDs, and sales playbook settings. |
| `/api/conversations` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | List merchant customer conversation sessions with pagination. |
| `/api/conversations/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve transcript with full message history and tool calls. |
| `/api/conversations/:id/close` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Mark conversation session closed. |
| `ws://<host>/conversations` | `WebSocket` | Publishable Key (`biz_live_xxxx`) | Real-time chat & voice session gateway. |

---

## 6. Phase 5: Payment Billing & Invoicing Engine (`/api/billing`, `/api/invoices`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/billing/plans` | `GET` | Public | All Roles | List available pricing plans (`Free`, `Growth`, `Scale`). |
| `/api/billing/subscription` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch active business subscription and current Redis usage counters. |
| `/api/billing/subscribe` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Subscribe or upgrade business plan tier via Stripe. |
| `/api/billing/cancel` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner | Cancel active business subscription at period end. |
| `/api/billing/webhooks/stripe` | `POST` | Public (Stripe Signature) | N/A | Public webhook handler for Stripe events. |
| `/api/invoices` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List merchant invoices with pagination. |
| `/api/invoices/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single invoice details by ID. |
| `/api/invoices/:id/resend` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Manually resend invoice PDF email and audit log delivery attempt. |

---

### 6.1 Subscribe Payload Example (`POST /api/billing/subscribe`)

```json
{
  "planId": "growth",
  "billingProvider": "stripe"
}
```

### 6.2 Subscribe Response Example
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "66b91f0a4f890123456789a1",
      "businessId": "66b8d2e1a4f890123456789f",
      "planId": "growth",
      "billingProvider": "stripe",
      "status": "active",
      "currentPeriodStart": "2026-08-11T10:50:00.000Z",
      "currentPeriodEnd": "2026-09-10T10:50:00.000Z",
      "cancelAtPeriodEnd": false
    },
    "transaction": {
      "_id": "66b91f0a4f890123456789a2",
      "amount": 49,
      "currency": "USD",
      "status": "succeeded"
    },
    "invoice": {
      "invoiceNumber": "ORA-2026-000101",
      "pdfUrl": "https://cdn.ora.ai/invoices/ORA-2026-000101.pdf",
      "amountUsdCents": 4900,
      "status": "generated"
    }
  }
}
```
