# ORA Monorepo Build State & Implementation Tracker (v1 Aligned)

This document maintains the active progress tracking of implemented modules, domain models, APIs, and security baseline across the ORA monorepo backend and frontend. All REST API endpoints are globally versioned at `/api/v1`.

---

## 🟢 Phase 1: Authentication & User Management (COMPLETED)

### Overview
Complete multi-tenant AdminUser authentication, merchant tenant provisioning (`Business`), RBAC role enforcement, Redis session management with token theft detection, configurable JWT access token TTL (`JWT_EXPIRATION`), and recipient-email OTP verification (v5 Architecture Section 10.10).

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Business Schema** | `server/src/users/schemas/business.schema.ts` | Completed | Multi-tenant profile, unique publishable key (`biz_live_xxxx`), status tracking. |
| **AdminUser Schema** | `server/src/users/schemas/admin-user.schema.ts` | Completed | Tenant-linked (`businessId`), password hash, role (`owner` \| `admin` \| `staff`), `emailVerified`, OTP hash & expiry fields. |
| **Users Service** | `server/src/users/users.service.ts` | Completed | Tenant creation with publishable key generation, AdminUser CRUD, email lookup, ID lookup. |
| **Auth Service** | `server/src/auth/auth.service.ts` | Completed | Signup, login, rotating refresh token with theft revocation, Redis session management, OTP generation & verification, profile querying. |
| **Auth Controller** | `server/src/auth/auth.controller.ts` | Completed | Endpoints: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/verify-otp`, `/api/v1/auth/resend-otp`. |
| **JWT Strategy & Guard** | `server/src/auth/strategies/jwt.strategy.ts`, `server/src/common/guards/jwt-auth.guard.ts` | Completed | Validates Bearer JWT access tokens (configurable via `JWT_EXPIRATION`, default `15m`) and checks Redis active session status. |
| **RBAC Roles Guard** | `server/src/common/guards/roles.guard.ts` | Completed | `@Roles(...)` metadata validator for `owner`, `admin`, and `staff` access control. |
| **Tenant Scope Guard** | `server/src/common/guards/tenant-scope.guard.ts` | Completed | Enforces tenant boundary (`businessId`) on protected routes. |
| **ApiKey Guard** | `server/src/common/guards/api-key.guard.ts` | Completed | Validates publishable widget keys (`biz_live_xxxx`) and resolves tenant context for widget endpoints. |
| **Response Interceptors & Exception Filters** | `server/src/common/interceptors/transform.interceptor.ts`, `server/src/common/filters/all-exceptions.filter.ts` | Completed | Standardized success `{ success: true, data }` and error `{ success: false, error: { code, message, correlationId } }` envelopes. |
| **Mail & OTP Engine** | `server/src/mail/mail.service.ts`, `server/src/mail/email-templates.ts` | Completed | Resend API integration with fallback SMTP, rendering EJS template emails (`verify-email.ejs`, `otp-code.ejs`). |
| **Redis Session Layer** | `server/src/common/redis/redis.service.ts` | Completed | Manages `session:{sessionId}` in Redis with 7-day TTL and instant session revocation. |

---

## 🟢 Phase 2: Product Catalog & Tiered Data Ingestion Engine (COMPLETED)

### Overview
Implementation of the multi-tenant e-commerce product catalog (`Product`), context feeding knowledge base (`KnowledgeBase` & `KnowledgeChunk`), and 4-tier merchant data ingestion strategy. Supports confidence scoring, platform webhooks, Google Merchant/Meta catalog feed parsing, passive storefront capture, custom endpoint field mapping, and automatic text chunking (~500 character snippets) for vector search.

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Product Schema** | `server/src/products/schemas/product.schema.ts` | Completed | Multi-tenant schema with `nativeProductId`, price, currency, availability status, stockQuantity, images, attributes, source tier (`TIER1_CONNECTOR`, `TIER2_FEED`, `TIER3_PASSIVE`, `TIER4_MANUAL`), confidence score, and recommendation metrics. |
| **Products Service & Controller** | `server/src/products/products.service.ts`, `server/src/products/products.controller.ts` | Completed | Catalog CRUD, pagination, search, category filter, batch sync (`BatchSyncProductsDto`), live-verification update (`verifyLive`), and recommendation metrics. |
| **Shopify Connector** | `server/src/ingestion/services/shopify-connector.service.ts` | Completed | **Tier 1**: OAuth webhook handler (`POST /api/v1/ingestion/webhooks/shopify`) with HMAC verification (`X-Shopify-Hmac-SHA256`) and Redis idempotency deduplication (`webhook:shopify:{id}`). |
| **WooCommerce Connector** | `server/src/ingestion/services/woocommerce-connector.service.ts` | Completed | **Tier 1**: REST catalog ingestion (`SourceTier.TIER1_CONNECTOR`, `confidenceScore: 1.0`). |
| **Feed Parser** | `server/src/ingestion/services/feed-parser.service.ts` | Completed | **Tier 2**: Google Merchant / Meta XML catalog feed parser (`SourceTier.TIER2_FEED`, `confidenceScore: 0.8`). |
| **Sitemap Crawler & Passive Capture** | `server/src/ingestion/services/sitemap-crawler.service.ts` | Completed | **Tier 3**: Sitemap XML diff-check crawler and storefront passive capture (`POST /api/v1/ingestion/passive`) with `ApiKeyGuard` (`SourceTier.TIER3_PASSIVE`, `confidenceScore: 0.5`). |
| **Manual Connector** | `server/src/ingestion/services/manual-connector.service.ts` | Completed | **Tier 4**: Custom payload endpoint with field mapping config (`POST /api/v1/ingestion/manual`) (`SourceTier.TIER4_MANUAL`, `confidenceScore: 0.2`). |
| **Ingestion Controller** | `server/src/ingestion/ingestion.controller.ts` | Completed | Endpoints: `/api/v1/ingestion/webhooks/:platform`, `/api/v1/ingestion/feed`, `/api/v1/ingestion/passive`, `/api/v1/ingestion/manual`. |
| **KnowledgeBase & Chunk Schemas** | `server/src/knowledge/schemas/knowledge-base.schema.ts`, `server/src/knowledge/schemas/knowledge-chunk.schema.ts` | Completed | Merchant policies, brand rules, FAQs, sales playbooks, product manuals, and ~500-char text chunking snippets. |
| **Knowledge Service & Controller** | `server/src/knowledge/knowledge.service.ts`, `server/src/knowledge/knowledge.controller.ts` | Completed | Context document CRUD, text chunking engine, chunk retrieval, and cascade deletion. Endpoints: `/api/v1/knowledge` (POST, GET), `/api/v1/knowledge/:id` (GET, PATCH, DELETE), `/api/v1/knowledge/:id/chunks` (GET). |

---

## 🟢 Phase 3: RAG & Vector Store Pipeline (COMPLETED)

### Overview
Implementation of tenant-isolated vector search, embedding generation, RAG prompt augmentation, candidate capping (top 5), zero/low-confidence fallback logging (`RAG_FALLBACK_TRIGGERED`), self-healing embedding enqueueing, and bulk re-indexing for merchant catalogs.

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **VectorIndex Schema** | `server/src/rag/schemas/vector-index.schema.ts` | Completed | Persistent vector storage carrying `businessId`, `entityType` (`product` \| `knowledge_chunk`), `entityId`, vector array, and metadata. |
| **Embedding Service** | `server/src/rag/services/embedding.service.ts` | Completed | Generates 768-dimensional text embeddings via Gemini API (`text-embedding-004`) with normalized TF-IDF vectorizer fallback. |
| **Vector Store Service** | `server/src/rag/services/vector-store.service.ts` | Completed | Tenant-isolated vector indexing, cosine similarity scoring, entity upserts, and deletion routines. |
| **RAG Service & Controller** | `server/src/rag/services/rag.service.ts`, `server/src/rag/rag.controller.ts` | Completed | Combined hybrid semantic search across products and store rules, candidate cap (top 5), low-confidence fallback logging to `EventsService`, self-healing embeddings, and tenant re-indexing. Endpoints: `/api/v1/rag/search-products`, `/api/v1/rag/search-knowledge`, `/api/v1/rag/search`, `/api/v1/rag/reindex-tenant`. |

---

## 🟢 Phase 4: Order Management & Domain Event Engine (COMPLETED)

### Overview
Implementation of customer order creation (`Order`), sequential human-readable order numbering (`ORD-2026-000100`), status tracking, and centralized asynchronous domain event logging (`Event`).

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Order Schema** | `server/src/orders/schemas/order.schema.ts` | Completed | Multi-tenant schema indexed by `businessId`, sequential `ORD-2026-000100` numbering, item array, total amount, shipping address, and status lifecycle (`pending`, `confirmed`, `shipped`, `delivered`, `canceled`). |
| **Orders Service & Controller** | `server/src/orders/orders.service.ts`, `server/src/orders/orders.controller.ts` | Completed | Order creation, pagination, details lookup, status update, and automatic `ORDER_PLACED` event logging. Endpoints: `/api/v1/orders` (POST, GET), `/api/v1/orders/:id` (GET), `/api/v1/orders/:id/status` (PATCH). |
| **Event Audit Engine** | `server/src/events/schemas/event.schema.ts`, `server/src/events/events.service.ts` | Completed | Domain event logger tracking audit events (`rag_fallback_triggered`, `product_recommended`, `order_placed`, `cart_updated`, `authority_escalation_flagged`). |

---

## 🟢 Phase 5: Customer, Agent Config & Gemini Real-Time Voice Gateway (COMPLETED)

### Overview
Implementation of end-shopper customer profiles (`Customer` with AES-256 field-level PII encryption), AI agent brand voice & sales playbooks (`AgentConfig`, `VoiceSettings`, `SalesPlaybook`), conversation logging (`Conversation`, `Message`), REST APIs, and a real-time WebSocket Gateway (`VoiceGateway` & `GeminiVoiceService`) supporting Gemini 2.0 Multimodal Live Bidi streaming audio and tool execution.

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Customer Service & Controller** | `server/src/customers/customers.service.ts`, `server/src/customers/customers.controller.ts` | Completed | End-shopper profile management, PII encryption/decryption (`emailEncrypted`, `phoneEncrypted`). Endpoints: `/api/v1/customers` (POST, GET), `/api/v1/customers/:id` (GET, PATCH). |
| **AgentConfig Controller** | `server/src/agent-config/agent-config.controller.ts` | Completed | Endpoints: `/api/v1/agent-config` (GET, PATCH). |
| **Conversations Service & Controller** | `server/src/conversations/conversations.service.ts`, `server/src/conversations/conversations.controller.ts` | Completed | Session resolution, transcript querying, Redis session state, and closing conversations. Endpoints: `/api/v1/conversations` (GET), `/api/v1/conversations/:id` (GET), `/api/v1/conversations/:id/close` (POST). |
| **Conversation Gateway** | `server/src/gateway/conversation.gateway.ts` | Completed | Socket.io namespace `/conversations` supporting `biz_live_xxxx` key auth, text messaging, and RAG catalog lookup. |
| **AI Tool Definitions & Executor** | `server/src/ai-voice/tools/ai-tools.definition.ts`, `server/src/ai-voice/tools/ai-tools.executor.ts` | Completed | Gemini tool declarations (`search_products`, `get_product_details`, `check_inventory`, `add_to_cart`, `get_store_policy`) and real-time execution engine querying RAG, MongoDB, and Redis cart (`cart:conv:{sessionId}`). |
| **Gemini Voice Service** | `server/src/ai-voice/gemini-voice.service.ts` | Completed | Manages bidirectional Bidi WebSocket sessions with Gemini 2.0 Multimodal Live API (`wss://generativelanguage.googleapis.com`), handling streaming audio PCM (16kHz in -> 24kHz out), prompt instructions, and tool responses. |
| **Voice Gateway** | `server/src/gateway/voice.gateway.ts` | Completed | Socket.io namespace `/voice` enabling live widget microphone audio streaming (`start-voice-session`, `audio-chunk`, `stop-voice-session`). |

---

## 🟢 Phase 6: Payment Billing & Invoicing Engine (COMPLETED)

### Overview
Implementation of the provider-abstracted subscription billing engine supporting dual payment providers (**Stripe USD** & **bKash BDT Tokenized Checkout**), active bKash tokenized agreement renewal processing, plan tier seeding (`Free`, `Growth`, `Scale`), append-only financial audit trails (`PaymentTransaction`, `Invoice`, `InvoiceDeliveryLog`), sequential human-readable invoice numbering (`ORA-2026-000123`) backed by atomic Mongoose counters (`$inc`), PDF rendering engine (`PdfGeneratorService`), and usage limit enforcement (`PlanLimitGuard` & `@Metered(...)`).

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Stripe Payment Provider** | `server/src/billing/providers/stripe.provider.ts` | Completed | Provider implementation for USD auto-renewing subscriptions and webhook listeners. |
| **bKash Tokenized Provider** | `server/src/billing/providers/bkash.provider.ts` | Completed | bKash Tokenized Checkout API v1.2.0-beta integration (grant token, create/execute agreement, tokenized payment execution, cancel agreement, renewal charge). |
| **bKash Renewal Scheduler** | `server/src/billing/billing.service.ts` | Completed | Active renewal runner (`processBkashRenewals()`) charging tokenized agreements at period end and updating status (`ACTIVE`/`PAST_DUE`). |
| **Plan & Subscription Schemas** | `server/src/billing/schemas/plan.schema.ts`, `server/src/billing/schemas/subscription.schema.ts` | Completed | Mongoose schemas for subscription plans and merchant subscriptions. |
| **Invoice Engine & PDF Generator** | `server/src/invoices/invoices.service.ts`, `server/src/invoices/services/pdf-generator.service.ts`, `server/src/invoices/invoices.controller.ts` | Completed | Invoice generation, sequential `ORA-2026-000123` counter, server-side HTML/PDF renderer (`PdfGeneratorService`), PDF endpoint (`/api/v1/invoices/:id/pdf`), and resending (`/api/v1/invoices/:id/resend`). |
| **PlanLimitGuard & Decorator** | `server/src/common/guards/plan-limit.guard.ts`, `server/src/common/decorators/metered.decorator.ts` | Completed | Metered decorator and guard checking Redis usage counters (`usage:{businessId}:{period}:{metric}`). Throws `PLAN_LIMIT_EXCEEDED` on breach. |
| **Billing Service & Controller** | `server/src/billing/billing.service.ts`, `server/src/billing/billing.controller.ts` | Completed | Endpoints: `/api/v1/billing/plans` (GET), `/api/v1/billing/subscription` (GET), `/api/v1/billing/subscribe` (POST), `/api/v1/billing/bkash/execute-agreement` (POST), `/api/v1/billing/process-renewals` (POST), `/api/v1/billing/cancel` (POST), `/api/v1/billing/webhooks/stripe` (POST). |

---

### Verification Summary
- **Build Status**: Passed (`pnpm --filter server build`)
- **Unit & Integration Test Suites**: **18 passed (24 tests total)**:
  - `auth.service.spec.ts`, `auth.controller.spec.ts`, `security-integration.spec.ts`
  - `users.service.spec.ts`, `users.controller.spec.ts`
  - `products.service.spec.ts`
  - `feed-parser.service.spec.ts`
  - `knowledge.service.spec.ts`
  - `embedding.service.spec.ts`, `rag.service.spec.ts`
  - `encryption.util.spec.ts`
  - `customers.service.spec.ts`
  - `orders.service.spec.ts`
  - `ai-tools.executor.spec.ts`
  - `bkash.provider.spec.ts`, `billing.service.spec.ts`, `invoices.service.spec.ts`
  - `app.controller.spec.ts`
