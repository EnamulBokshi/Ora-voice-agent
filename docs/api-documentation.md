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
    code: string;           // E.g., 'INVALID_CREDENTIALS', 'PRODUCT_NOT_FOUND', 'CUSTOMER_NOT_FOUND'
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

## 5. Phase 4: Customer, Agent Config & Conversation Gateway

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

### 5.1 WebSocket Gateway Protocol Reference

#### Socket Connection Namespace
- **URL:** `ws://localhost:4000/conversations` (or `wss://<domain>/conversations`)

#### Socket Event 1: `init-session` (Client -> Server)
```json
{
  "publishableKey": "biz_live_8f3a91bc7d0e4129b0123456",
  "sessionId": "conv_sess_9021a8b7",
  "channel": "widget_chat"
}
```

#### Socket Event 1 Response: `session-initialized` (Server -> Client)
```json
{
  "success": true,
  "sessionId": "conv_sess_9021a8b7",
  "businessId": "66b8d2e1a4f890123456789f",
  "status": "active"
}
```

#### Socket Event 2: `send-message` (Client -> Server)
```json
{
  "publishableKey": "biz_live_8f3a91bc7d0e4129b0123456",
  "sessionId": "conv_sess_9021a8b7",
  "content": "Do you have noise canceling headphones under $300?"
}
```

#### Socket Event 2 Response: `message-received` (Server -> Client)
```json
{
  "sessionId": "conv_sess_9021a8b7",
  "messageId": "66b901a2a4f89012345678b4",
  "role": "assistant",
  "content": "Thank you for reaching out! I recommend checking out Wireless Noise-Canceling Headphones ($299.99).",
  "ragContext": {
    "products": [
      {
        "entityId": "66b8e1f0a4f8901234567891",
        "entityType": "product",
        "score": 0.92,
        "data": {
          "name": "Wireless Noise-Canceling Headphones",
          "price": 299.99,
          "availability": "in_stock"
        }
      }
    ],
    "knowledge": [],
    "fallbackTriggered": false
  },
  "timestamp": "2026-08-11T16:15:00.000Z"
}
```
