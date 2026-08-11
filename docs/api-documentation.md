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
    code: string;           // E.g., 'INVALID_CREDENTIALS', 'PRODUCT_NOT_FOUND', 'KNOWLEDGE_DOC_NOT_FOUND'
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

### 4.1 `POST /api/rag/search-products`

Performs tenant-isolated semantic vector search on product catalog. Returns ranked products capped at top 5. Automatically triggers live keyword search fallback if vector confidence is low or zero matches are found.

- **URL:** `/api/rag/search-products`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Request Payload Body (`SearchRagDto`)
```json
{
  "query": "Wireless noise canceling headphones with long battery life",
  "limit": 5,
  "confidenceThreshold": 0.65
}
```

#### Response Example (200 OK — Vector Match)
```json
{
  "success": true,
  "data": {
    "query": "Wireless noise canceling headphones with long battery life",
    "fallbackTriggered": false,
    "results": [
      {
        "entityId": "66b8e1f0a4f8901234567891",
        "entityType": "product",
        "text": "Wireless Noise-Canceling Headphones Premium over-ear headphones...",
        "score": 0.92,
        "data": {
          "_id": "66b8e1f0a4f8901234567891",
          "name": "Wireless Noise-Canceling Headphones",
          "price": 299.99,
          "availability": "in_stock",
          "stockQuantity": 45
        }
      }
    ]
  }
}
```

#### Response Example (200 OK — Fallback Triggered)
```json
{
  "success": true,
  "data": {
    "query": "Custom rare mechanical keyboard",
    "fallbackTriggered": true,
    "results": [
      {
        "entityId": "66b8e1f0a4f8901234567899",
        "entityType": "product",
        "text": "Custom Rare Mechanical Keyboard Hot-swappable RGB...",
        "score": 0.7,
        "data": {
          "_id": "66b8e1f0a4f8901234567899",
          "name": "Custom Rare Mechanical Keyboard",
          "price": 180.00,
          "availability": "in_stock"
        }
      }
    ]
  }
}
```

---

### 4.2 `POST /api/rag/search-knowledge`

Performs semantic vector search on store policies, FAQs, and brand rules to fetch context snippets for RAG prompt augmentation.

- **URL:** `/api/rag/search-knowledge`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Request Payload Body (`SearchRagDto`)
```json
{
  "query": "What is the return policy for international shipping?",
  "limit": 3
}
```

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "query": "What is the return policy for international shipping?",
    "results": [
      {
        "entityId": "66b8f3a0a4f89012345678c9",
        "entityType": "knowledge_chunk",
        "text": "We offer a hassle-free 30-day money-back guarantee for all original unopened products. International express shipping takes 5-7 business days...",
        "score": 0.88,
        "metadata": {
          "docTitle": "30-Day Return Policy & Shipping Rules",
          "docType": "policy"
        }
      }
    ]
  }
}
```

---

### 4.3 `POST /api/rag/reindex-tenant`

Triggers a full re-indexing of all products and knowledge base documents for the tenant.

- **URL:** `/api/rag/reindex-tenant`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Tenant bulk re-indexing completed successfully.",
    "indexedProducts": 45,
    "indexedChunks": 128
  }
}
```
