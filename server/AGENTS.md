# Server Engineering Standards & AI Coding Rules (`server/`)

This document governs backend development in the `server/` package (NestJS Backend API). All AI coding assistants and developers MUST follow these guidelines.

---

## 1. Tech Stack & Module Conventions

- **Framework:** NestJS (TypeScript), MongoDB (Mongoose), Redis, BullMQ.
- **Module Structure:** One feature = one module (e.g., `products/`, `auth/`, `conversations/`).
  ```
  src/products/
  ├── products.module.ts
  ├── products.controller.ts
  ├── products.service.ts
  ├── dto/
  │   ├── create-product.dto.ts
  │   └── update-product.dto.ts
  └── products.service.spec.ts
  ```
- **Cross-Cutting Concerns:** Place shared guards, filters, interceptors, decorators, and correlation-id middleware in `src/common/`. Never duplicate cross-cutting logic per module.
- **Business Logic Boundary:** Controllers ONLY validate via DTOs, delegate to services, and return results. If a controller method exceeds ~10 lines, move logic into the service layer.

---

## 2. Actor Model & Auth Mechanisms

### 2.1 AdminUser Authentication (Dashboard)
- **Access Token (JWT):** 15-minute lifetime. Returned in response body, stored in client memory (never localStorage or cookies). Contains `sub` (adminUserId), `businessId`, `role`, `sessionId`.
- **Refresh Token:** 7-day lifetime. Rotating token stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie (`/api/auth/refresh`).
- **Redis Session:** Keyed by `session:{sessionId}` containing `{ adminUserId, businessId, refreshTokenHash, userAgent, ip }`.
- **Token Rotation & Theft Detection:** Every refresh call invalidates the old token and issues a new one. If a token mismatch occurs for a `sessionId`, revoke the entire session immediately in Redis.
- **Server-Side Revocation:** Logout MUST delete the session from Redis. Never rely on client cookie deletion alone.

### 2.2 Tenant (Business) API Key Auth
- Public/Widget APIs authenticate via API Key.
- Keys are hashed (`Business.apiKeyHash`) — raw keys are never stored or logged server-side after generation.
- Gateway validates keys and attaches `businessId` to request context.
- **Tenant Scoping Requirement:** Every Mongo, Redis, or Vector DB query MUST filter by `businessId`. No service should query tenant-owned collections without a `businessId` filter.

### 2.3 Customer Voice Widget Sessions
- Widget requests receive a short-lived conversation session token mapping to `Conversation.sessionId`.
- Session state resides in Redis. On 10-second idle timeout, mark session suspended — **do not delete context**. Full deletion occurs on explicit `ended` status or TTL expiration.

---

## 3. RBAC (Role-Based Access Control)

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

## 4. Error Handling & Exception Envelopes

### 4.1 Domain Exceptions
Define domain-specific exceptions extending `DomainException` rather than throwing generic `HttpException`:
```typescript
export class DomainException extends HttpException {
  constructor(public readonly code: string, message: string, status: number) {
    super({ code, message }, status);
  }
}
```

### 4.2 Global Exception Filter & Envelope Standard
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
- A correlation-id middleware assigns `correlationId` to every request. Log full internal traces with `correlationId` server-side, but never expose raw stack traces or DB error details to clients in production.

---

## 5. Input Validation

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

## 6. API Conventions & Pagination

- **Versioning:** Standard REST endpoints under `/api/v1/...`.
- **Naming:** Plural kebab-case resources (e.g., `/api/v1/agent-configs`).
- **Pagination:** Cursor-based pagination (`?cursor=&limit=`) for unbounded collections (products, conversations, logs).

---

## 7. Testing Requirements

- **Unit Tests (`*.spec.ts`):** Mandatory for all services with business logic. Mock Mongoose models and Redis calls.
- **E2E Tests (`*.e2e-spec.ts`):** Mandatory for authentication, token refresh, token theft rotation, and RBAC guards.
- Any bug fix involving auth, tenant scoping, or guards requires a regression test in the same pull request.
