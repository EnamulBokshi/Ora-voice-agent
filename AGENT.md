# AGENT.md — ORA Engineering Standards

This file governs how any AI coding assistant (Claude, Copilot, Cursor, etc.) and any human contributor writes code in this repository. It exists so that work generated across many sessions, tools, and people converges on one consistent system instead of drifting into inconsistent patterns per-file. **Read this before generating or editing any code in this repo.** If a request conflicts with this file, follow this file and flag the conflict rather than silently picking one.

This document assumes the architecture already defined in `ORA-Final-Architecture-v2.md` and the Mongoose schemas already implemented (`Business`, `AdminUser`, `AgentConfig`, `Product`, `Customer`, `Conversation`, `Order`, `SalesCount`, `Event`, `KnowledgeBase`). Nothing here overrides that document — this file is about *how* code is written, not *what* the system does.

---

## 1. Repository & Tech Stack

- **Backend:** NestJS (TypeScript), MongoDB (Mongoose), Redis, BullMQ.
- **Frontend (dashboard):** Next.js (App Router), TypeScript, RTK for client state.
- **Structure:** monorepo.

```
/apps
  /api          → NestJS backend
  /dashboard    → Next.js admin dashboard
/packages
  /shared-types → DTOs, enums, interfaces shared between api and dashboard
  /shared-config→ eslint/tsconfig/prettier base configs
```

- Never duplicate a type or enum across `apps/api` and `apps/dashboard` — it belongs in `packages/shared-types`, imported by both. If you find yourself hand-copying a DTO shape into the frontend, stop and move it to shared-types instead.

---

## 2. Actor Model (read this before touching auth code)

There are **three distinct actor types**. Do not conflate their auth flows — this is the single most common source of AI-generated auth bugs in a system like this.

| Actor | What it is | Auth mechanism |
|---|---|---|
| **AdminUser** | A business owner/staff logging into the dashboard | JWT (access) + refresh token in httpOnly cookie + Redis session |
| **Business (tenant)** | The merchant account itself, identified on every widget request | API key (hashed, per `Business.apiKeyHash`) |
| **Customer** | An end-shopper talking to the voice widget | Ephemeral conversation session token, tied to `Conversation.sessionId`, not a login |

A `Customer` never has a password or a JWT identity — they are identified only by session token + optionally gathered profile info (`Customer` document). Do not build a "customer login" flow unless explicitly asked; it is out of scope for this actor.

---

## 3. Authentication — JWT + Session Hybrid (AdminUser only)

This applies to dashboard/admin auth. Widget/tenant auth uses API keys (Section 4); customer sessions use conversation tokens (Section 5).

### 3.1 Token design

| Token | Lifetime | Storage | Contains |
|---|---|---|---|
| Access token (JWT) | 15 minutes | Returned in response body, held in memory on client (never localStorage) | `sub` (AdminUser id), `businessId`, `role`, `sessionId`, `iat`, `exp` |
| Refresh token | 7 days, rotating | httpOnly, `Secure`, `SameSite=Strict` cookie | opaque random string, hashed before storing in Redis |

**Why hybrid, not pure JWT:** a pure stateless JWT can't be revoked before expiry. Embedding `sessionId` in the access token and keeping a matching session record in Redis means a logout, password change, or admin-forced revocation can invalidate a session immediately by deleting the Redis record — the next request presenting that JWT is rejected at the guard level even though the JWT signature is still technically valid.

### 3.2 Redis session record

```
key:    session:{sessionId}
value:  { adminUserId, businessId, refreshTokenHash, createdAt, lastUsedAt, userAgent, ip }
ttl:    matches refresh token lifetime, extended on rotation
```

### 3.3 Refresh rotation

- Every refresh call issues a **new** refresh token and invalidates the old one (rotation, not reuse).
- If a refresh token is presented that doesn't match the current hash in Redis for that `sessionId`, treat it as **token theft** — revoke the entire session family immediately and require re-login. Do not silently accept it.

### 3.4 Cookie policy (non-negotiable defaults)

```
httpOnly: true
secure: true            // always, even in dev behind HTTPS tunnel — never relax this in shared code
sameSite: 'strict'      // 'lax' only if cross-site redirect flows require it, and only with explicit reasoning in the PR
path: '/api/auth/refresh'  // scope the refresh cookie narrowly, not '/'
```

Access tokens are **never** put in a cookie. They go in the response body; the client holds them in memory (Redux/RTK state) and attaches them as `Authorization: Bearer <token>` headers. This avoids the access token being sent automatically on every request (cookie behavior) and reduces CSRF surface for the high-frequency token.

### 3.5 CSRF

Because the refresh flow uses a cookie, it is a CSRF target. Mitigate with:
- `SameSite=Strict` on the refresh cookie (primary defense).
- A double-submit CSRF token for the refresh endpoint specifically, if the dashboard ever needs cross-site embedding (it currently doesn't — if this changes, revisit).

### 3.6 Logout

Logout must delete the Redis session record, not just clear the client cookie. A logout that only clears the cookie leaves the JWT valid until natural expiry if an attacker captured it separately — always revoke server-side.

---

## 4. Tenant (Business) Authentication — Widget Requests

- Every widget request carries the business's API key.
- The key is **hashed** (`Business.apiKeyHash`) — never store or log the raw key server-side after issuance. Show the raw key to the admin exactly once at generation time.
- Gateway validates the key on every request and attaches `businessId` to the request context before it reaches any Core service. Every downstream query (Mongo, Redis, vector search) must filter by this `businessId` — this is the tenant-isolation boundary described in the architecture doc. There is no code path where a service queries `Product`, `Conversation`, `Order`, etc. without a `businessId` filter, even internally.

---

## 5. Customer Session Handling (Voice Widget)

- On widget load, the backend issues a short-lived conversation session token (not a JWT, not tied to any user account) — this maps to `Conversation.sessionId`.
- Session state (idle timers, in-progress cart) lives in Redis, keyed by `sessionId`.
- 10-second conversation-idle timeout suspends the session but **retains context** — do not delete the Redis record on idle timeout, only mark it suspended. A full delete happens on explicit `ended` status or TTL expiry, per the `ConversationStatus` enum already defined.
- If a `Customer` document is later linked (email/phone gathered mid-conversation), attach `customerId` to the existing session — do not create a new session.

---

## 6. RBAC (AdminUser roles)

Roles: `owner`, `admin`, `staff` (per `AdminRole` enum). Enforce with Nest guards + decorators, never with inline `if (user.role === ...)` checks scattered through controllers — that pattern drifts and becomes unauditable across many AI-generated PRs.

```typescript
// common/decorators/roles.decorator.ts
export const Roles = (...roles: AdminRole[]) => SetMetadata('roles', roles);

// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<AdminRole[]>('roles', context.getHandler());
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    return required.includes(user.role);
  }
}

// usage in a controller
@Roles(AdminRole.OWNER, AdminRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
deleteProduct(@Param('id') id: string) { ... }
```

**Tenant + role must both be checked, every time.** A `staff` user from Business A must never be able to act on Business B's data even if somehow holding a valid role. Build a combined guard (`TenantScopeGuard`) that checks `request.user.businessId === resource.businessId` in addition to `RolesGuard` — do not rely on role checking alone to imply tenant safety.

---

## 7. Error Handling

### 7.1 Exception hierarchy

Define domain exceptions, don't throw raw `Error` or generic `HttpException` from business logic:

```typescript
// common/exceptions/domain.exception.ts
export class DomainException extends HttpException {
  constructor(public readonly code: string, message: string, status: number) {
    super({ code, message }, status);
  }
}

export class ProductNotVerifiableException extends DomainException {
  constructor(productId: string) {
    super('PRODUCT_NOT_VERIFIABLE', `Product ${productId} failed live verification`, HttpStatus.CONFLICT);
  }
}
```

### 7.2 Global exception filter

One global filter catches everything, normalizes the response shape, and ensures nothing leaks internals in production:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const code = exception instanceof DomainException ? exception.code : 'INTERNAL_ERROR';

    // Log full detail internally, including correlationId
    logger.error({ correlationId: req.correlationId, exception });

    res.status(status).json({
      success: false,
      error: {
        code,
        message: status === 500 ? 'Something went wrong.' : exception.message,
        correlationId: req.correlationId,
      },
    });
  }
}
```

- **Every response uses the same envelope**: `{ success, data }` on success, `{ success: false, error }` on failure. No endpoint returns a bare array or bare object — this is what lets the Next.js frontend handle every API response with one shared client wrapper instead of per-endpoint parsing.
- **Never return a raw stack trace or Mongo error message to the client** in production. Log it server-side with the `correlationId`, return a generic message + the code to the client.
- Every request gets a `correlationId` (middleware, early in the pipeline) — attach it to logs, error responses, and pass it through to any background job triggered by that request, so a support investigation can trace one customer's action across services.

---

## 8. Validation

- All incoming data goes through a DTO with `class-validator` decorators. No controller method accepts a raw untyped body.
- Global `ValidationPipe` config:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // strips unknown properties
  forbidNonWhitelisted: true, // rejects requests containing unknown properties, rather than silently dropping them
  transform: true,
}));
```

- DTOs live next to the module that owns them (`products/dto/create-product.dto.ts`), and are re-exported from `packages/shared-types` if the frontend needs the same shape for a form.

---

## 9. NestJS Module Conventions

- One feature = one module. Do not add unrelated endpoints to an existing module because it's convenient — create a new module.
- Standard module internals:
```
/products
  products.module.ts
  products.controller.ts
  products.service.ts
  /dto
  /schemas        (if not already in shared schema package)
  products.service.spec.ts
```
- Cross-cutting concerns (guards, filters, interceptors, decorators, the correlation-id middleware) live in `/common`, imported by every module — never redefined per-module.
- Business logic lives in services, not controllers. Controllers only: validate via DTO, call a service method, return the result. If a controller method has more than ~10 lines of logic, that logic belongs in the service.

---

## 10. Next.js (Dashboard) Conventions

- App Router. Server Components by default; mark `'use client'` only where interactivity is actually required (forms, RTK-connected components).
- Auth token refresh: a `middleware.ts` at the root checks access-token expiry on protected routes and triggers a silent refresh call before the page renders, rather than letting a request hit the API with an expired token and handling the 401 reactively everywhere.
- API calls go through one shared client (`lib/api-client.ts`) that already knows the response envelope from Section 7 and unwraps `{ success, data }` / throws on `{ success: false, error }` — no component calls `fetch` directly against the API.
- RTK slices mirror server state for cart/session UI responsiveness, per the architecture doc (Section 8.1) — RTK is never the source of truth for anything that must survive a page refresh; that always comes from an API call on mount.

---

## 11. API Conventions

- REST, versioned: `/api/v1/...`. Breaking changes get a new version, not a mutated existing one.
- Pagination: cursor-based (`?cursor=&limit=`) for anything that can grow unbounded (products, conversations, events) — not offset-based, which degrades at scale.
- Resource naming: plural nouns, kebab-case for multi-word (`/agent-configs`, not `/agentConfig`).

---

## 12. Security Checklist (apply to every PR touching auth, data access, or external input)

- [ ] Every DB query scoped by `businessId` where the collection is tenant-owned
- [ ] No secrets, API keys, or tokens logged anywhere, including debug logs
- [ ] All encrypted-at-rest fields (`accessTokenEncrypted`, `emailEncrypted`, etc.) are actually encrypted at the application layer before write — Mongoose does not do this automatically
- [ ] New endpoints have a DTO with validation, not a raw body
- [ ] New endpoints have an explicit `@Roles(...)` + `RolesGuard` + `TenantScopeGuard`, or an explicit comment stating why they're public
- [ ] Error responses don't leak internals (Section 7.2)
- [ ] Rate limiting applied per-tenant, not just globally, on any new public-facing endpoint

---

## 13. Testing

- Unit tests (`*.spec.ts`) for every service method with business logic — mock Mongoose models and Redis, don't hit real infra.
- E2E tests (`*.e2e-spec.ts`) for auth flows specifically (login, refresh, rotation-on-theft, logout revocation) — these are the highest-risk area for silent regressions and must not rely on manual QA.
- Any bug fix to auth, RBAC, or tenant-scoping code requires a regression test in the same PR, not a follow-up ticket.

---

## 14. Git / PR Conventions

- Branch naming: `feature/`, `fix/`, `chore/` + short slug (`feature/agent-config-playbook`).
- Commit messages: conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- A PR touching auth, RBAC, or cookie/token handling must call this file out explicitly in the PR description and confirm which sections were followed — this makes drift from this document visible in review instead of silent.

---

## 15. Rules Specifically for AI Coding Assistants

- **Before writing any auth-related code, re-read Sections 2–6 of this file in full.** Do not infer auth patterns from surrounding code alone if it predates this file — this file is the source of truth going forward, and older code should be flagged for migration, not copied.
- **Never invent a fourth actor type or a new auth mechanism** to solve an edge case. If the three actors in Section 2 genuinely don't cover a new requirement, stop and flag it for a human decision rather than improvising a new token scheme.
- **Never put an access token in a cookie or localStorage.** If a task seems to require it, that's a signal the task is misunderstood — stop and ask, don't route around Section 3.4.
- **Never write a raw `if (role === 'admin')` check.** Use the guard/decorator pattern from Section 6, even for a one-off internal tool endpoint.
- **Never return an unwrapped object/array from a controller.** Use the response envelope from Section 7.2, even for trivial endpoints — consistency here is what lets the frontend's shared client work everywhere.
- **When two AI-generated PRs might touch the same guard, filter, or shared type, prefer extending the existing implementation over writing a parallel one.** Search `/common` and `/packages/shared-types` before creating a new decorator, guard, or DTO shape that might already exist under a slightly different name.
- **If asked to add a feature that would require loosening `secure`, `sameSite`, `whitelist`, or `forbidNonWhitelisted` from their defaults in this file, implement the feature without loosening them and flag the tension explicitly** rather than silently relaxing a security default to make a task easier.

---

## 16. ORA Design System — Color Rules

The ORA Merchant Dashboard uses a **centralized design-token system** defined exclusively in `client/app/globals.css`. All color values are global CSS custom properties consumed via Tailwind's `@theme inline` block. No component, page, or module may hardcode brand hex values.

### Selected Palette

Source: ORA Brand Color Palette (`#2E2910` / `#2C5745` / `#EBE3A7` / `#EB7D00`).

| Role | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Primary** | `#2C5745` | `#3d7a60` | Brand identity, buttons, active nav, CTAs, key metrics |
| **Primary Foreground** | `#EBE3A7` | `#EBE3A7` | Text on primary surfaces |
| **Secondary** | `#EB7D00` | `#EB7D00` | Secondary CTAs, supporting actions, highlights |
| **Secondary Foreground** | `#2E2910` | `#2E2910` | Text on secondary surfaces |
| **Brand Accent** | `#EBE3A7` | `#EBE3A7` | Warm ivory highlight, selected state badges |
| **Brand Deep** | `#2E2910` | `#2E2910` | Dark olive reference tone |

### Utility / Semantic Colors

| Semantic | Value (light) | Value (dark) | Meaning |
|---|---|---|---|
| **Success** (`--ora-success`) | `#2C5745` | `#3d7a60` | ORA Online, positive trend, completed |
| **Warning** (`--ora-warning`) | `#EB7D00` | `#EB7D00` | Needs attention, caution state |
| **Error** (`--ora-error`) | `#c0392b` | `#e05252` | System error, critical failure |
| **Info** (`--ora-info`) | `#009eb9` | `#4cd7f6` | Informational state, processing hint |

### Chart Palette

Charts across all pages (Overview, Sales, Conversations, Analytics, Reports) **must** use this series in order:

| Series | Token | Value (dark) | Role |
|---|---|---|---|
| 1 | `--chart-1` | `#3d7a60` | Primary metric |
| 2 | `--chart-2` | `#EB7D00` | Secondary metric |
| 3 | `--chart-3` | `#EBE3A7` | Tertiary / accent |
| 4 | `--chart-4` | `#4cd7f6` | Info / comparison |
| 5 | `--chart-5` | `#e05252` | Negative / error |
| 6 | `--chart-6` | `#8fa99a` | Background / muted |

Never assign ad-hoc colors to individual charts. Use `var(--chart-N)` or the Tailwind alias `bg-chart-N` / `text-chart-N`.

### Agent Status Colors

ORA is an AI sales agent — status must be immediately understandable. Always pair status colors with an icon or label (never color-only communication).

| State | Token | Dark Value | Meaning |
|---|---|---|---|
| Online | `--status-online` | `#3d7a60` | ORA active, selling |
| Active | `--status-active` | `#52b88a` | Live conversation in progress |
| Warning | `--status-warning` | `#EB7D00` | Needs merchant attention |
| Offline | `--status-offline` | `#8fa99a` | Agent paused / inactive |
| Error | `--status-error` | `#e05252` | System error |
| Processing | `--status-processing` | `#4cd7f6` | ORA thinking / loading |

### Background / Surface Foundation

The dark navy **Obsidian Intelligence** structural layer is preserved and must not be altered:

```
--background          #020617   Global page background
--surface-lowest      #010f1f   Sidebar, deepest surface
--surface-low         #0d1c2d   Nested panels
--surface-container   #122131   Cards, primary containers
--surface-high        #1c2b3c   Interactive surfaces
--surface-highest     #273647   Elevated elements
--surface-bright      #2c3a4c   Highlighted/focused surfaces
```

### Token Naming Convention

| Scope | Pattern | Example |
|---|---|---|
| Brand primary | `--primary`, `--primary-hover`, `--primary-active` | `var(--primary)` |
| Brand secondary | `--secondary`, `--secondary-hover`, `--secondary-active` | `var(--secondary)` |
| Semantic utility | `--ora-success`, `--ora-warning`, `--ora-error`, `--ora-info` | `var(--ora-success)` |
| Chart series | `--chart-1` through `--chart-6` | `var(--chart-2)` |
| Agent status | `--status-online`, `--status-active`, etc. | `var(--status-warning)` |
| Structural surface | `--surface-lowest` through `--surface-bright` | `var(--surface-container)` |

### Rules for AI Agents and Developers

1. **Never hardcode `#2C5745`, `#EB7D00`, `#EBE3A7`, or any brand color inside a component.** Use the CSS token or its Tailwind mapping (e.g., `bg-primary`, `text-secondary`).
2. **Never create a second theme system.** `client/app/globals.css` is the single source of truth. Do not add competing CSS variables in component files, page files, or separate theme configs.
3. **Reuse existing semantic tokens before creating new ones.** If a color need fits `--ora-success`, `--ora-warning`, `--ora-error`, or `--ora-info`, use those. Do not define one-off tokens per page.
4. **Charts must use the centralized chart palette** (`--chart-1` through `--chart-6`) in order. Do not pick arbitrary colors for individual charts.
5. **New dashboard pages inherit the color system automatically** through `globals.css` — no per-page color setup is needed or allowed.
6. **Accessibility:** The selected green (`#3d7a60`) on dark navy (`#020617`) meets WCAG AA for large text/UI elements. For body text, always use `--foreground` or `--on-surface` tokens, not raw primary green. Status indicators must be paired with icons or labels.
7. **Do not consolidate `--ora-success` and `--primary` even though they share a similar hue** — they serve distinct semantic roles. Success indicates outcome states; primary indicates brand action. Keep them separate.
8. **Light mode** uses warmer neutral surfaces (`#f8f7f0`, `#f0efe8`) derived from the ivory palette tone. Do not introduce cool-gray light-mode backgrounds.
