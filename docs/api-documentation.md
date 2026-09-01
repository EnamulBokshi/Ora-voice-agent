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

## 3. Merchant Business & Key Management (`/api/v1/business`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/business/current` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch current merchant store profile, registered domain, and active publishable key status. |
| `/api/v1/business/publishable-key` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | **Single-Key Generation**: Generate an active publishable widget key (`biz_live_xxxx`). Replaces and invalidates any previous key. |
| `/api/v1/business/publishable-key` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | **Key Revocation & Deletion**: Instantly revokes and deletes the merchant's publishable key, severing all active widget connections across websites. |

---

## 4. Phase 2: Product Ingestion Engine & Knowledge Base (`/api/v1/products`, `/api/v1/knowledge`, `/api/v1/ingestion`)

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

## 5. Phase 3: RAG & Vector Store Pipeline (`/api/v1/rag`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/rag/search-products` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector product search with candidate cap (top 5), multi-tier fallback (**Gap A** `mongo_regex` & **Gap B** `live_shopify`/`live_woocommerce`/`live_manual`), event logging (`RAG_FALLBACK_TRIGGERED` with `fallbackTier`), and self-healing auto-indexing. |
| `/api/v1/rag/search-knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Semantic vector search on store policies, FAQs & sales playbooks. |
| `/api/v1/rag/search` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Combined hybrid semantic search across products and store rules. |
| `/api/v1/rag/reindex-tenant` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Trigger bulk vector re-indexing for tenant catalog and knowledge base. |

### 5.1 RAG Engine Configuration & Fallback Taxonomy

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

## 6. Phase 4: Order Audit & Performance Analytics (`/api/v1/orders`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/orders` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | **Read-Only Dashboard Analytics**: List tenant orders placed by AI agent (`ORD-2026-000100`) with pagination & performance metrics. |
| `/api/v1/orders/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch detailed order items, total revenue, linked conversation session, and shipping address. |

#### Order Lifecycle Note
Orders are created **internally** by `AiToolsExecutor.place_order` when an AI voice/text session closes a sale or via merchant platform webhooks. Manual order creation (`POST`) and manual status editing (`PATCH`) are removed from external REST interfaces — fulfillment and status lifecycle are managed natively within the merchant's e-commerce platform (Shopify/WooCommerce).

---

## 7. Phase 5: Customer, Agent Config, Voice Session & Conversations (`/api/v1/customers`, `/api/v1/agent-config`, `/api/v1/voice`, `/api/v1/conversations`)

### Summary

| Endpoint / Gateway | Protocol | Auth Guard | Description |
|---|---|---|---|
| `/api/v1/customers` | `POST` / `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Manage end-shopper profiles with AES-256 field-level PII encryption. |
| `/api/v1/customers/:id` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Fetch or update customer PII & preferences. |
| `/api/v1/agent-config` | `GET` / `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve or update brand voice, voice IDs, and sales playbook settings (`mentionLowStockUrgency`). |
| `/api/v1/voice/session/bootstrap` | `POST` | Public | **Safe Voice Session Bootstrap**: Validates publishable key and returns session identifier and secure WebSocket route path (`{ sessionId, wsPath: '/ws/voice' }`). |
| `/api/v1/conversations` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | List merchant customer conversation sessions with pagination. |
| `/api/v1/conversations/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | Retrieve transcript with full message history and tool calls. |
| `/api/v1/conversations/:id/close` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Mark conversation session closed. |
| `ws://<host>/conversations` | `WebSocket` | Publishable Key (`biz_live_xxxx`) | Text chat conversation gateway with verified product lookup parity (`AiToolsExecutor.find_products` + `ProductsService.verifyLive`). |
| `ws://<host>/voice` | `WebSocket` | Publishable Key (`biz_live_xxxx`) | Real-time bidirectional audio streaming & tool execution powered by Gemini 2.5 (`GEMINI_MODEL=models/gemini-2.5-flash`). Enforces key status and logs origin telemetry. |

### 7.1 Gemini Real-Time Voice & Text Chat AI Agent Tools

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
When a candidate product has stock `<= 5` (or merchant threshold) AND `business.agentConfig.mentionLowStockUrgency === true`:
- Tool payload sets `isLowStock: true`.
- Tool payload returns `urgencyHint: "Only {N} left in stock - mention to customer to encourage quick purchase"`.
- AI voice agent organically weaves scarcity urgency into voice response.

---

## 8. Phase 6: Payment Billing & Invoicing Engine (`/api/v1/billing`, `/api/v1/invoices`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/billing/plans` | `GET` | Public | All | Retrieve tier definitions (Free, Growth, Scale) with pricing, voice minute caps, product limits, and features. |
| `/api/v1/billing/subscription` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch current merchant subscription, usage counters (voice minutes used/cap, products count/limit), and renewal dates. |
| `/api/v1/billing/subscribe` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | User, Owner, Admin | Initiate subscription checkout via Stripe (USD checkout session URL) or bKash (BDT tokenized agreement create URL). |
| `/api/v1/billing/bkash/execute-agreement` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | User, Owner, Admin | Finalize bKash Tokenized Checkout agreement execution after customer OTP confirmation. |
| `/api/v1/billing/process-renewals` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Trigger bKash renewal processor (`billing:bkash-renewal`). |
| `/api/v1/billing/cancel` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner | Cancel auto-renewing subscription at end of current billing period. |
| `/api/v1/billing/webhooks/stripe` | `POST` | Public (Stripe Signature) | N/A | Stripe webhook listener (`customer.subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`). |
| `/api/v1/invoices` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | List historical tenant invoices with pagination, billing provider, amount, and payment status. |
| `/api/v1/invoices/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Fetch single invoice details. |
| `/api/v1/invoices/:id/pdf` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Download printable HTML/PDF invoice receipt. |
| `/api/v1/invoices/:id/resend` | `POST` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin | Re-send invoice receipt to merchant owner email. |

---

## 9. Phase 7: Store Performance & Overview Analytics (`/api/v1/dashboard`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/dashboard/stats` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Global overview KPIs aggregating revenue, orders, voice minutes, and agent performance. |
| `/api/v1/dashboard/revenue-analytics` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Time-series revenue chart data comparing ORA Agent GMV vs direct store GMV. |
| `/api/v1/dashboard/funnel-analytics` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Conversion funnel metrics (Sessions → Product Views → Cart Adds → Completed Orders). |

### 9.1 Overview Response Envelope Example (`GET /api/v1/dashboard/stats`)
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalRevenue": 45280.50,
      "revenueChange": 14.2,
      "oraSalesPercentage": 68.5,
      "oraOrdersCount": 342,
      "totalOrdersCount": 498,
      "ordersChange": 8.7,
      "voiceConversationsCount": 1250,
      "voiceConversationsChange": 23.4,
      "totalVoiceMinutes": 2890,
      "voiceMinutesLimit": 5000,
      "avgCallDurationSeconds": 138,
      "avgCallDurationChange": -4.2,
      "conversionRate": 27.36,
      "conversionRateChange": 3.1
    },
    "planUsage": {
      "tier": "growth",
      "voiceMinutesUsed": 2890,
      "voiceMinutesLimit": 5000,
      "voiceMinutesPercent": 57.8,
      "productsCount": 842,
      "productsLimit": 2500,
      "productsPercent": 33.68
    },
    "topProducts": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "title": "Air Zoom Alpha",
        "price": 149.99,
        "unitsSoldByAgent": 86,
        "revenueGenerated": 12899.14
      }
    ],
    "channelBreakdown": {
      "voiceSales": 31017.14,
      "textSales": 14263.36,
      "voicePercentage": 68.5,
      "textPercentage": 31.5
    }
  }
}
```

---

## 10. Phase 8: Real-Time Live Desk & Telemetry Command Center (`/api/v1/live-desk`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/live-desk/stats` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Live active sessions, concurrency gauge, today's sales, and conversion rate. |
| `/api/v1/live-desk/activity-feed` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Real-time stream of shopper intent transitions (`DISCOVERY`, `RECOMMENDATION`, `CART_UPDATE`, `CHECKOUT`, `SUPPORT`). |
| `/api/v1/live-desk/voice-sessions` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Currently active live voice calls with duration, current intent state, and shopper details. |
| `/api/v1/live-desk/sales-conversions` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Recent closed deals directly attributed to AI voice/text agents. |
| `/api/v1/live-desk/system-health` | `GET` | `JwtAuthGuard`, `TenantScopeGuard`, `RolesGuard` | Owner, Admin, Staff | Microservice telemetry (Voice stream engine, chat gateway, RAG index, and auto-sync). |

### 10.1 Intent State Classification Taxonomy (`stateType`)
The live desk classifies customer intent transitions in real-time:
- **`DISCOVERY`**: Shopper browsing, inquiring about categories, or asking general catalog questions.
- **`RECOMMENDATION`**: AI agent comparing items, offering suggestions, and pitching product options.
- **`CART_UPDATE`**: Shopper adding, modifying, or removing items from active cart.
- **`CHECKOUT`**: High-intent shopper initiating order placement or proceeding to payment.
- **`SUPPORT`**: Customer inquiring about store policies, shipping rates, or returns.

---

## 11. SuperAdmin Platform Command Center & Moderation (`/api/v1/admin`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/v1/admin/stats` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Platform Command Overview**: Global telemetry aggregating platform MRR/ARR, plan distribution, active/suspended merchant stores, AI voice minutes, total GMV, 7D/30D activity time-series, and infrastructure health. |
| `/api/v1/admin/businesses` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Merchants Directory & Key Telemetry**: Paginated tenant list with query filters (`page`, `limit`, `search`, `status`), enriched with owner details, key status, detected origins, and anomaly flags (`isMultiSite`, `hasMismatch`). |
| `/api/v1/admin/businesses/:id` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Merchant Tenant Inspection**: Detailed drilldown of single store tenant (profile, key telemetry, subscription state, product count, total orders, recent activity). |
| `/api/v1/admin/businesses/:id/status` | `PATCH` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Tenant Lifecycle Control**: Update store operational status (`active`, `suspended`, `pending`). Suspended stores immediately halt AI widget sessions. |
| `/api/v1/admin/businesses/:id/publishable-key` | `DELETE` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **SuperAdmin Key Revocation**: Permanently destroys and invalidates a merchant's publishable key, severing all live voice/chat widget sessions. |
| `/api/v1/admin/businesses/:id/key-status` | `PATCH` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Key Suspension / Reactivation**: Toggles key operational status between `'active'` and `'suspended'`. Suspended keys reject all connection handshakes. |
| `/api/v1/admin/users` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Global Users & Subscribers Registry**: Cross-tenant user directory enriched with subscriber metadata (`planId`, `planName`, `billingProvider`, `isSubscriber`), executive KPI statistics, and multi-facet filters (`search`, `role`, `plan`, `status`, `billingProvider`). |
| `/api/v1/admin/users/:id` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **User & Store Drilldown**: Comprehensive inspection of single user identity, attached merchant tenant, subscription status, AI store metrics, and recent conversation logs. |
| `/api/v1/admin/users` | `POST` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Provision Platform User**: Direct creation of platform SuperAdmin operators or merchant store staff accounts. |
| `/api/v1/admin/users/:id` | `PATCH` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **User Profile Management**: Update user name, email, role (`super_admin`, `owner`, `admin`, `staff`), and verification status. |
| `/api/v1/admin/users/:id/action` | `POST` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Account Action Dispatcher**: Administrative actions (`suspend`, `activate`, `resend_otp`, `revoke_sessions`, `delete`). |
| `/api/v1/admin/voice-sessions` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **AI Voice Telemetry & Monitor**: Live and recent real-time Gemini voice conversation sessions across all stores with turn counts, duration, caller identifier, and status. |
| `/api/v1/admin/system/health` | `GET` | `JwtAuthGuard`, `RolesGuard` | SuperAdmin | **Infrastructure Diagnostics**: Real-time health pulse of Node process runtime, memory heap/RSS allocations, MongoDB connection pool, and Redis latency. |

### 11.1 SuperAdmin Role Enforcement & Actor Security
All `/api/v1/admin/*` endpoints strictly require:
1. `JwtAuthGuard` validating an active, non-expired AdminUser session.
2. `RolesGuard` enforcing `@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)`. Any unauthorized access returns `403 Forbidden` (`FORBIDDEN_RESOURCE`).
3. Cross-Tenant Aggregation: Unlike merchant endpoints, `/api/v1/admin/*` operates without `TenantScopeGuard`, querying cross-business platform telemetry while strictly excluding internal system tenants (`name: { $ne: 'ORA Platform' }`).

### 11.2 Merchants Directory with Key Telemetry (`GET /api/v1/admin/businesses`)
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
        "keyStatus": "active",
        "detectedOrigins": [
          {
            "origin": "https://apexfootwear.com",
            "domain": "apexfootwear.com",
            "lastSeen": "2026-08-17T19:50:00.000Z",
            "sessionCount": 420,
            "isMismatch": false
          }
        ],
        "anomalyFlags": {
          "isMultiSite": false,
          "hasMismatch": false,
          "activeOriginsCount": 1
        },
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

### 11.3 Revoke Publishable Key (`DELETE /api/v1/admin/businesses/:id/publishable-key`)
- **Path Parameter**: `id` — Target business MongoDB ObjectId.
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Publishable key for \"Apex Footwear Store\" has been revoked and invalidated.",
    "businessId": "60d5ec49f1b2c8b1f8e4e1a1",
    "keyStatus": "revoked"
  }
}
```

### 11.4 Update Key Status (`PATCH /api/v1/admin/businesses/:id/key-status`)
- **Path Parameter**: `id` — Target business MongoDB ObjectId.
- **Request Body DTO**:
```json
{
  "keyStatus": "suspended" // "active" | "suspended"
}
```
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Publishable key status for \"Apex Footwear Store\" updated to suspended.",
    "businessId": "60d5ec49f1b2c8b1f8e4e1a1",
    "keyStatus": "suspended"
  }
}
```

### 11.5 Account Action Dispatcher (`POST /api/v1/admin/users/:id/action`)
- **Path Parameter**: `id` — Target user MongoDB ObjectId.
- **Request Body DTO**:
```json
{
  "action": "resend_otp" // "suspend" | "activate" | "resend_otp" | "revoke_sessions" | "delete"
}
```
- **Response Payload Envelope**:
```json
{
  "success": true,
  "data": {
    "message": "Verification OTP sent to sarah@apexfootwear.com."
  }
}
```
