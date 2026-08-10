# ORA — Final Architecture (v2)

## 1. Overview

ORA is a multi-tenant, voice-first sales agent delivered as a single `<script>` embed. It behaves like a human salesperson: it knows the merchant's catalog, knows store policy, remembers what the customer already said, and can act — search, compare, add to cart, place an order — not just answer questions.

This version corrects three issues found in the prior draft: a missing fallback for products that exist but aren't embedded yet, a data-isolation model that contradicted the schema design, and a Shopify cart integration that wouldn't work as specified. All other production-hardening from the prior version is retained.

---

## 2. System Layers

### 2.1 Widget (Browser, on Merchant's Site)

Loaded via one `<script>` tag in the merchant's index file.

**Responsibilities:**
- Voice capture and playback
- Chat UI
- Passive DOM / JSON-LD read (current page only)
- WebSocket connection to Gateway
- Local cart/session cache (RTK)

**Out of scope:** The widget never calls merchant APIs directly. All catalog, inventory, and cart operations route through the ORA backend, which holds the tenant's credentials.

---

### 2.2 Gateway Layer

- Terminates WebSocket and HTTP connections
- Authenticates tenant (API key) and customer session
- Per-tenant rate limiting
- Routes audio streams to Core Voice Service; routes text/tool requests to Core Agent Service
- Handles connection termination and auth only — the voice pipeline (STT/TTS/LLM) runs in Core Compute, not at the edge

---

### 2.3 Core Services (NestJS)

**Conversation Service**
- Session state, idle-timeout logic, context continuity across reconnects
- Two idle concepts: **conversation idle** (10s of no customer intent → session suspended, context retained in Redis) vs. **voice channel idle** (WebRTC connection stays warm ~30s to avoid reconnect overhead)

**Agent / Tool Orchestration Service**
- Tool-calling loop: search, compare, cart, inventory, recommend/upsell, coupon lookup, place order, email, save customer data, support ticket, authority escalation
- **Conditional tool registration:** `place_order` is only exposed to the model when the tenant has a Tier 1 connector. Tier 2/3/4 tenants receive `redirect_to_checkout` instead.

**RAG Service**
- Embeds and retrieves product corpus + knowledge base
- **Tenant-isolated retrieval:** every query filtered by `businessId` before vector similarity runs — no cross-tenant retrieval possible
- **Fallback trigger:** if vector search returns zero candidates, or all candidates below the similarity confidence threshold, the query is handed to the live-fallback path (Section 3, step 2a) instead of returning "not found"

**Context Feeding Pipeline**
- Background ingestion workers (BullMQ), per-tenant queues
- Webhook ingestion with idempotency, signature verification, ordering, and dead-letter queue
- Async ingestion path for anything resolved via live fallback (Section 3), so the fast RAG path improves after every fallback hit — the catalog is self-healing rather than permanently dependent on someone noticing a gap

---

### 2.4 Data Layer

**MongoDB — shared collections, tenant-scoped, not per-tenant databases.**
Every collection (`Product`, `Order`, `Conversation`, `Event`, `KnowledgeBase`, etc.) carries an indexed `businessId` field, matching the schema design already built. Physically separate databases per tenant were considered and rejected: it doesn't improve tenant isolation over an indexed, application-enforced `businessId` filter, and it actively works against the "handle millions of users" requirement — provisioning and connection-pooling across many thousands of separate logical databases is an operational burden, not a scaling win. Revisit only if a specific enterprise contract requires physical data isolation as a compliance term.

**Redis**
- Session state and idle timers
- Job queues (BullMQ)
- Hot-path cache (product catalog data — not inventory, which must stay live)
- Rate-limit counters
- Cart state during active conversation

**Vector Store**
- Product + knowledge embeddings, `businessId` namespaced, filter enforced pre-query (see RAG Service above)
- Choice between MongoDB Atlas vector index and a dedicated store (Pinecone/Weaviate) remains an open decision — see Section 10

---

### 2.5 Merchant Data Sources (Tiered)

| Tier | Source | Auth | Data Freshness | Cart | Order | Confidence |
|---|---|---|---|---|---|---|
| **1** | Platform connector (Shopify, Woo, BigCommerce, Magento) | OAuth / App Password | Real-time webhooks | ✅ | ✅ | 1.0 |
| **2** | Product feed (Google Merchant Center, Meta catalog) | URL + optional auth | Hourly/daily poll | ❌ | ❌ | 0.7 |
| **3** | Passive capture (JSON-LD, OG tags, sitemap crawl) | None | Sitemap diff-check + weekly full crawl | ❌ | ❌ | 0.3 |
| **4** | Manual endpoint mapping | API key / bearer | Per-call | Configurable | Configurable | 0.5–1.0* |

*Tier 4 confidence depends on endpoint capability: 1.0 if it supports live ID lookup, 0.5 if keyword-only.

**Tier 3 cadence detail:** a full re-embed weekly is expensive and reintroduces a visibility gap for brand-new products. Supplement it with a cheap, frequent check of `sitemap.xml`'s `<lastmod>` values — this tells you which URLs are new since the last check, so a brand-new product can be flagged and embedded well before the next full crawl, without paying the cost of re-crawling everything on a tight schedule.

**Tier capability rules:**
- Tier 1: Full agent — search, live inventory, cart, checkout, voice, order placement
- Tier 2: Smart assistant — search, recommendations, Q&A, RAG, redirect to site for purchase
- Tier 3: Page helper — answers about current page, browse suggestions, RAG, no cart
- Tier 4: Variable — depends on merchant-exposed endpoint capability

**The rule that holds the system together:** discovery and semantic search can run on any tier's cached data. Price, stock, and availability are verified live against the authoritative tier before the agent speaks. Checkout always re-verifies live.

---

## 3. Query-Time Product Resolution Flow

1. **Customer query** — e.g. *"iPhone under $500"*
2. **Vector search** — semantic shortlist of candidate product IDs, filtered by `businessId`. No price/stock filtering yet.
   - **2a. Zero/low-confidence fallback:** if no candidates clear the similarity threshold (commonly because the product was added after the last ingestion cycle — see Section 4), skip straight to a **live keyword search** against the merchant's configured endpoint using the customer's raw query terms, using whichever mode (A/B) that tenant's endpoint supports. If this returns a result, present it normally, then queue it for asynchronous embedding so the next similar query hits the fast path. Emit `RAG_FALLBACK_TRIGGERED` either way, so ingestion-lag frequency is measurable.
3. **Candidate cap** — take top 5 candidates from vector search. Never verify more than 5 in parallel, to avoid merchant API throttling.
4. **Batch live verify** — parallel calls per candidate:
   - Mode A (ID lookup supported): `GET /products/{id}`
   - Mode B (keyword/filter search only): re-issue search using candidate name/attributes, match result
5. **Filter and rank** — price, stock, and availability filters applied strictly on live-verified data.
6. **Verification-failure fallback** — if all 5 candidates fail verification (distinct from step 2a's zero-candidate case):
   - Check knowledge base for similar products; respond: *"I found some options, but I need to double-check availability. Here are the closest matches:"*
   - If the merchant API is down (circuit breaker open): *"I'm having trouble accessing live inventory right now. Let me connect you with support or show you our catalog."*
7. **Response** — ranked, verified set returned to the conversation.

Dashboard config captures Mode A vs. Mode B per tenant.

---

## 4. Ingestion Architecture

### 4.1 Requirements
- Every embedded product record carries the merchant's native product ID/SKU for Tiers 1, 2, and 4.
- **Tier 3 exception:** passive crawl may yield products without stable native IDs. These are embedded with an ORA-generated ID and `sourceUrl`, marked browse-only — ORA will not attempt live inventory verification on them; shoppers are linked to the product page directly.
- Each record tagged with source tier and confidence score.
- If live verification contradicts embedded data, confidence downgrades and the merchant is nudged in-dashboard.

### 4.2 Confidence Score Ladder

| Score | Meaning | Trigger for Re-ingestion | Merchant Nudge |
|---|---|---|---|
| 1.0 | Live connector, webhook-synced, verified <1h | Webhook received | None |
| 0.7 | Feed, ingested <24h | Feed poll completed | None |
| 0.5 | Manual endpoint, keyword-only mode | Endpoint poll completed | None |
| 0.3 | Passive crawl, <7 days | Crawl completed | None |
| 0.1 | Stale or unverified | Live-verify contradiction | Dashboard alert |

**Action threshold:** if more than 20% of a merchant's catalog drops below 0.5 confidence, trigger a dashboard nudge: *"Your product data may be outdated. Connect your store for real-time accuracy."*

### 4.3 Webhook Ingestion Service (Tier 1)
- **Idempotency:** every webhook processed with an idempotency key (event ID + timestamp); duplicates dropped.
- **Ordering:** events sequenced by timestamp; out-of-order events buffered briefly.
- **Signature verification:** Shopify HMAC, WooCommerce webhook secrets, BigCommerce signatures — unsigned webhooks rejected.
- **Dead letter queue:** failed webhooks retried 3x with exponential backoff, then routed to DLQ for manual inspection.
- **Per-tenant queues:** one merchant's webhook flood never blocks another's.

### 4.4 Background Re-sync
- BullMQ workers per tenant.
- Cadence per tier: Tier 1 webhook-driven (no poll), Tier 2 hourly, Tier 3 sitemap-diff frequent + full crawl weekly, Tier 4 per merchant config.
- Adds new products, prunes discontinued ones, updates embeddings.
- Every fallback hit from step 2a above also feeds this pipeline asynchronously, independent of the scheduled cadence.

---

## 5. Context Feeding (The "Knows the Store" Layer)

Fed into the same knowledge base as products:
- **Admin-entered:** shipping policy, returns, payment methods, hours/location, brand voice, sales rules (e.g. always offer warranty, discount floor)
- **Uploaded docs:** FAQ/policy PDFs, auto-chunked and embedded
- **Sales signals:** bestsellers from connector/feed, or inferred from ORA's own order events
- **Session-scoped profile (Redis):** stated budget/preferences within the current conversation
- **Live inventory signal:** for urgency cues ("only 2 left") — always live, never cached
- **Admin sales playbook:** upsell/cross-sell rules, active coupons, margin priorities

---

## 6. Data Shapes

Unchanged from the Mongoose schemas already implemented — see `Business`, `AdminUser`, `AgentConfig`, `Product`, `Customer`, `Conversation`, `Order`, `SalesCount`, `Event`, `KnowledgeBase`. Key point reaffirmed: all collections are shared, tenant-scoped via indexed `businessId`, not physically separated per tenant (Section 2.4).

`Event.eventType` includes `rag_fallback_triggered` — this is the metric that tells you how often ingestion lag is being caught at query time, and should be watched as a leading indicator of whether Tier 3 cadence needs tightening for a given merchant.

---

## 7. APIs → Owning Service

| API | Owner |
|---|---|
| Auth & administrative | Gateway + Dashboard service |
| RAG | Core — RAG service |
| Context feeding / ingestion | Core — ingestion pipeline |
| Agent tools | Core — tool-orchestration service |
| Dashboard | Dashboard service |
| Customer / conversation | Core — conversation service |
| Conversational AI / voice | Core — voice service (streamed via Gateway) |
| Analytics | Dashboard service, reads from events collection |

---

## 8. Cross-Cutting Concerns

### 8.1 State Management
RTK on the client mirrors cart/session/UI state for responsiveness. Conversation truth lives in Redis/Mongo — client state is a mirror, not the source.

### 8.2 Security
- Per-tenant API keys at Gateway
- OAuth tokens encrypted at rest (AES-256)
- Customer PII field-level encrypted
- **Data retention:** conversation transcripts retained 90 days, then purged. Voice audio processed and discarded immediately — never stored.
- **GDPR/CCPA:** per-tenant deletion endpoint triggers async purge across MongoDB, Redis, and the vector store.
- `"inform authorities"` tool routes to a human-review queue — never fully automated.

### 8.3 Scaling
- Stateless core services behind Gateway
- Redis-backed socket adapter for horizontal voice-session scaling
- Per-tenant BullMQ queues prevent cross-tenant starvation
- Adaptive rate limiting per tenant based on observed merchant API behavior
- Shared, indexed collections (Section 2.4) rather than per-tenant databases, to keep provisioning and pooling tractable at scale

### 8.4 Tech Stack
Backend: NestJS · Frontend: Next.js (dashboard) · Database: MongoDB + Redis · Protocol: WebSocket (via Gateway) + Google AI SDK · Client state: RTK · Jobs: BullMQ

---

## 9. Platform-Specific Notes

### Shopify
- Auth: OAuth to Shopify's Admin/Storefront API
- Webhooks: `products/create`, `products/update`, `products/delete`, `inventory_levels/update`
- **Cart:** Storefront **GraphQL** API cart mutations (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`) — callable server-side with an access token, consistent with Section 2.1's rule that the ORA backend performs all merchant API calls. (The theme AJAX endpoints `/cart/add.js`, `/cart.js` are cookie/session-based and only work from the customer's own browser — they don't fit a backend-mediated architecture and are not used here.)

### WooCommerce
- Primary auth: Application Passwords (WordPress 5.6+)
- Fallback auth: OAuth 1.0a for legacy installs
- Webhooks: `product.created`, `product.updated`, `product.deleted`
- REST API namespace: `/wp-json/wc/v3`

### BigCommerce / Magento
- OAuth to Catalog API
- Webhook-driven sync where available

---

## 10. Decisions

**Resolved:**
- Checkout automation is not attempted below Tier 1. Tier 2/3/4 tenants get `redirect_to_checkout`, never session-riding automation on the merchant's storefront. Revisit only if a strong merchant demand signal emerges, since it carries UX, legal, and reliability risk (breaks silently on frontend redesigns).
- Tenant data isolation is enforced via indexed `businessId` filtering on shared collections, not physically separate databases (Section 2.4).

**Still open:**
- Vector store choice: MongoDB Atlas vector index vs. a dedicated store (Pinecone/Weaviate) — deferred until catalog volume and query-latency benchmarks are available.
- "Inform authorities" trigger definitions: precise thresholds and escalation path need legal/compliance review before implementation.

---

## 11. Changelog

| Version | Change |
|---|---|
| v1 | Initial production-hardened draft: candidate cap, confidence ladder, webhook idempotency/DLQ, tenant-isolated vector search, conditional tool registration, PII retention policy |
| v2 | Reinstated zero-candidate live-fallback + async re-embed (was dropped in v1, originally designed for the "new product not yet ingested" gap); reversed per-tenant database isolation in favor of shared tenant-scoped collections (was contradicting the existing schema design and working against scale goals); corrected Shopify cart integration to Storefront GraphQL mutations (v1's AJAX endpoints wouldn't work from a backend-mediated architecture); added sitemap `<lastmod>` diff-check to Tier 3 cadence; moved checkout-automation stance from "open" to "resolved" |


# ORA — Final Architecture (v3)

This version adds Section 12 (Billing, Plans & Payments) to the v2 architecture. All other sections are unchanged from v2 — see the v2 changelog for prior history. Only the new/changed material is reproduced in full below; refer to `ORA-Final-Architecture-v2.md` for Sections 1–11.

---

## 12. Billing, Plans & Payments

### 12.1 Why two providers

Stripe doesn't settle in BDT and has weak/no local payment-method coverage in Bangladesh (mobile financial services, local cards). bKash is the dominant mobile financial service there. So: **Stripe for international merchants, bKash for Bangladesh-based merchants**, selected once at signup based on the business's country, not user-toggleable per invoice.

This is a genuinely different problem from Section 2's dual-provider merchant integrations (Shopify vs. WooCommerce) — those are read/write catalog APIs with comparable shapes; Stripe and bKash have **fundamentally different billing models**, not just different SDKs:

| | Stripe | bKash |
|---|---|---|
| Native recurring billing | Yes — `Subscription` object, auto-renews | No — bKash has no subscription primitive |
| Renewal mechanism | Stripe charges automatically, pushes `invoice.payment_succeeded`/`failed` webhooks | ORA must actively re-charge each cycle via a saved **Tokenized Checkout agreement**, using bKash's "Execute Agreement" API — nothing renews on its own |
| Webhook signature | Stripe signing secret (`Stripe-Signature` header, HMAC) | bKash callback verification (provider-specific token/checksum on the callback payload) |
| Currency | USD (or merchant's local currency if Stripe supports it) | BDT only |

**This asymmetry is the main engineering risk in this section — do not treat bKash as "Stripe with a different SDK."** It requires an active scheduler, not a passive webhook listener, to actually collect renewal payments.

### 12.2 Provider abstraction

A single `PaymentProvider` interface, two implementations, selected per-business — nothing else in the system (plan enforcement, dashboard billing UI, agent-tool gating) should know which provider is behind it.

```typescript
interface PaymentProvider {
  createSubscription(businessId: string, planId: string): Promise<ProviderSubscriptionRef>;
  cancelSubscription(ref: ProviderSubscriptionRef): Promise<void>;
  chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult>; // no-op passthrough for Stripe (it self-renews); the real logic for bKash
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string,string>): boolean;
  handleWebhookEvent(payload: unknown): Promise<void>;
}
```

- `StripeProvider` — thin wrapper: create/cancel via Stripe SDK, `chargeRenewal` is a no-op (Stripe already renews itself), webhook handler processes `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- `BkashProvider` — `createSubscription` performs the Tokenized Checkout flow and stores the resulting **agreement ID**; `chargeRenewal` is where the real work is — it calls bKash's Execute Agreement API against the stored agreement ID and must be triggered by ORA's own scheduler (Section 12.4), not by any inbound push from bKash.

`Business.billingProvider` (`stripe` | `bkash`) determines which implementation `PaymentService` resolves to. Set once at signup based on billing country; changing it after the fact is a support-assisted operation, not a self-serve toggle (currency and payment-method mismatches make this genuinely awkward mid-subscription).

### 12.3 Plans

Plans are provider-agnostic — one `Plan` record, priced in both currencies, so switching provider doesn't mean switching plan definitions.

Example tiers (adjust to actual pricing):

| Plan | Price (USD/mo) | Price (BDT/mo) | Conversation minutes | Orders/mo (Tier 1 only) | Connected stores | Seats |
|---|---|---|---|---|---|---|
| Free | $0 | ৳0 | 100 | 20 | 1 | 1 |
| Growth | $49 | ৳5,500 | 2,000 | 500 | 3 | 5 |
| Scale | $199 | ৳22,000 | Unlimited | Unlimited | Unlimited | Unlimited |

- Limits are enforced by usage, not by a static field check — see `PlanLimitGuard` (12.6).
- A plan change (upgrade/downgrade) takes effect at the next billing cycle for downgrades, immediately (with proration where the provider supports it) for upgrades. bKash has no native proration — an upgrade there is handled as: cancel current agreement, create a new one, credit the unused portion manually via internal ledger adjustment rather than a provider-side proration API.

### 12.4 Renewal scheduling (bKash-specific)

Because bKash doesn't push renewals:

- A BullMQ job (`billing:bkash-renewal`), scheduled per-subscription for its `currentPeriodEnd`, calls `chargeRenewal`.
- **Idempotency is critical here** — a job retry must not double-charge. Guard with a `billingPeriod` + `subscriptionId` uniqueness check before calling Execute Agreement.
- On success: extend `currentPeriodEnd`, log a `PaymentTransaction`, reschedule the next job.
- On failure: enter the dunning flow (12.5) rather than retrying immediately in the same job — bKash charge failures (insufficient balance, expired agreement) need a cooldown before retry, not a tight loop.

Stripe subscriptions need no equivalent scheduler — the webhook handler is sufficient, since Stripe initiates renewal on its own.

### 12.5 Dunning / payment failure

Provider-agnostic, driven off `Subscription.status`:

1. Payment fails (webhook for Stripe, failed `chargeRenewal` for bKash) → status → `past_due`.
2. Retry schedule: 3 attempts over 7 days (day 1, day 3, day 7) — for Stripe this can piggyback on Stripe's own retry logic (Smart Retries) if enabled; for bKash it's ORA's own BullMQ retry with backoff.
3. If unresolved after the retry window → status → `suspended`. Suspension **does not delete data** — it degrades the business to Free-tier tool access (per `PlanLimitGuard`) rather than cutting off the widget entirely, since a hard cutoff mid-conversation is a bad customer-facing experience for the merchant's own shoppers, who have nothing to do with the merchant's billing issue.
4. Dashboard shows a persistent billing-issue banner to `AdminUser`s of that business throughout `past_due`/`suspended`.

### 12.6 Enforcement — `PlanLimitGuard`

A NestJS guard, applied alongside the existing `RolesGuard`/`TenantScopeGuard` stack on any endpoint or tool that consumes a metered resource (starting a conversation, placing an order, connecting an additional store).

```typescript
@UseGuards(JwtAuthGuard, TenantScopeGuard, PlanLimitGuard)
@Metered('conversationMinutes')
@Post('conversations/start')
startConversation(...) { ... }
```

- Usage counters live in Redis (`usage:{businessId}:{period}:{metric}`), incremented as consumption happens, checked against the resolved `Plan.limits` before allowing the action.
- On limit breach: reject with a `PlanLimitExceededException` (mapped to the standard error envelope, `code: 'PLAN_LIMIT_EXCEEDED'`) — the agent should surface this to the merchant's dashboard, not to the end-shopper, since a shopper mid-conversation should never see a billing error from the merchant's own vendor.

### 12.7 Data shapes

**Plan**
- `planId`, `name`, `priceUsdCents`, `priceBdtPaisa`, `billingInterval` (`monthly`/`yearly`), `limits` (`conversationMinutes`, `ordersPerMonth`, `connectedStores`, `seats`), `features[]`, `isActive`

**Subscription**
- `businessId`, `planId`, `billingProvider` (`stripe`/`bkash`), `providerRef` (Stripe subscription ID or bKash agreement ID), `status` (`trialing`/`active`/`past_due`/`suspended`/`canceled`), `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`

**PaymentTransaction**
- `businessId`, `subscriptionId`, `billingProvider`, `providerTransactionId`, `amount`, `currency`, `status` (`succeeded`/`failed`/`pending`), `billingPeriodStart`, `createdAt`

### 12.8 Security

- No raw card number, bKash PIN, or wallet credential ever stored by ORA — only provider-issued references (Stripe customer/subscription ID; bKash agreement ID). Same principle already applied to merchant OAuth tokens in Section 8.2 — provider handles the sensitive credential, ORA stores only an opaque reference.
- Webhook/callback endpoints for both providers verify signature before processing, follow the same idempotency-key + dead-letter-queue pattern already established for Tier 1 merchant webhooks (Section 4.3) — a payment webhook is not exempt from that standard just because it's billing rather than catalog data.
- `PaymentTransaction` records are the audit trail for billing disputes — never mutate one after creation; corrections are new records, not edits.

---

## 10. Decisions — addendum

**Newly resolved:**
- Two payment providers, selected by merchant country at signup, behind one `PaymentProvider` interface (Section 12.2).
- bKash renewals are actively scheduled by ORA (BullMQ), not received passively — this is treated as a first-class scheduling concern, not a webhook edge case.

**Newly open:**
- Exact plan tiers/pricing/limits in Section 12.3 are illustrative — need real numbers from the business side before implementation.
- Whether plan upgrade proration on bKash is handled via manual ledger credit (as sketched in 12.3) or simply disallowed mid-cycle (upgrade takes effect next cycle only, matching downgrade behavior) — worth deciding before building the upgrade flow, since the two are meaningfully different UX.

---

## 11. Changelog — addendum

| Version | Change |
|---|---|
| v3 | Added Section 12: dual payment provider (Stripe + bKash) architecture, provider abstraction, plan/limit enforcement, bKash-specific active renewal scheduling, dunning flow, and billing data shapes |