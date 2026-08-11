# ORA — Final Architecture (v5)

## 1. Overview

ORA is a multi-tenant, voice-first sales agent delivered as a single `<script>` embed. It behaves like a human salesperson: it knows the merchant's catalog, knows store policy, remembers what the customer already said, and can act — search, compare, add to cart, place an order — not just answer questions.

This version consolidates everything added since v2: dual payment providers and billing (Section 10), invoicing/verification/delivery (Section 10.9–10.13), and the widget delivery/injection mechanism (Section 11) that formalizes what earlier versions only summarized. Sections 1–9 are functionally unchanged from v2.

---

## 2. System Layers

### 2.1 Widget (Browser, on Merchant's Site)

Loaded via a loader snippet in the merchant's index file — see Section 11 for the full delivery mechanism.

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
- Authenticates tenant (publishable widget key — Section 11.5) and customer session
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
- **Plan-gated tools:** any metered action (starting a conversation, placing an order) also passes through `PlanLimitGuard` (Section 10.6) before execution.

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
Every collection (`Product`, `Order`, `Conversation`, `Event`, `KnowledgeBase`, `Subscription`, `Invoice`, etc.) carries an indexed `businessId` field. Physically separate databases per tenant were considered and rejected: it doesn't improve tenant isolation over an indexed, application-enforced `businessId` filter, and it actively works against the "handle millions of users" requirement.

**Redis**
- Session state and idle timers
- Job queues (BullMQ)
- Hot-path cache (product catalog data — not inventory, which must stay live)
- Rate-limit counters and plan-usage counters (Section 10.6)
- Cart state during active conversation

**Vector Store**
- Product + knowledge embeddings, `businessId` namespaced, filter enforced pre-query
- Choice between MongoDB Atlas vector index and a dedicated store (Pinecone/Weaviate) remains an open decision — see Section 12

---

### 2.5 Merchant Data Sources (Tiered)

| Tier | Source | Auth | Data Freshness | Cart | Order | Confidence |
|---|---|---|---|---|---|---|
| **1** | Platform connector (Shopify, Woo, BigCommerce, Magento) | OAuth / App Password | Real-time webhooks | ✅ | ✅ | 1.0 |
| **2** | Product feed (Google Merchant Center, Meta catalog) | URL + optional auth | Hourly/daily poll | ❌ | ❌ | 0.7 |
| **3** | Passive capture (JSON-LD, OG tags, sitemap crawl) | None | Sitemap diff-check + weekly full crawl | ❌ | ❌ | 0.3 |
| **4** | Manual endpoint mapping | API key / bearer | Per-call | Configurable | Configurable | 0.5–1.0* |

*Tier 4 confidence depends on endpoint capability: 1.0 if it supports live ID lookup, 0.5 if keyword-only.

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
   - **2a. Zero/low-confidence fallback:** if no candidates clear the similarity threshold, skip straight to a **live keyword search** against the merchant's configured endpoint using the customer's raw query terms. If this returns a result, present it normally, then queue it for asynchronous embedding. Emit `RAG_FALLBACK_TRIGGERED` either way.
3. **Candidate cap** — take top 5 candidates from vector search. Never verify more than 5 in parallel.
4. **Batch live verify** — parallel calls per candidate (Mode A: ID lookup, Mode B: keyword search + match).
5. **Filter and rank** — price, stock, and availability filters applied strictly on live-verified data.
6. **Verification-failure fallback** — if all 5 candidates fail verification, fall back to similar knowledge-base matches or a support/circuit-breaker message.
7. **Response** — ranked, verified set returned to the conversation.

---

## 4. Ingestion Architecture

### 4.1 Requirements
- Every embedded product record carries the merchant's native product ID/SKU for Tiers 1, 2, and 4.
- **Tier 3 exception:** passive crawl may yield products without stable native IDs — embedded with an ORA-generated ID, marked browse-only.
- Each record tagged with source tier and confidence score; live-verification contradictions downgrade confidence and nudge the merchant in-dashboard.

### 4.2 Confidence Score Ladder

| Score | Meaning | Trigger for Re-ingestion | Merchant Nudge |
|---|---|---|---|
| 1.0 | Live connector, webhook-synced, verified <1h | Webhook received | None |
| 0.7 | Feed, ingested <24h | Feed poll completed | None |
| 0.5 | Manual endpoint, keyword-only mode | Endpoint poll completed | None |
| 0.3 | Passive crawl, <7 days | Crawl completed | None |
| 0.1 | Stale or unverified | Live-verify contradiction | Dashboard alert |

### 4.3 Webhook Ingestion Service (Tier 1)
- Idempotency key per event, ordering by timestamp, signature verification per platform, DLQ after 3 retries, per-tenant queues.

### 4.4 Background Re-sync
- BullMQ workers per tenant; cadence per tier (Tier 1 webhook-driven, Tier 2 hourly, Tier 3 sitemap-diff + weekly crawl, Tier 4 per config).

---

## 5. Context Feeding (The "Knows the Store" Layer)

- Admin-entered policy/brand/sales rules, uploaded docs, sales signals, session-scoped preferences, live inventory urgency cues, admin sales playbook — all feeding the same knowledge base as products.

---

## 6. Data Shapes

Core collections (unchanged from v2): `Business`, `AdminUser`, `AgentConfig`, `Product`, `Customer`, `Conversation`, `Order`, `SalesCount`, `Event`, `KnowledgeBase`. Billing collections (new, Section 10.7): `Plan`, `Subscription`, `PaymentTransaction`, `Invoice`, `InvoiceDeliveryLog`. All shared, tenant-scoped via indexed `businessId`.

`Event.eventType` includes `rag_fallback_triggered` — leading indicator of whether Tier 3 cadence needs tightening.

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
| Billing | Core — billing service (Section 10) |
| Analytics | Dashboard service, reads from events collection |

---

## 8. Cross-Cutting Concerns

### 8.1 State Management
RTK on the client mirrors cart/session/UI state. Conversation truth lives in Redis/Mongo — client state is a mirror, not the source.

### 8.2 Security
- Per-tenant API keys at Gateway; OAuth tokens and payment provider references encrypted at rest (AES-256); customer PII field-level encrypted.
- **Data retention:** conversation transcripts retained 90 days, then purged. Voice audio processed and discarded immediately.
- **GDPR/CCPA:** per-tenant deletion endpoint triggers async purge across MongoDB, Redis, and vector store.
- `"inform authorities"` tool routes to a human-review queue — never fully automated.

### 8.3 Scaling
- Stateless core services behind Gateway; Redis-backed socket adapter; per-tenant BullMQ queues; adaptive per-tenant rate limiting; shared indexed collections over per-tenant databases.

### 8.4 Tech Stack
Backend: NestJS · Frontend: Next.js (dashboard) · Database: MongoDB + Redis · Protocol: WebSocket + Google AI SDK · Client state: RTK · Jobs: BullMQ · Payments: Stripe + bKash (Section 10) · Delivery: CDN-hosted widget (Section 11)

---

## 9. Platform-Specific Notes

### Shopify
- OAuth to Admin/Storefront API. Webhooks: `products/create|update|delete`, `inventory_levels/update`.
- **Cart:** Storefront GraphQL API mutations (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`) — callable server-side, consistent with the backend-mediated rule. Theme AJAX endpoints (`/cart/add.js`) are not used — they're cookie/session-based and only work from the customer's own browser.

### WooCommerce
- Primary auth: Application Passwords (WP 5.6+). Fallback: OAuth 1.0a for legacy installs. REST namespace `/wp-json/wc/v3`.

### BigCommerce / Magento
- OAuth to Catalog API, webhook-driven sync where available.

---

## 10. Billing, Plans & Payments

### 10.1 Why two providers

Stripe doesn't settle in BDT and has weak local payment-method coverage in Bangladesh. bKash is the dominant mobile financial service there. **Stripe for international merchants, bKash for Bangladesh-based merchants**, selected once at signup by billing country.

The two providers have fundamentally different billing models, not just different SDKs:

| | Stripe | bKash |
|---|---|---|
| Native recurring billing | Yes — `Subscription` object, auto-renews | No — no subscription primitive |
| Renewal mechanism | Auto-charges, pushes `invoice.payment_succeeded`/`failed` webhooks | ORA must actively re-charge each cycle via a stored **Tokenized Checkout agreement** using bKash's Execute Agreement API |
| Webhook signature | Stripe signing secret (HMAC) | bKash callback verification (provider-specific checksum) |
| Currency | USD (or Stripe-supported local currency) | BDT only |

**This asymmetry is the main engineering risk in this section.** bKash requires an active scheduler, not a passive webhook listener, to actually collect renewal payments.

### 10.2 Provider abstraction

```typescript
interface PaymentProvider {
  createSubscription(businessId: string, planId: string): Promise<ProviderSubscriptionRef>;
  cancelSubscription(ref: ProviderSubscriptionRef): Promise<void>;
  chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult>; // no-op for Stripe; the real logic for bKash
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string,string>): boolean;
  handleWebhookEvent(payload: unknown): Promise<void>;
}
```

`Business.billingProvider` (`stripe` | `bkash`) determines which implementation `PaymentService` resolves to, set once at signup. Changing it later is support-assisted, not self-serve, due to currency/payment-method mismatches mid-subscription.

### 10.3 Plans

Provider-agnostic — one `Plan` record priced in both currencies:

| Plan | USD/mo | BDT/mo | Conversation minutes | Orders/mo (Tier 1) | Connected stores | Seats |
|---|---|---|---|---|---|---|
| Free | $0 | ৳0 | 100 | 20 | 1 | 1 |
| Growth | $49 | ৳5,500 | 2,000 | 500 | 3 | 5 |
| Scale | $199 | ৳22,000 | Unlimited | Unlimited | Unlimited | Unlimited |

*Illustrative only — see Section 12 open decisions.*

- Downgrades take effect next billing cycle; upgrades take effect immediately with proration where the provider supports it. bKash has no native proration — an upgrade there is: cancel current agreement, create a new one, credit manually via internal ledger.

### 10.4 Renewal scheduling (bKash-specific)

- BullMQ job (`billing:bkash-renewal`) scheduled per-subscription for `currentPeriodEnd`, calls `chargeRenewal`.
- Idempotency guard on `billingPeriod` + `subscriptionId` — a job retry must never double-charge.
- On success: extend `currentPeriodEnd`, log `PaymentTransaction`, reschedule next job. On failure: enter dunning (10.5) rather than retrying in the same job — bKash failures need a cooldown, not a tight loop.
- Stripe needs no equivalent scheduler — its webhook handler is sufficient.

### 10.5 Dunning / payment failure

1. Payment fails → `Subscription.status` → `past_due`.
2. Retry: 3 attempts over 7 days (day 1/3/7) — Stripe Smart Retries if enabled, or ORA's own BullMQ backoff for bKash.
3. Unresolved after retry window → `suspended`. **Does not delete data** — degrades to Free-tier tool access via `PlanLimitGuard` rather than cutting the widget off entirely, since a hard cutoff mid-conversation punishes the merchant's shoppers for the merchant's billing issue.
4. Dashboard shows a persistent billing-issue banner throughout `past_due`/`suspended`.

### 10.6 Enforcement — `PlanLimitGuard`

```typescript
@UseGuards(JwtAuthGuard, TenantScopeGuard, PlanLimitGuard)
@Metered('conversationMinutes')
@Post('conversations/start')
startConversation(...) { ... }
```

- Usage counters in Redis (`usage:{businessId}:{period}:{metric}`), checked against resolved `Plan.limits` before allowing the action.
- On breach: `PlanLimitExceededException` (`code: 'PLAN_LIMIT_EXCEEDED'`), surfaced to the merchant's dashboard — never to the end-shopper mid-conversation.

### 10.7 Data shapes

**Plan** — `planId`, `name`, `priceUsdCents`, `priceBdtPaisa`, `billingInterval`, `limits{conversationMinutes, ordersPerMonth, connectedStores, seats}`, `features[]`, `isActive`

**Subscription** — `businessId`, `planId`, `billingProvider`, `providerRef`, `status(trialing/active/past_due/suspended/canceled)`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`

**PaymentTransaction** — `businessId`, `subscriptionId`, `billingProvider`, `providerTransactionId`, `amount`, `currency`, `status(succeeded/failed/pending)`, `billingPeriodStart`, `createdAt` — append-only, corrections are new records

**Invoice** — `invoiceNumber`, `businessId`, `subscriptionId`, `transactionId`, `amountUsdCents`/`amountBdtPaisa`, `currency`, `taxAmount`, `pdfUrl`, `status(generated/sent/failed)`, `createdAt`

**InvoiceDeliveryLog** — `invoiceId`, `attemptNumber`, `trigger(auto/manual-resend)`, `status(succeeded/failed)`, `providerResponse`, `createdAt`

**AdminUser (billing-related additions)** — `emailVerified: boolean`, `pendingOtpHash`, `otpExpiresAt`, `otpAttemptCount`

### 10.8 Security

- No raw card number, bKash PIN, or wallet credential ever stored — only provider-issued references, same principle as merchant OAuth tokens (Section 8.2).
- Webhook/callback endpoints for both providers verify signature before processing, same idempotency-key + DLQ pattern as Tier 1 merchant webhooks (Section 4.3).
- `PaymentTransaction` and `Invoice` records are append-only audit trails — never mutated after creation.

### 10.9 Invoice Generation

- **Trigger:** any successful payment event — Stripe's `invoice.payment_succeeded` webhook, or a successful `chargeRenewal()` return for bKash — both funnel into one internal `payment.succeeded` event, keeping invoice logic provider-agnostic.
- `Invoice` created synchronously on `payment.succeeded`, independent of email delivery (10.11) — invoice history must never depend on an email provider being up.
- **Numbering:** sequential, human-readable (`ORA-2026-000123`), backed by an atomic Mongo counter (`findOneAndUpdate` with `$inc`) — not timestamp- or `_id`-derived, avoiding collisions.
- **PDF rendering:** server-side only, matching the backend-mediation rule (2.1). Includes business name/address, plan, billing period, line items, tax, total, provider reference.
- **Tax/VAT:** flagged, not decided — see Section 12.
- **Storage:** PDF in object storage (S3-compatible); `Invoice.pdfUrl` is a reference, not the blob.

### 10.10 OTP Verification — scoping

Two different things could be meant by "OTP verification" — only one is ORA's to build:

|  | Owner | ORA builds it? |
|---|---|---|
| Payment-time OTP (bKash charge authorization) | bKash's hosted Tokenized Checkout | No — ORA only receives the callback with success/failure + agreement ID |
| Recipient-verification OTP (confirming an `AdminUser`'s email before it becomes the billing address) | ORA | Yes |

**Recipient-verification OTP design:**
- Triggered on signup or billing/notification email change.
- 6-digit, single-use, 10-minute expiry, stored **hashed**.
- Rate-limited: 5 generations/hour, 5 verification attempts per code before lockout + cooldown (mirrors the dunning cooldown pattern, 10.5).
- Until verified, `AdminUser.emailVerified = false` — product access is unaffected, but invoices/billing emails queue and hold until verified, with a dashboard banner.
- Lives on `AdminUser`, not inside the `PaymentProvider` abstraction — keeps that interface payment-only.

### 10.11 Invoice Delivery

- Async `billing:send-invoice` (BullMQ) job, enqueued right after `Invoice` creation, decoupled from payment confirmation — subscription is already `active` before this job runs.
- Idempotent on `invoiceId` — a retry must not double-send. Retry: 3x exponential backoff, then DLQ (same shape as 4.3 and 10.4).
- PDF delivered as a **secure link**, not a raw attachment — avoids size limits and spam-filter false positives.
- Email provider: open decision (Section 12) — needs to serve both an international (Stripe) and Bangladesh (bKash) audience well.
- Delivery failure surfaces as its own dashboard banner, distinct from the payment-failure banner (10.5) — a bounced invoice email is a different problem than `past_due` and shouldn't send the merchant down the wrong troubleshooting path.

### 10.12 Resend & Audit

- Manual resend from the dashboard, rate-limited (e.g. 3/day) to prevent abuse.
- Every delivery attempt (auto or manual, success or failure) logged to `InvoiceDeliveryLog` — the support trail for "never got my invoice" tickets, distinct from `PaymentTransaction`'s financial audit trail.

---

## 11. Widget Delivery & Injection Architecture

### 11.1 Why this needs its own section

Earlier sections state the widget loads "via a script tag" without specifying how a code change reaches every merchant's site without a redeploy, how style clashes with the merchant's own CSS are avoided, or how the tenant is identified from a value sitting in public page source. This section resolves those three problems.

### 11.2 Two-Stage Loader Pattern

The merchant pastes a small, stable **loader** — not the real widget code — whose only job is to fetch and inject the real bundle at runtime:

```html
<script>
  (function(w,d,s,id){
    if (w.ORA) return;
    w.ORA = w.ORA || function(){ (w.ORA.q = w.ORA.q || []).push(arguments); };
    var js = d.createElement(s); js.id = id; js.async = true;
    js.src = "https://cdn.ora.ai/widget/v2/loader.js";
    d.body.appendChild(js);
  })(window, document, "script", "ora-widget");
  ORA('init', { apiKey: 'biz_live_xxxx' });
</script>
```

**Why two stages:** the pasted snippet is frozen in the merchant's HTML essentially forever. Everything that actually changes — features, fixes, tool support — ships from the CDN independent of that frozen snippet. Same pattern as Intercom, Drift, and Stripe's embeddable elements — not novel, and diverging from it (re-pasting on every update) would materially hurt onboarding and update velocity.

### 11.3 CDN Structure & Versioning

```
cdn.ora.ai/widget/
  loader.js              ← stable, cached long
  v2/
    widget.<hash>.js      ← real bundle, content-hashed filename
    widget.<hash>.css
  latest.json             ← { "version": "v2", "hash": "<hash>" }
```

- `widget.<hash>.js` — filename is a content hash; a new build produces a new URL, never overwrites an old one — cacheable forever at browser/edge level.
- `latest.json` — the only file that must stay fresh (cached seconds, not days). `loader.js` fetches this on every page load to resolve the current hash.
- **Net effect:** shipping a fix means updating `latest.json` — every merchant's site picks it up on next page load, zero merchant-side action, while the bundle itself stays aggressively cached.
- **Staged rollout is a hard requirement, not an optimization:** because `latest.json` is a single global pointer, a bad build is instantly live everywhere. Resolution must support percentage-based rollout before 100% — the alternative is one bad deploy breaking every merchant simultaneously.
- Version folders (`/v2/`, `/v3/`) allow major-version pinning; old versions retire only once migration is complete.

### 11.4 Isolation — Shadow DOM Mounting

- The widget mounts into a **Shadow DOM** root, not the page's DOM tree directly — merchant CSS can't leak in, widget CSS can't leak out. Hard requirement for a script running on arbitrary third-party sites.
- Passive DOM/JSON-LD reads (11.6) are read-only with respect to the host page — the widget observes, never mutates anything outside its own shadow root.
- Iframe isolation was considered and rejected as default (cross-frame messaging overhead, complicates the passive context read) — Shadow DOM is default, iframe is revisitable for merchants with strict CSP requirements.

### 11.5 Authentication Model — Publishable Key

The `apiKey: 'biz_live_xxxx'` value is a **publishable key**, not a secret — same trust model as Stripe's `pk_live_*` vs `sk_live_*` split.

| Key type | Where it lives | What it authorizes |
|---|---|---|
| Publishable widget key | Public — sits in merchant's page source | Identifies which tenant a WebSocket session belongs to. Nothing more. |
| Secret credentials (`OAuthCredentials`, `ManualEndpointConfig.authHeaderEncrypted`) | Server-side only, encrypted at rest (8.2) | Actually call Shopify/WooCommerce/etc. on the merchant's behalf |

Safe to expose in plaintext HTML because it carries no write-scope. Not documented or supported as an env-var-style secret — many merchant sites have no build step at all (raw Liquid, WordPress, static HTML), so that constraint wouldn't map to reality.

**Guardrails on the Gateway** (since the key itself is public):
- **Domain allowlisting** — key registered against the merchant's domain(s) at connect-time; Gateway checks `Origin`/`Referer` against it. This is an abuse deterrent, not a hard security boundary — some clients omit these headers, so a stolen key used outside a browser context can bypass this check. Rate limiting (below) is the real backstop.
- **Per-tenant rate limiting** (2.2/8.3) — the primary abuse mitigation for a key that's inherently public.
- **Rotation** — dashboard "regenerate key" invalidates the old one immediately; cheap since the key carries no write-scope, no cascading re-auth needed elsewhere.

### 11.6 Capability Gating (Tier-Aware Rendering)

The widget doesn't decide what it's allowed to show. On WebSocket connect, Gateway resolves `businessId` from the publishable key, Core services check the tier, and **the backend tells the widget what to render** — cart/checkout UI for Tier 1, `redirect_to_checkout` for Tier 2–4. A tier change (e.g. connecting Shopify mid-lifecycle) takes effect on the widget's next connection, no client-side redeploy needed.

### 11.7 Passive Page Context Capture

- Reads JSON-LD product schema, Open Graph tags, and visible-page context — current page only, not site-wide crawling (that's Tier 3 ingestion, Section 4).
- Strictly read-only (11.4).
- Feeds the Conversation Service as session-scoped context (Section 5) — this is what makes Tier 3 functional immediately on script install, zero merchant configuration beyond pasting the loader.

---

## 12. Decisions

**Resolved:**
- Checkout automation not attempted below Tier 1 — redirect only.
- Tenant data isolation via indexed `businessId` filtering on shared collections, not physically separate databases.
- Two payment providers (Stripe + bKash), selected by merchant country at signup, behind one `PaymentProvider` interface.
- bKash renewals are actively scheduled by ORA (BullMQ), not received passively.
- Invoice generation is synchronous with payment confirmation; delivery is async and decoupled — an email outage cannot block subscription activation.
- Invoice numbering is a Mongo atomic counter, not timestamp-derived.
- PDFs are stored as objects and linked, never emailed as raw attachments.
- Widget delivery uses a two-stage loader (stable snippet + CDN-hosted, content-hashed bundle) — required for shipping updates without merchant-side redeploys.
- Widget auth uses a publishable-key model, distinct from secret merchant credentials — intentionally safe to expose in page source.
- Widget isolation uses Shadow DOM by default; iframe is a fallback for stricter-CSP merchants.
- Tier/capability logic is resolved server-side per connection and pushed to the widget.

**Still open:**
- Vector store choice: MongoDB Atlas vector index vs. dedicated store — deferred until catalog volume/query-latency benchmarks exist.
- "Inform authorities" trigger definitions — needs legal/compliance review.
- Exact plan tiers/pricing/limits (Section 10.3) are illustrative — need real numbers from the business side.
- bKash upgrade proration: manual ledger credit vs. simply disallowing mid-cycle upgrades (matching downgrade behavior) — different UX, needs a decision before the upgrade flow is built.
- **Confirm OTP intent** was recipient-verification, as assumed in 10.10 — flag if payment-time OTP was actually meant (in which case there's nothing further to build, bKash already owns that flow).
- Tax/VAT computation rules (Bangladesh VAT on bKash invoices; international tax obligations on Stripe invoices) — legal/accounting review required, not an engineering decision.
- Email delivery provider — single provider vs. two-provider split by region, pending deliverability data.
- Percentage-based staged rollout mechanics for `latest.json` (edge-function-based vs. loader-side bucketing) — needed before the CDN pipeline is built.
- Whether iframe isolation should be a formal opt-in for security-sensitive merchants, or handled case-by-case — no demand signal yet.

---

## 13. Changelog

| Version | Change |
|---|---|
| v1 | Initial production-hardened draft: candidate cap, confidence ladder, webhook idempotency/DLQ, tenant-isolated vector search, conditional tool registration, PII retention policy |
| v2 | Reinstated zero-candidate live-fallback + async re-embed; reversed per-tenant database isolation in favor of shared tenant-scoped collections; corrected Shopify cart integration to Storefront GraphQL mutations; added sitemap `<lastmod>` diff-check to Tier 3 cadence; moved checkout-automation stance from open to resolved |
| v3 | Added billing: dual payment provider (Stripe + bKash) architecture, provider abstraction, plan/limit enforcement, bKash-specific active renewal scheduling, dunning flow, billing data shapes |
| v4 | Added invoice generation (numbering, PDF, tax placeholder), scoped OTP verification (clarified bKash owns payment-time OTP; specified recipient-email-verification OTP as the new ORA-owned flow), async decoupled invoice delivery with DLQ/idempotency, resend + audit logging, new data shapes (`Invoice`, `InvoiceDeliveryLog`, `AdminUser` additions) |
| v5 | Added widget delivery and injection architecture: two-stage loader pattern, CDN structure/versioning with staged-rollout requirement, Shadow DOM isolation rationale, publishable-key authentication model (with domain allowlisting/rotation caveats), server-driven capability gating, formalized passive page-context capture. Consolidated v2–v4 addenda into one document. |