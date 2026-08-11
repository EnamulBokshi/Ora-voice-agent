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

### Unit Testing & Compilation Verification
- **Build Status**: Passed (`nest build`)
- **Unit Test Suites**: 5 passed (8 tests) (`auth.service.spec.ts`, `auth.controller.spec.ts`, `users.service.spec.ts`, `users.controller.spec.ts`, `app.controller.spec.ts`).

---

## 🟡 Next Planned Phases

- [ ] **Phase 2: Product Catalog & Context Feeding Service** (`server/src/products`, `server/src/knowledge`)
- [ ] **Phase 3: RAG & Vector Store Pipeline** (`server/src/rag`)
- [ ] **Phase 4: Customer & Voice/Chat Conversation Gateway** (`server/src/gateway`, `server/src/conversations`)
- [ ] **Phase 5: Dual Payment Billing & Invoicing Engine** (`server/src/billing`, `server/src/invoices`)
- [ ] **Phase 6: Admin Dashboard UI Integration** (`client/`)
