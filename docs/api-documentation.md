# ORA Monorepo API Documentation (v1 Aligned)

This document provides complete API reference specifications across all backend modules, detailing endpoints, HTTP methods, headers, cookies, request DTOs, response envelopes, query parameters, and JSON payload examples. All HTTP endpoints are prefixed with `/api/v1`.

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

## 2. Phase 1: Authentication & User Management (`/api/v1/auth`)

### Summary

| Endpoint | Method | Auth Guard | Description |
|---|---|---|---|
| `/api/v1/auth/register` | `POST` | Public | Provision merchant `Business` & owner `AdminUser`. Generates OTP email & sets refresh cookies. |
| `/api/v1/auth/login` | `POST` | Public | Authenticate `AdminUser` with email/password. Returns JWT Access Token (configurable TTL via `JWT_EXPIRATION`, default `15m`) & sets httpOnly refresh cookie. |
| `/api/v1/auth/refresh` | `POST` | Public (Cookie) | Rotate Refresh Token and reissue JWT Access Token. Revokes session if theft detected. |
| `/api/v1/auth/logout` | `POST` | Public (Cookie) | Revokes active Redis session and clears httpOnly authentication cookies. |
| `/api/v1/auth/me` | `GET` | `JwtAuthGuard` | Fetch current authenticated user profile & business info. |
| `/api/v1/auth/verify-otp` | `POST` | `JwtAuthGuard` | Validate 6-digit email verification OTP. On success, sets `emailVerified: true`. |
| `/api/v1/auth/resend-otp` | `POST` | `JwtAuthGuard` | Request a new 6-digit verification code sent via email. |

---

## 3. Phase 2: Product Ingestion Engine & Knowledge Base (`/api/v1/products`, `/api/v1/knowledge`, `/api/v1/ingestion`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/ingestion/upload` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | **Primary Bulk Ingestion**: Upload merchant product file (CSV, XLSX, TXT, PDF), normalize records, batch-sync to MongoDB, and auto-embed into `VectorIndex`. |
| `/api/v1/products` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Read-only inspection & search of ingested catalog mirror with pagination & filters. |
| `/api/v1/products/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single ingested product details by ID. |
| `/api/v1/products/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | **Manual Override**: Correct misparsed price/stock/attribute fields on mirrored product record using `UpdateProductOverrideDto`. |
| `/api/v1/products/batch-sync` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Programmatic bulk upsert of products with source tier tracking. |
| `/api/v1/products/:id/verify-live` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Query-time live price & stock verification endpoint using `VerifyLiveDto`. |
| `/api/v1/ingestion/webhooks/:platform` | `POST` | Public (HMAC Verified) | N/A | **Tier 1**: Shopify / WooCommerce platform webhook listener (HMAC signature verified, `confidenceScore: 1.0`). |
| `/api/v1/ingestion/feed` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | **Tier 2**: Parse Google Merchant XML (RSS/Atom) or CSV catalog feed URL (`SourceTier.TIER2_FEED`, `confidenceScore: 0.7`). |
| `/api/v1/ingestion/passive` | `POST` | `ApiKeyGuard` | N/A | **Tier 3**: Storefront passive capture & sitemap crawler (`SourceTier.TIER3_PASSIVE`, `confidenceScore: 0.3`). |
| `/api/v1/ingestion/manual` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | **Tier 4**: Custom payload endpoint with field mapping config and property validation (`SourceTier.TIER4_MANUAL`, `confidenceScore: 0.5`). |
| `/api/v1/knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Create store context document, auto-chunk text, and auto-embed snippets into `VectorIndex`. |
| `/api/v1/knowledge` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List store knowledge base documents with pagination (`page`, `limit`). |
| `/api/v1/knowledge/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single knowledge base document. |
| `/api/v1/knowledge/:id/chunks` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Retrieve chunked text snippets for document. |
| `/api/v1/knowledge/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Update document title/content, re-chunk, and auto-embed into `VectorIndex`. |
| `/api/v1/knowledge/:id` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Delete document, cascade delete chunks, and delete embeddings from `VectorIndex`. |

---

## 4. Phase 3: RAG & Vector Store Pipeline (`/api/v1/rag`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/rag/search-products` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector product search with candidate cap (top 5), multi-tier fallback (**Gap A** `mongo_regex` & **Gap B** `live_shopify`/`live_woocommerce`/`live_manual`), event logging (`RAG_FALLBACK_TRIGGERED` with `fallbackTier`), and self-healing auto-indexing. |
| `/api/v1/rag/search-knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector search on store policies, FAQs & sales playbooks. |
| `/api/v1/rag/search` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Combined hybrid semantic search across products and store rules. |
| `/api/v1/rag/reindex-tenant` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Trigger bulk vector re-indexing for tenant catalog and knowledge base. |

### 4.1 RAG Engine Configuration & Fallback Taxonomy

#### Configurable Similarity Thresholds (Environment Variables)
- `RAG_PRODUCT_CONFIDENCE_THRESHOLD` (default `0.65`): Minimum cosine similarity score for candidate product vectors.
- `RAG_KNOWLEDGE_CONFIDENCE_THRESHOLD` (default `0.60`): Minimum cosine similarity score for knowledge chunk vectors.
- `GEMINI_EMBEDDING_MODEL` (default `models/text-embedding-004`): Google Gemini embedding model identifier.

#### Self-Healing Fallback Taxonomy (`fallbackTier`)
When vector search returns zero results or candidates below confidence thresholds:
1. **`mongo_regex` (Gap A)**: Product exists in tenant MongoDB catalog but has not been embedded yet. Discovered via regex search, returned immediately, and asynchronously embedded into `VectorIndex`.
2. **`live_shopify` / `live_woocommerce` / `live_manual` (Gap B)**: Product does not exist in MongoDB at all (ingestion lag). RAG queries the merchant's live platform API directly using stored connector credentials (`connectedPlatform`), returns the live product payload, asynchronously batch-syncs it to MongoDB, and embeds it into `VectorIndex`.
3. **`none`**: Vector search hit directly on fast RAG path, or query unresolvable across all fallback tiers.

---

## 5. Phase 4: Order Audit & Performance Analytics (`/api/v1/orders`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/orders` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | **Read-Only Dashboard Analytics**: List tenant orders placed by AI agent (`ORD-2026-000100`) with pagination & performance metrics. |
| `/api/v1/orders/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch detailed order items, total revenue, linked conversation session, and shipping address. |

#### Order Lifecycle Note
Orders are created **internally** by `AiToolsExecutor.place_order` when an AI voice/text session closes a sale or via merchant platform webhooks. Manual order creation (`POST`) and manual status editing (`PATCH`) are removed from external REST interfaces — fulfillment and status lifecycle are managed natively within the merchant's e-commerce platform (Shopify/WooCommerce).

---

## 6. Phase 5: Customer, Agent Config & Voice/Conversation Gateways (`/api/v1/customers`, `/api/v1/agent-config`, `/api/v1/conversations`)

### Summary

| Endpoint / Gateway | Protocol | Auth Guard | Description |
|---|---|---|---|
| `/api/v1/customers` | `POST` / `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Manage end-shopper profiles with AES-256 field-level PII encryption. |
| `/api/v1/customers/:id` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Fetch or update customer PII & preferences. |
| `/api/v1/agent-config` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve or update brand voice, voice IDs, and sales playbook settings (`mentionLowStockUrgency`). |
| `/api/v1/conversations` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | List merchant customer conversation sessions with pagination. |
| `/api/v1/conversations/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve transcript with full message history and tool calls. |
| `/api/v1/conversations/:id/close` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Mark conversation session closed. |
| `ws://<host>/conversations` | `WebSocket` | Publishable Key (`biz_live_xxxx`) | Text chat conversation gateway with verified product lookup parity (`AiToolsExecutor.find_products` + `ProductsService.verifyLive`). |
| `ws://<host>/voice` | `WebSocket` | Publishable Key (`biz_live_xxxx`) | Real-time bidirectional audio streaming & tool execution powered by Gemini 2.5 (`GEMINI_MODEL=models/gemini-2.5-flash`). |

### 6.1 Gemini Real-Time Voice & Text Chat AI Agent Tools

#### Channel Verification Parity
Both the **Voice Gateway** (`ws://<host>/voice`) and the **Text Chat Gateway** (`ws://<host>/conversations`) route product discovery requests through the unified `AiToolsExecutor.find_products` path. Every price and stock value returned to a shopper is verified in real-time via `ProductsService.verifyLive()`.

#### Executable AI Agent Tools
- `find_products`: Unified search and live verification tool returning pre-verified price, stock quantity, `isLowStock` boolean, and optional `urgencyHint` string.
- `get_product_details`: Fetches full product metadata including real-time stock verification.
- `add_to_cart`: Adds item to Redis session cart (`cart:conv:{sessionId}`).
- `place_order`: Places customer order directly from Redis cart (Tier 1 integrated merchants).
- `redirect_to_checkout`: Generates storefront checkout URL (Tier 2-4 merchants).
- `get_store_policy`: Searches knowledge base for FAQs and policies.

#### Low-Stock Urgency Signal (`isLowStock` & `urgencyHint`)
- Threshold: Configured via `LOW_STOCK_THRESHOLD` (default `5` units).
- Derived State: `isLowStock = (availability === 'in_stock' && stockQuantity <= LOW_STOCK_THRESHOLD)`. Computed dynamically at response time; never stored statically.
- Sales Playbook Wiring: When `SalesPlaybook.mentionLowStockUrgency` is enabled for the business, `find_products` attaches an `urgencyHint` ("Only X left in stock!") and the Gemini system prompt instructs the AI voice agent to naturally communicate limited availability.

---

## 7. Phase 6: Payment Billing & Invoicing Engine (`/api/v1/billing`, `/api/v1/invoices`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/billing/plans` | `GET` | Public | All Roles | List available pricing plans (`Free`, `Growth`, `Scale`). |
| `/api/v1/billing/subscription` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch active business subscription and current Redis usage counters. |
| `/api/v1/billing/subscribe` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Subscribe or upgrade business plan tier via Stripe or initiate bKash Tokenized agreement redirect. |
| `/api/v1/billing/bkash/execute-agreement` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Execute bKash Tokenized Checkout agreement and complete initial subscription payment. |
| `/api/v1/billing/process-renewals` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Trigger active renewal execution for expiring bKash subscriptions. |
| `/api/v1/billing/cancel` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner | Cancel active business subscription at period end. |
| `/api/v1/billing/webhooks/stripe` | `POST` | Public (Stripe Signature) | N/A | Public webhook handler for Stripe events. |
| `/api/v1/invoices` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List merchant invoices with pagination. |
| `/api/v1/invoices/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single invoice details by ID. |
| `/api/v1/invoices/:id/pdf` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Stream or view server-side rendered HTML/PDF invoice document. |
| `/api/v1/invoices/:id/resend` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Manually resend invoice PDF email and audit log delivery attempt. |
