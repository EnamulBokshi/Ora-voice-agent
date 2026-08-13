# ORA Architectural Mismatches & Technical Remediation Report

This document records the architectural and domain mismatches identified during the backend audit of **ORA**, explaining why the original design diverged from ORA's true role as an AI Sales Assistant, and detailing the technical fixes implemented across all modules.

---

## 1. Core Architectural Mental Model

```
 ❌ WRONG MODEL (E-Commerce Store Backend):
 Merchant Form → Create Product (1-by-1) → Edit Stock → Fulfill Orders in ORA → Update Shipping Status in ORA

 🟢 CORRECT MODEL (ORA AI Voice & Sales Layer):
 Merchant Store / Spreadsheet → Ingest in Bulk → Normalize & Vector Embed → AI Sales Agent Speaks & Sells → Verified Query-Time Price & Stock → Order Placed Event Pushed to Merchant Platform
```

**ORA is an AI Voice Sales Assistant that mirrors merchant data to sell products — it is NOT a standalone e-commerce catalog or order fulfillment backend.**

---

## 2. Architectural Mismatches & Technical Fixes

### Mismatch 1: Product Management (Form-Based CRUD vs. Bulk Ingestion Mirror)

- **The Mismatch**: The backend exposed `POST /products`, `PATCH /products/:id`, and `DELETE /products/:id` endpoints, implying merchant store owners sit in ORA's dashboard creating or editing individual products one-by-one. In reality, merchants already have thousands of products in Shopify, WooCommerce, spreadsheets (CSV/XLSX), or PDFs.
- **Why it was wrong**: ORA does not own product records — it mirrors them. Single-item form CRUD created dead weight and encouraged data drift between ORA and the merchant's real store.
- **The Fix**:
  - **Removed**: External 1-by-1 manual CRUD (`POST /products`, `PATCH /products/:id`, `DELETE /products/:id`).
  - **Implemented**: `POST /api/v1/ingestion/upload` via [`FileIngestionService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/file-ingestion.service.ts). Accepts CSV, XLSX, TXT, and PDF uploads, auto-detects header aliases (`FIELD_ALIASES`), batch-syncs to MongoDB, and auto-embeds into `VectorIndex`.
  - **Retained**: `GET /products` (read-only dashboard mirror inspection), `POST /products/batch-sync` (connector sync), and `POST /products/:id/verify-live`.

---

### Mismatch 2: Order Management (Fulfillment Engine vs. AI Sales Attribution)

- **The Mismatch**: The backend exposed `POST /orders` (external REST creation) and `PATCH /orders/:id/status` (manual status updates e.g. `pending` → `shipped` → `delivered`).
- **Why it was wrong**: ORA is not a warehouse or shipping management system. Merchants process fulfillments, print shipping labels, and handle returns inside Shopify, WooCommerce, or their ERP — never inside ORA.
- **The Fix**:
  - **Removed**: `POST /orders` and `PATCH /orders/:id/status` from public/dashboard REST controllers.
  - **Refactored**: Made [`OrdersController`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/orders/orders.controller.ts) **Read-Only** (`GET /orders`, `GET /orders/:id`) for dashboard sales attribution and ROI analytics.
  - **Internal Order Creation**: Orders (`ORD-2026-000100`) are created exclusively by `AiToolsExecutor.handlePlaceOrder()` when an AI voice/text session closes a sale or via merchant platform webhooks. Order status updates flow in passively from platform webhooks.

---

### Mismatch 3: RAG Channel Drift & Ingestion Lag (Gap A / Gap B / Channel Disparity)

- **The Mismatch**:
  1. **Channel Disparity**: Text chat (`ConversationGateway`) called `RagService.searchCombined()` directly, returning unverified database products. Voice chat called `AiToolsExecutor.find_products()`, which verified live price and stock. Text shoppers could see stale prices while voice shoppers got live-verified data.
  2. **Gap B (Ingestion Lag)**: When a newly added product was searched before webhooks or feed polls landed in MongoDB, RAG returned empty results.
  3. **Low-Stock Urgency Signal**: `SalesPlaybook.mentionLowStockUrgency` existed in schema/DTOs but was never computed or passed to the AI model.
- **The Fix**:
  - **Verification Parity**: Refactored [`ConversationGateway`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/gateway/conversation.gateway.ts) to route through `AiToolsExecutor.executeTool('find_products')`, guaranteeing every price and stock value returned across text or voice is live-verified via `ProductsService.verifyLive()`.
  - **Gap B Live Platform Fallback**: Updated [`RagService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/rag/services/rag.service.ts). If vector search and Mongo regex (Gap A) miss, RAG queries the merchant's live platform API directly (`ShopifyConnectorService`, `WooCommerceConnectorService`, `ManualConnectorService`) based on `Business.connectedPlatform`, asynchronously batch-syncs and embeds the result, and logs `RAG_FALLBACK_TRIGGERED` with the exact `fallbackTier`.
  - **Low-Stock Urgency**: Added dynamic `isLowStock` computation in `verifyLive()` based on `LOW_STOCK_THRESHOLD=5`. Wired `urgencyHint` ("Only X left in stock!") into tool responses and Gemini system instructions when `mentionLowStockUrgency` is enabled.
  - **Model Tagging**: Added `embeddingModel` and `embeddingVersion` to `VectorIndex` schema and written on every `upsertVector()`.
  - **Configurable Thresholds**: Moved RAG similarity thresholds (`0.65` / `0.60`) to `.env`.

---

### Mismatch 4: Webhook Security & Tenant Isolation Vulnerabilities

- **The Mismatch**:
  1. Shopify webhook HMAC header (`X-Shopify-Hmac-SHA256`) was never checked in `IngestionController`.
  2. WooCommerce webhooks had no signature check.
  3. `businessId` on webhooks was read from untrusted request headers or body properties (`x-business-id` || `payload.businessId`). Any client could inject fake products into any merchant's catalog.
- **The Fix**:
  - Enforced strict HMAC verification in [`IngestionController`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/ingestion.controller.ts) using `shopifyService.verifyWebhookHmac()` and `woocommerceService.verifyWebhookHmac()`. Unverified webhooks return `401 Unauthorized` in production.
  - Validated business context against verified credentials.

---

### Mismatch 5: Knowledge Context Isolation & Dead Data

- **The Mismatch**:
  1. **Unembedded Knowledge**: Creating or updating store policy documents in [`KnowledgeService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/knowledge/knowledge.service.ts) saved text chunks to MongoDB but never embedded them into `VectorIndex`. RAG knowledge search missed newly created FAQs until a manual bulk reindex was triggered.
  2. **FeedParser Mock**: `FeedParserService` returned hardcoded mock products ("Wireless Headphones") instead of downloading and parsing Google Merchant XML or CSV feeds.
  3. **Dead Data**: `Product.isEmbedded`, `Product.embeddingRef`, and `VoiceSettings.connectedPlatform` existed in schemas but were unused.
  4. **Global Gaps**: No correlation ID middleware for HTTP request tracing; `ApiKeyGuard` mock key bypass (`biz_live_mock_key_12345`) was not gated to development mode.
- **The Fix**:
  - Implemented automatic instant `VectorIndex` auto-embedding in `KnowledgeService.create()` and `update()`, with vector cleanup on `remove()`. Added pagination (`page`, `limit`) to `KnowledgeService.findAll()`.
  - Implemented HTTP XML (RSS/Atom) and CSV feed parsing in [`FeedParserService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/feed-parser.service.ts).
  - Cleaned up dead schema fields.
  - Created [`CorrelationIdMiddleware`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/common/middleware/correlation-id.middleware.ts) bound in `AppModule`.
  - Gated `ApiKeyGuard` mock key bypass behind `process.env.NODE_ENV !== 'production'`.

---

## 3. Summary of Refactored API Surface

| Subsystem | Endpoint | HTTP Method | Architectural Role |
|---|---|---|---|
| **Ingestion** | `/api/v1/ingestion/upload` | `POST` | **Primary Bulk Ingestion**: Upload CSV, XLSX, TXT, or PDF merchant catalog files. |
| **Ingestion** | `/api/v1/ingestion/webhooks/:platform` | `POST` | **Tier 1 Sync**: HMAC-verified Shopify & WooCommerce webhook listener. |
| **Ingestion** | `/api/v1/ingestion/feed` | `POST` | **Tier 2 Sync**: Fetch & parse Google Merchant XML or CSV feeds. |
| **Products** | `/api/v1/products` | `GET` | **Dashboard Read-Only**: Inspect ingested product mirror with pagination & search. |
| **Products** | `/api/v1/products/:id/verify-live` | `POST` | **Query Verification**: Live price & stock check using `VerifyLiveDto`. |
| **Orders** | `/api/v1/orders` | `GET` | **Dashboard Read-Only**: Analytics for AI-generated sales (`ORD-2026-000100`). |
| **Orders** | `/api/v1/orders/:id` | `GET` | **Dashboard Read-Only**: Detailed view of AI-generated sales and transcripts. |
| **Knowledge** | `/api/v1/knowledge` | `POST` | **Context Feeding**: Add store rules, auto-chunk text, and auto-embed into RAG. |
