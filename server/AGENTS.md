# Server Engineering Standards & AI Coding Rules (`server/`)

This document governs backend development in the `server/` package (NestJS Backend API). All AI coding assistants and developers MUST follow these guidelines, aligned with [ORA-Final-Architecture.md (v5)](file:///home/nullpointer/Documents/work/hype_corporation/ORA/ORA-Final-Architecture.md).

---

## 1. Tech Stack & Module Conventions

- **Framework:** NestJS (TypeScript), MongoDB (Mongoose), Redis, BullMQ.
- **Module Structure:** One feature = one module (e.g., `products/`, `auth/`, `conversations/`, `billing/`, `invoices/`).
  ```
  src/billing/
  ├── billing.module.ts
  ├── billing.controller.ts
  ├── billing.service.ts
  ├── providers/
  │   ├── payment-provider.interface.ts
  │   ├── stripe.provider.ts
  │   └── bkash.provider.ts
  ├── dto/
  └── billing.service.spec.ts
  ```
- **Cross-Cutting Concerns:** Place shared guards, filters, interceptors, decorators, and correlation-id middleware in `src/common/`. Never duplicate cross-cutting logic per module.
- **Business Logic Boundary:** Controllers ONLY validate via DTOs, delegate to services, and return results. If a controller method exceeds ~10 lines, move logic into the service layer.

---

## 2. Actor Model & Auth Mechanisms (v5 Architecture)

### 2.1 AdminUser Authentication (Dashboard)
- **Access Token (JWT):** 15-minute lifetime. Returned in response body, stored in client memory. Contains `sub` (adminUserId), `businessId`, `role`, `sessionId`.
- **Refresh Token:** 7-day lifetime. Rotating token stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie (`/api/auth/refresh`).
- **Redis Session:** Keyed by `session:{sessionId}` containing `{ adminUserId, businessId, refreshTokenHash, userAgent, ip }`.
- **Token Rotation & Theft Detection:** Every refresh call invalidates the old token and issues a new one. If a token mismatch occurs, revoke the entire session immediately in Redis.
- **Recipient Email OTP Verification (v5 Section 10.10):** 6-digit hashed single-use code with 10-minute expiry and 5-attempt rate limit. Unverified accounts (`emailVerified = false`) can use the dashboard but billing emails/invoices are queued until verified.

### 2.2 Tenant (Business) API & Publishable Widget Key Auth
- Public Widget APIs authenticate via **Publishable Widget Key** (`biz_live_xxxx`). Gateway validates keys, origin domain allowlisting, and attaches `businessId` to request context.
- Merchant platform secrets (Shopify OAuth, WooCommerce keys) are stored server-side encrypted at rest (AES-256).
- **Tenant Scoping Requirement:** Every Mongo, Redis, or Vector DB query MUST filter by `businessId`. All shared collections carry an indexed `businessId`.

### 2.3 Customer Voice Widget Sessions
- Widget requests receive a short-lived conversation session token mapping to `Conversation.sessionId`.
- Session state resides in Redis. On 10-second idle timeout, mark session suspended — **do not delete context**.

---

## 3. Dual Payment Provider & Invoicing Architecture (v5 Section 10)

### 3.1 Provider Abstraction (`PaymentProvider`)
All payment integrations implement `PaymentProvider` (`createSubscription`, `cancelSubscription`, `chargeRenewal`, `verifyWebhookSignature`, `handleWebhookEvent`):
- **`StripeProvider`:** Handles international USD billing via auto-renewing subscriptions and webhooks.
- **`BkashProvider`:** Handles Bangladesh BDT billing via Tokenized Checkout agreement IDs and active renewal execution.

### 3.2 Active Renewal Scheduler & Dunning
- **bKash Renewal Scheduler:** BullMQ job (`billing:bkash-renewal`) scheduled per-subscription for `currentPeriodEnd` executes `chargeRenewal()`. Idempotency guarded on `billingPeriod` + `subscriptionId`.
- **Dunning Flow:** On payment failure, transition status to `past_due` → 3 retry attempts over 7 days → `suspended`. Degrades to Free-tier tool access via `PlanLimitGuard` without deleting data or interrupting end-shoppers mid-conversation.

### 3.3 Plan & Metering Guard (`PlanLimitGuard`)
- Enforce usage limits via `PlanLimitGuard` decorator on metered endpoints:
  ```typescript
  @UseGuards(JwtAuthGuard, TenantScopeGuard, PlanLimitGuard)
  @Metered('conversationMinutes')
  @Post('conversations/start')
  startConversation(...) { ... }
  ```
- Usage counters live in Redis (`usage:{businessId}:{period}:{metric}`). On breach, throw `PlanLimitExceededException` (`code: 'PLAN_LIMIT_EXCEEDED'`).

### 3.4 Invoicing & Delivery
- **Synchronous Generation:** On `payment.succeeded`, generate `Invoice` with atomic Mongo counter (`ORA-2026-000123`) and server-side PDF stored in S3.
- **Async Delivery:** BullMQ job (`billing:send-invoice`) sends secure PDF links asynchronously. Retries feed into DLQ, and attempts log to `InvoiceDeliveryLog`.
- **Append-Only Auditing:** `PaymentTransaction` and `InvoiceDeliveryLog` records are immutable audit trails.

---

## 4. RBAC (Role-Based Access Control)

Roles: `owner`, `admin`, `staff` (per `AdminRole` enum).

- Enforce roles exclusively using NestJS guards and decorators (`@Roles(...)`, `RolesGuard`). Never write inline `if (user.role === ...)` checks inside services or controllers.
- **Tenant Scope Enforcement:** Enforce dual verification via `TenantScopeGuard` to guarantee `request.user.businessId === resource.businessId`.

```typescript
@Roles(AdminRole.OWNER, AdminRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
@Delete(':id')
deleteProduct(@Param('id') id: string) { ... }
```

---

## 5. Error Handling & Exception Envelopes

### 5.1 Domain Exceptions
Define domain-specific exceptions extending `DomainException` rather than throwing generic `HttpException`:
```typescript
export class DomainException extends HttpException {
  constructor(public readonly code: string, message: string, status: number) {
    super({ code, message }, status);
  }
}
```

### 5.2 Global Exception Filter & Envelope Standard
All endpoints MUST adhere to the standardized response envelope:
- **Success Envelope:** `{ success: true, data: result }`
- **Error Envelope:**
  ```json
  {
    "success": false,
    "error": {
      "code": "PRODUCT_NOT_FOUND",
      "message": "Product with ID xyz was not found.",
      "correlationId": "req-12345"
    }
  }
  ```

---

## 6. Input Validation & Security

- All incoming request payloads MUST use DTOs decorated with `class-validator`.
- Global `ValidationPipe` must be configured in `main.ts`:
  ```typescript
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  ```

---

## 7. Testing Requirements

- **Unit Tests (`*.spec.ts`):** Mandatory for all services with business logic (payment providers, billing, catalog, RAG). Mock Mongoose models and Redis calls.
- **E2E Tests (`*.e2e-spec.ts`):** Mandatory for authentication, token refresh, token theft rotation, RBAC guards, and webhook handlers.

---

## 8. SuperAdmin & Platform Control Plane (`/api/v1/admin`)

### 8.1 Role & Guard Requirements
- SuperAdmin endpoints are strictly guarded by `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(AdminRole.SUPER_ADMIN)`.
- Unlike tenant endpoints, SuperAdmin queries aggregate platform-wide telemetry across all tenant collections (`Business`, `AdminUser`, `Subscription`, `Order`, `Conversation`, `Customer`, `Product`) while excluding the system tenant (`name: { $ne: 'ORA Platform' }`).
- Never apply `TenantScopeGuard` to SuperAdmin controller endpoints.

### 8.2 Endpoints Summary (`AdminController`)
| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/v1/admin/stats` | `GET` | `super_admin` | Aggregated platform metrics (MRR/ARR, plan distribution, voice minutes, GMV, 7D/30D activity trends, infrastructure health). |
| `/api/v1/admin/businesses` | `GET` | `super_admin` | Paginated, searchable merchant list with owner email, status, and conversation counts. |
| `/api/v1/admin/businesses/:id` | `GET` | `super_admin` | Single merchant deep inspection (subscription, catalog size, orders, activity). |
| `/api/v1/admin/businesses/:id/status` | `PATCH` | `super_admin` | Update store status (`active`, `suspended`, `pending`). |
| `/api/v1/admin/users` | `GET` | `super_admin` | Cross-tenant user directory with role filters (`super_admin`, `owner`, `admin`, `staff`). |
| `/api/v1/admin/voice-sessions` | `GET` | `super_admin` | Real-time and recent Gemini voice sessions with turn counts and status. |
| `/api/v1/admin/system/health` | `GET` | `super_admin` | Diagnostics for Node process, MongoDB connection, and Redis latency. |

