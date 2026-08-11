# ORA Monorepo Build State & Implementation Tracker

This document maintains the active progress tracking of implemented modules, domain models, APIs, and security baseline across the ORA monorepo backend and frontend.

---

## 🟢 Phase 1: Authentication & User Management (COMPLETED)

### Overview
Complete multi-tenant AdminUser authentication, merchant tenant provisioning (`Business`), RBAC role enforcement, Redis session management with token theft detection, and recipient-email OTP verification (v5 Architecture Section 10.10).

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Business Schema** | `server/src/users/schemas/business.schema.ts` | Completed | Multi-tenant profile, unique publishable key (`biz_live_xxxx`), status tracking. |
| **AdminUser Schema** | `server/src/users/schemas/admin-user.schema.ts` | Completed | Tenant-linked (`businessId`), password hash, role (`owner` \| `admin` \| `staff`), `emailVerified`, OTP hash & expiry fields. |
| **Users Service** | `server/src/users/users.service.ts` | Completed | Tenant creation with publishable key generation, AdminUser CRUD, email lookup, ID lookup. |
| **Auth Service** | `server/src/auth/auth.service.ts` | Completed | Signup, login, rotating refresh token with theft revocation, Redis session management, OTP generation & verification, profile querying. |
| **Auth Controller** | `server/src/auth/auth.controller.ts` | Completed | Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/verify-otp`, `/api/auth/resend-otp`. |
| **JWT Strategy & Guard** | `server/src/auth/strategies/jwt.strategy.ts`, `server/src/common/guards/jwt-auth.guard.ts` | Completed | Validates 15-minute Bearer JWT access tokens and checks Redis active session status. |
| **RBAC Roles Guard** | `server/src/common/guards/roles.guard.ts` | Completed | `@Roles(...)` metadata validator for `owner`, `admin`, and `staff` access control. |
| **Tenant Scope Guard** | `server/src/common/guards/tenant-scope.guard.ts` | Completed | Enforces tenant boundary (`businessId`) on protected routes. |
| **Response Interceptors & Exception Filters** | `server/src/common/interceptors/transform.interceptor.ts`, `server/src/common/filters/all-exceptions.filter.ts` | Completed | Standardized success `{ success: true, data }` and error `{ success: false, error: { code, message, correlationId } }` envelopes. |
| **Mail & OTP Engine** | `server/src/mail/mail.service.ts`, `server/src/mail/email-templates.ts` | Completed | EJS template engine (`verify-email.ejs`, `otp-code.ejs`) rendering styled responsive emails. |
| **Redis Session Layer** | `server/src/common/redis/redis.service.ts` | Completed | Manages `session:{sessionId}` in Redis with 7-day TTL and instant session revocation. |

---

## 🟢 Phase 2: Product Catalog & Context Feeding Service (COMPLETED)

### Overview
Implementation of the core e-commerce product catalog engine (`Product`) and context feeding knowledge base (`KnowledgeBase` & `KnowledgeChunk`). Supports multi-tenant catalog management, confidence scores, live-verification updates, batch sync, and automatic text chunking (~500 character snippets) for downstream RAG vector embeddings.

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **Product Schema** | `server/src/products/schemas/product.schema.ts` | Completed | Multi-tenant schema with `nativeProductId`, price, currency, availability status, stock, images, attributes, source tier, confidence score, and recommendation metrics. |
| **Products Service** | `server/src/products/products.service.ts` | Completed | Catalog CRUD, pagination, text/regex search, category filter, batch sync (`bulkWrite`), live-verification update (`verifyLive`), and agent recommendation metrics. |
| **Products Controller** | `server/src/products/products.controller.ts` | Completed | Endpoints: `/api/products` (POST, GET), `/api/products/:id` (GET, PATCH, DELETE), `/api/products/batch-sync` (POST), `/api/products/:id/verify-live` (POST). |
| **KnowledgeBase Schema** | `server/src/knowledge/schemas/knowledge-base.schema.ts` | Completed | Stores merchant policies, brand rules, FAQs, sales playbooks, product manuals, and uploaded docs. |
| **KnowledgeChunk Schema** | `server/src/knowledge/schemas/knowledge-chunk.schema.ts` | Completed | Stores chunked text snippets indexed by `businessId` and `knowledgeBaseId` for vector search indexing. |
| **Knowledge Service** | `server/src/knowledge/knowledge.service.ts` | Completed | Context document CRUD, automatic text chunking engine (~500 chars, 50-char overlap), chunk retrieval, and cascade deletion. |
| **Knowledge Controller** | `server/src/knowledge/knowledge.controller.ts` | Completed | Endpoints: `/api/knowledge` (POST, GET), `/api/knowledge/:id` (GET, PATCH, DELETE), `/api/knowledge/:id/chunks` (GET). |

---

## 🟢 Phase 3: RAG & Vector Store Pipeline (COMPLETED)

### Overview
Implementation of tenant-isolated vector search, embedding generation, RAG prompt augmentation, candidate capping (top 5), zero/low-confidence live keyword fallback, self-healing embedding enqueueing, and bulk re-indexing for merchant catalogs.

### Implemented Components

| Component / Layer | Location | Status | Details |
|---|---|---|---|
| **VectorIndex Schema** | `server/src/rag/schemas/vector-index.schema.ts` | Completed | Persistent vector storage carrying `businessId`, `entityType` (`product` \| `knowledge_chunk`), `entityId`, vector array, and metadata. |
| **Embedding Service** | `server/src/rag/services/embedding.service.ts` | Completed | Generates 768-dimensional text embeddings via Gemini API (`text-embedding-004`) with normalized TF-IDF vectorizer fallback. |
| **Vector Store Service** | `server/src/rag/services/vector-store.service.ts` | Completed | Tenant-isolated vector indexing, cosine similarity scoring, entity upserts, and deletion routines. |
| **RAG Service** | `server/src/rag/services/rag.service.ts` | Completed | Semantic search for products & knowledge chunks. Enforces candidate cap (top 5), triggers live keyword fallback on zero/low-confidence matches, enqueues self-healing embeddings, and handles tenant re-indexing. |
| **RAG Controller** | `server/src/rag/rag.controller.ts` | Completed | Endpoints: `/api/rag/search-products`, `/api/rag/search-knowledge`, `/api/rag/search`, `/api/rag/reindex-tenant`. |

### Unit Testing & Compilation Verification
- **Build Status**: Passed (`nest build`)
- **Unit Test Suites**: 9 passed (14 tests) (`auth.service.spec.ts`, `auth.controller.spec.ts`, `users.service.spec.ts`, `users.controller.spec.ts`, `products.service.spec.ts`, `knowledge.service.spec.ts`, `embedding.service.spec.ts`, `rag.service.spec.ts`, `app.controller.spec.ts`).

---

## 🟡 Next Planned Phases

- [ ] **Phase 4: Customer & Voice/Chat Conversation Gateway** (`server/src/gateway`, `server/src/conversations`)
- [ ] **Phase 5: Dual Payment Billing & Invoicing Engine** (`server/src/billing`, `server/src/invoices`)
- [ ] **Phase 6: Admin Dashboard UI Integration** (`client/`)
