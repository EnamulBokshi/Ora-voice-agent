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

---

## 8. Phase 7: SuperAdmin Platform Command Center & Diagnostics (`/api/v1/admin`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/admin/stats` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Platform Command Overview**: Global telemetry aggregating platform MRR/ARR, plan distribution, active/suspended merchant stores, AI voice minutes, total GMV, 7D/30D activity time-series, and infrastructure health. |
| `/api/v1/admin/businesses` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Merchants & Stores Directory**: Paginated tenant list with query filters (`page`, `limit`, `search`, `status`), enriched with store owner details, connected platform, and conversation counts. |
| `/api/v1/admin/businesses/:id` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Merchant Tenant Inspection**: Detailed drilldown of single store tenant (profile, subscription state, product count, total orders, recent activity). |
| `/api/v1/admin/businesses/:id/status` | `PATCH` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Tenant Lifecycle Control**: Update store operational status (`active`, `suspended`, `pending`). Suspended stores immediately halt AI widget sessions. |
| `/api/v1/admin/users` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Global User Registry**: Cross-tenant user directory with role filters (`super_admin`, `owner`, `admin`, `staff`), search, verification status, and pagination. |
| `/api/v1/admin/voice-sessions` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **AI Voice Telemetry & Monitor**: Live and recent real-time Gemini voice conversation sessions across all stores with turn counts, duration, caller identifier, and status. |
| `/api/v1/admin/system/health` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Infrastructure Diagnostics**: Real-time health pulse of Node process runtime, memory heap/RSS allocations, MongoDB connection pool, and Redis latency. |

### 8.1 SuperAdmin Role Enforcement & Actor Security
All `/api/v1/admin/*` endpoints strictly require:
1. `JwtAuthGuard` validating an active, non-expired AdminUser session.
2. `RolesGuard` enforcing `@Roles(AdminRole.SUPER_ADMIN)`. Any request by `owner`, `admin`, or `staff` returns `403 Forbidden` (`FORBIDDEN_RESOURCE`).
3. Cross-Tenant Aggregation: Unlike merchant endpoints, `/api/v1/admin/*` operates without `TenantScopeGuard`, querying cross-business platform telemetry while strictly excluding internal system tenants (`name: { $ne: 'ORA Platform' }`).

### 8.2 Platform Overview Statistics (`GET /api/v1/admin/stats`)
- **Query Parameters**:
  - `period` (optional, string): Timeframe for trend aggregation (`7d`, `30d`, `all`, default `30d`).
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalBusinesses": 42,
      "activeBusinesses": 40,
      "suspendedBusinesses": 2,
      "pendingBusinesses": 0,
      "totalUsers": 58,
      "totalConversations": 14250,
      "voiceConversationsCount": 5120,
      "textConversationsCount": 9130,
      "totalVoiceMinutes": 12288,
      "totalCustomers": 9820,
      "totalOrders": 1450,
      "totalGmv": 128450.00,
      "oraAgentOrders": 890,
      "oraAgentGmv": 78200.00,
      "totalProducts": 18450,
      "platformMRR": 3490,
      "platformARR": 41880,
      "planDistribution": {
        "free": 12,
        "growth": 24,
        "scale": 6
      },
      "growth": {
        "mrrTrend": "+18.4%",
        "storeTrend": "+12.5%",
        "voiceTrend": "+31.2%"
      }
    },
    "system": {
      "serverUptimeSeconds": 184520,
      "nodeMemoryUsageMB": 142,
      "nodeMemoryTotalMB": 256,
      "redisStatus": "healthy",
      "redisLatencyMs": 2,
      "mongoStatus": "connected",
      "environment": "production",
      "nodeVersion": "v20.11.0"
    },
    "recentSignups": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "name": "Aura Silk & Fashion",
        "domain": "aurasilk.com",
        "publishableKey": "biz_live_aurasilk_8f91a2c3",
        "status": "active",
        "connectedPlatform": "shopify",
        "createdAt": "2026-08-14T10:30:00.000Z"
      }
    ],
    "activityTimeline": [
      {
        "date": "2026-08-14",
        "conversations": 480,
        "voiceMinutes": 395,
        "newStores": 2,
        "gmv": 4200.00
      }
    ]
  }
}
```

### 8.3 Merchants & Stores Directory (`GET /api/v1/admin/businesses`)
- **Query Parameters**:
  - `page` (optional, number, default `1`)
  - `limit` (optional, number, default `15`, max `100`)
  - `search` (optional, string): Case-insensitive match against store name, domain, or publishable key.
  - `status` (optional, string): Filter by `active`, `suspended`, or `pending`.
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "businesses": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "name": "Apex Footwear Store",
        "domain": "apexfootwear.com",
        "publishableKey": "biz_live_apex_3b4c5d6e",
        "status": "active",
        "connectedPlatform": "shopify",
        "ownerEmail": "merchant@apex.com",
        "ownerName": "Apex Operations",
        "conversationsCount": 1840,
        "createdAt": "2026-07-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

### 8.4 Update Merchant Status (`PATCH /api/v1/admin/businesses/:id/status`)
- **Path Parameter**: `id` — Target business MongoDB ObjectId.
- **Request Body DTO**:
```json
{
  "status": "suspended" // "active" | "suspended" | "pending"
}
```
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "name": "Apex Footwear Store",
    "status": "suspended",
    "message": "Business status successfully updated to \"suspended\"."
  }
}
```

### 8.5 Global Users Registry (`GET /api/v1/admin/users`)
- **Query Parameters**:
  - `page` (optional, number, default `1`)
  - `limit` (optional, number, default `20`)
  - `role` (optional, string): Filter by `super_admin`, `owner`, `admin`, `staff`.
  - `search` (optional, string): Search by name or email.
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e999",
        "name": "Platform SuperAdmin",
        "email": "admin@ora.ai",
        "role": "super_admin",
        "emailVerified": true,
        "businessName": "ORA Platform",
        "businessId": "60d5ec49f1b2c8b1f8e4e000",
        "businessStatus": "active",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 58,
      "totalPages": 3
    }
  }
}
```

### 8.6 Voice Sessions Monitor (`GET /api/v1/admin/voice-sessions`)
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e777",
        "sessionId": "sess_live_voice_99a8b7",
        "businessName": "Apex Footwear Store",
        "customerIdentifier": "Shopper (+8801712345678)",
        "status": "active",
        "turnCount": 8,
        "createdAt": "2026-08-15T10:12:00.000Z",
        "updatedAt": "2026-08-15T10:14:32.000Z"
      }
    ]
  }
}
```

### 8.7 System Health Diagnostics (`GET /api/v1/admin/system/health`)
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "timestamp": "2026-08-15T11:15:00.000Z",
    "database": {
      "status": "connected",
      "driver": "mongoose"
    },
    "redis": {
      "status": "healthy",
      "latencyMs": 2
    },
    "process": {
      "uptimeSeconds": 184520,
      "memoryUsedMB": 142,
      "totalMemoryMB": 256,
      "nodeVersion": "v20.11.0"
    }
  }
}
```
