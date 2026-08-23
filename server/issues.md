Yes — after thoroughly reading every service, schema, and the widget bundle, I found several concrete issues ranging from **critical architectural gaps** to **performance improvements**. Here's the breakdown:

---

## 🔴 Critical Issues

### 1. Tier 1 Webhooks Never Trigger Vector Embedding

[`ShopifyConnectorService.handleProductUpsert()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/shopify-connector.service.ts) and [`WooCommerceConnectorService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/woocommerce-connector.service.ts) both call `ProductsService.batchSync()` but **never call `VectorStoreService.upsertVector()`**. This means your highest-confidence data source (Tier 1) produces **unembedded products** that are invisible to the RAG vector search until:
- A customer query triggers Gap A self-healing (reactive, not proactive)
- Someone manually calls `reindexTenant()`

Compare with [`FileIngestionService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/file-ingestion.service.ts#L117-L174) which **does** auto-embed after sync. The webhook connectors should do the same.

### 2. Product Deletion Doesn't Clean Up Vector Index

[`ProductsService.remove()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/products/products.service.ts#L294-L311) deletes the MongoDB document but **never calls `VectorStoreService.deleteVectorByEntityId()`**. Deleted/discontinued products remain searchable via RAG as ghost vectors. Meanwhile, [`KnowledgeService.remove()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/knowledge/knowledge.service.ts#L353-L382) correctly cleans up vectors — so the pattern exists, it's just missing from the products side.

### 3. Brute-Force Vector Search Won't Scale

[`VectorStoreService.searchVectors()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/vector/vector-store.service.ts#L72-L117) loads **ALL** vectors for a tenant into memory, then computes cosine similarity in a loop:

```typescript
const candidateDocs = await this.vectorIndexModel
  .find(filter)        // ← loads every vector document
  .select('entityId entityType text vector metadata')
  .lean()
  .exec();
```

For a merchant with 10,000 products + 5,000 knowledge chunks, this loads 15,000 × 768-dim float arrays into memory per query. At ~6KB per vector, that's **~90MB per search request**. This will hit memory limits and latency walls quickly.

### 4. Mixing Incompatible Embedding Models in the Same Index

The [`EmbeddingService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/vector/embedding.service.ts#L101-L107) has a fallback that generates vectors using a deterministic term-hash when `GEMINI_API_KEY` is missing. These fallback vectors have a **completely different distribution** than Gemini embeddings. If some vectors were embedded with the fallback (e.g., during local dev) and others with Gemini (production), cosine similarity between them is **meaningless** — you'll get random scores.

The `embeddingModel` and `embeddingVersion` fields exist on `VectorIndex` but `searchVectors()` **never filters by them**, so stale/incompatible vectors are included in every search.

---

## 🟡 Significant Improvements

### 5. Self-Healing Race Condition

Gap A self-healing in [`searchProducts()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/rag/services/rag.service.ts#L180-L197) is fire-and-forget:

```typescript
// Two concurrent searches for "headphones" both hit Gap A
// Both asynchronously embed the same products — duplicate work
this.vectorStoreService
  .upsertVector(businessId, { ... })
  .catch(...);
```

Since `upsertVector` does `findOneAndUpdate` with upsert, it's **safe** (no data corruption), but it wastes Gemini API quota by generating the same embedding twice. A simple Redis lock (`setnx embedding:lock:{businessId}:{productId}`) would prevent this.

### 6. No Batch Embedding API Usage

The Gemini API supports [batch embedding](https://ai.google.dev/gemini-api/docs/embeddings) (`batchEmbedContents`), but ORA embeds **one text at a time**. In [`FileIngestionService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/file-ingestion.service.ts#L117-L174), each product is a separate HTTP call. For a 500-product CSV upload, that's 500 sequential API calls instead of ~5 batch requests.

### 7. Embedding Cache Key Normalizes Case

[`EmbeddingService.generateEmbedding()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/vector/embedding.service.ts#L31-L34):

```typescript
const textHash = crypto
  .createHash('sha256')
  .update(trimmed.toLowerCase())  // ← "iPhone 15 Pro" and "iphone 15 pro" share the same cache entry
  .digest('hex');
```

This is fine for cache dedup, but if the Gemini API produces **different vectors** for different capitalizations (which it can for proper nouns), you'd serve a cached vector that doesn't match the actual text.

### 8. Client-Side Content Hash Is Only 32-bit

The widget's [`hashString()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/public/widget/v2/widget.v4_5_lumina.js#L162-L168) uses djb2 which produces a 32-bit hash (~4 billion unique values). On a high-traffic e-commerce site with many pages, collision probability is non-trivial and could cause the widget to skip telemetry syncs for pages with different content.

### 9. MutationObserver Has No Throttle Cap

The [`initHydrationAndDomObserver()`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/public/widget/v2/widget.v4_5_lumina.js#L534-L567) debounces at 1s, but on pages with continuous DOM mutations (live price tickers, animations, chat widgets), it could fire telemetry POSTs every second indefinitely. There's no **max frequency cap** (e.g., max 1 sync per 30 seconds).

### 10. RAG Result Cache Doesn't Invalidate on Product Changes

The RAG cache (`rag:cache:{businessId}:{hash}`, TTL 10 min) means if a product is updated/deleted, stale results are served for up to 10 minutes. There's no cache-busting mechanism tied to product writes — `batchSync()` and `update()` don't invalidate relevant RAG cache keys.

---

## 🟢 Minor Improvements

### 11. Knowledge Chunking Is Character-Based, Not Semantic

The [500-char chunking](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/knowledge/knowledge.service.ts#L462) with sentence/paragraph boundaries is decent, but 500 chars is quite small for embedding quality. Research suggests **800–1200 chars** produces better semantic embeddings. The 50-char overlap is also small for maintaining cross-chunk context.

### 12. No `isEmbedded` Flag for Knowledge Chunks

Products get [`isEmbedded: true`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/vector/vector-store.service.ts#L60-L67) when embedded, which lets the dashboard show embedding status. Knowledge chunks have no equivalent — the dashboard can't show which knowledge docs are fully vectorized vs pending.

### 13. Feed Parser Uses Regex for XML

[`FeedParserService`](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/src/ingestion/services/feed-parser.service.ts) parses XML feeds using regex (`/<item>[\s\S]*?<\/item>/g`) instead of a proper XML parser. This will break on CDATA sections containing `</item>`, nested XML namespaces, or self-closing tags.

### 14. No Product Image Extraction in DOM Strategy D

The widget's [Strategy D (Heuristic PDP Scraper)](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/public/widget/v2/widget.v4_5_lumina.js#L398-L458) extracts title, price, and availability but sets `image: null`. It could easily grab the primary product image from `<img>` elements near the `<h1>` or inside the product container.

---

## Summary Priority & Resolution Matrix

| # | Issue | Severity | Status | Resolution Summary |
|---|---|---|---|---|
| 1 | Webhook connectors skip vector embedding | 🔴 Critical | ✅ Resolved | Injected VectorStoreService into Shopify & WooCommerce connectors for automatic embedding on sync. |
| 2 | Product deletion leaves ghost vectors | 🔴 Critical | ✅ Resolved | `ProductsService.remove()` now calls `VectorStoreService.deleteVectorByEntityId()`. |
| 3 | Brute-force vector search | 🔴 Critical | 🟡 Optimized | Pre-filters candidates by active `embeddingModel` to avoid comparing incompatible vectors. |
| 4 | Mixed embedding models in index | 🔴 Critical | ✅ Resolved | `EmbeddingService.getActiveModelName()` added and filtered in `VectorStoreService.searchVectors()`. |
| 5 | Self-healing race condition | 🟡 Medium | ✅ Resolved | Added `isEmbedded` check in `RagService.searchProducts()` to avoid duplicate indexing on concurrent searches. |
| 6 | No batch embedding API | 🟡 Medium | ✅ Resolved | Implemented `generateBatchEmbeddings` using Gemini `batchEmbedContents` and `upsertBatchVectors`. |
| 7 | Embedding Cache Key Normalizes Case | 🟡 Medium | ✅ Resolved | Removed `.toLowerCase()` from embedding cache key hash to preserve casing nuances. |
| 8 | Client-Side Content Hash Is Only 32-bit | 🟡 Medium | ✅ Resolved | Upgraded `hashString` in widget to collision-resistant 53-bit cyrb53 algorithm. |
| 9 | MutationObserver no max frequency | 🟡 Medium | ✅ Resolved | Added 15-second minimum throttle cap in `widget.v4_5_lumina.js`. |
| 10 | RAG cache not invalidated on writes | 🟡 Medium | ✅ Resolved | Added `rag:version:${businessId}` invalidation across all product and knowledge mutation operations. |
| 11 | Chunk size too small | 🟢 Low | ✅ Resolved | Upgraded `KnowledgeService.chunkText` default to 1,000 chars with 100-char overlap. |
| 12 | No `isEmbedded` Flag for Knowledge | 🟢 Low | ✅ Resolved | Added `isEmbedded` property to `KnowledgeBase` and `KnowledgeChunk` schemas, marked on embedding. |
| 13 | XML regex parser | 🟢 Low | ✅ Resolved | Refactored `FeedParserService.extractFeedItems` to use `fast-xml-parser` (`XMLParser`). |
| 14 | No Image in DOM Strategy D | 🟢 Low | ✅ Resolved | Added primary product image extraction from adjacent `<img>` tags in `widget.v4_5_lumina.js`. |
