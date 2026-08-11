# ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)

This document governs how AI coding assistants (Antigravity, Cursor, Claude, Copilot, etc.) and human developers contribute to the **ORA** repository. It serves as the primary root entry point for repo-wide architecture, multi-actor domain boundaries, security rules, and agent workflows as established in [ORA-Final-Architecture.md (v5)](file:///home/nullpointer/Documents/work/hype_corporation/ORA/ORA-Final-Architecture.md).

---

## 📁 Package-Specific AGENTS Guidance

This repository is structured as a monorepo. In addition to this root document, each sub-package maintains dedicated guidelines that MUST be adhered to when working within those directories:

- 🎨 **Frontend Dashboard (`client/`):** Refer to [client/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/AGENTS.md) for Next.js 16+ standards, RSC patterns (`proxy.ts`), component structure, and server actions.
- ⚙️ **Backend API (`server/`):** Refer to [server/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/AGENTS.md) for NestJS conventions, MongoDB/Mongoose schemas, Redis session management, BullMQ billing/ingestion jobs, and RBAC/Plan guards.
- 🛠️ **Custom Agent Skills (`client/.agent/skills/`):** Preserved for local skill definitions (e.g., [nextjs-best-practices](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/.agent/skills/nextjs-best-practices/SKILL.md)).

---

## 1. Monorepo Architecture Overview

```
ORA/
├── AGENTS.md                  ← Cross-cutting rules, actor model & package index (this file)
├── ORA-Final-Architecture.md  ← Master System Architecture (v5)
├── pnpm-workspace.yaml        ← Monorepo workspace definition
├── docker-compose.yml         ← Local dev environment (MongoDB + Redis)
├── docker-compose.prod.yml    ← Production VPS dedicated container stack
├── client/                    ← Next.js 16+ Web Dashboard & Admin UI
│   ├── AGENTS.md              ← Frontend architecture & Next.js conventions
│   └── .agent/skills/         ← Custom agent skills directory
└── server/                    ← NestJS Backend API & Services
    └── AGENTS.md              ← Backend architecture, DB schemas & API conventions
```

### Shared Types & Packages Rule
- Never duplicate a type, interface, or enum across `client` and `server`. Shared DTOs, billing enums, and API envelopes belong in `packages/shared-types` (or shared modules), imported by both frontend and backend.

---

## 2. Actor Model & Authentication Taxonomy

There are **three distinct actor types** in ORA (v5 Architecture). Do not conflate their authentication or authorization flows:

| Actor | What it is | Auth Mechanism | Primary Context |
|---|---|---|---|
| **AdminUser** | A merchant owner/staff accessing the dashboard | JWT access token (memory) + Refresh token (httpOnly cookie) + Redis session. Recipient OTP for billing email verification (v5 Section 10.10). | Admin Dashboard (`client/`) & NestJS Admin Controllers |
| **Business (Tenant)** | The merchant account itself | Publishable Widget Key (`biz_live_xxxx` - public) for widget WebSocket connection; Encrypted API keys/secrets server-side (`Business.apiKeyHash`). | Public API, Voice Widget Gateway & Merchant Data Connectors |
| **Customer** | End-shopper interacting with the voice/chat widget | Ephemeral conversation session token (`Conversation.sessionId`) | Voice Widget runtime & Redis state |

> [!IMPORTANT]
> A `Customer` never has a password or a JWT identity. They are identified solely by conversation session tokens. Do not introduce password auth for customers.

---

## 3. Core Security & Scoping Baseline

1. **Strict Tenant Scoping:** Every database query involving tenant data MUST be filtered by `businessId`. All collections (`Product`, `Conversation`, `Order`, `Customer`, `Subscription`, `Invoice`, `Event`, etc.) share collections and are indexed by `businessId`.
2. **Publishable Key vs Secret Credentials (v5 Section 11.5):**
   - Publishable widget keys (`biz_live_xxxx`) are public and authorize WebSocket session initiation only.
   - Merchant platform secrets (Shopify OAuth, WooCommerce keys) are stored server-side encrypted at rest (AES-256).
3. **Dual Payment Provider Model (v5 Section 10):**
   - **Stripe:** International merchants (USD). Auto-renewing subscriptions & webhook listeners.
   - **bKash:** Bangladesh merchants (BDT). Tokenized Checkout agreement + active BullMQ renewal scheduler (`billing:bkash-renewal`).
4. **Response Standard:** All backend endpoints return standardized response envelopes (`{ success: true, data }` or `{ success: false, error: { code, message, correlationId } }`).
5. **Security Defaults:** Never loosen security defaults (`httpOnly`, `Secure`, `SameSite=Strict`, `whitelist: true`, `forbidNonWhitelisted: true`) without explicit human confirmation.

---

## 4. Authentication Mechanics — JWT + Session Hybrid (AdminUser)

### 4.1 Token Design
- **Access Token (JWT):** Configurable TTL via `JWT_EXPIRATION` in `.env` (default: 15-minute `15m`), returned in response body, held in memory on client (never in localStorage or cookies). Contains `sub` (AdminUser ID), `businessId`, `role`, `sessionId`.
- **Refresh Token:** 7-day TTL, rotating, stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie. Hashed before storing in Redis (`session:{sessionId}`).

### 4.2 Refresh Rotation & Theft Detection
- Every refresh call issues a **new** refresh token and invalidates the old one.
- If a refresh token is presented that does not match the current hash in Redis for that `sessionId`, treat it as **token theft** — revoke the entire session family immediately and require re-login.

### 4.3 Session Revocation
- Logout deletes the Redis session record (`session:{sessionId}`). A logout that only clears client state leaves sessions vulnerable — always revoke server-side.

---

## 5. Error Handling & Validation Standards

### 5.1 Exception Hierarchy
- Use custom `DomainException` extending NestJS `HttpException`. Do not throw raw untyped `Error` objects from business services.

### 5.2 Global Exception Filter & Envelope Unwrapping
- `AllExceptionsFilter` catches all thrown exceptions and formats them into the standard error envelope:
  `{ success: false, error: { code, message, correlationId } }`.
- Every request carries a `correlationId` (middleware generated) attached to logs and error responses.

### 5.3 Global ValidationPipe
- Configured globally with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. All controller parameters must be validated using `class-validator` DTOs.

---

## 6. Security Checklist for PRs & AI Assistants

- [ ] Every DB query involving tenant data filters by `businessId`.
- [ ] No secrets, API keys, or tokens logged anywhere.
- [ ] Field-level PII (`emailEncrypted`, `phoneEncrypted`) encrypted using AES-256 before storage.
- [ ] New endpoints carry explicit `@Roles(...)` + `RolesGuard` + `TenantScopeGuard`, or explicit public annotation.
- [ ] Error responses never leak raw Mongo errors or stack traces to clients in production.

---

## 7. Git & PR Conventions

- **Branch Naming:** `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- **Commits:** Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- **PR Audit:** Any PR modifying auth, RBAC, billing, tenant isolation, or security logic must explicitly link the relevant section of `AGENTS.md` or `ORA-Final-Architecture.md` in the PR description.

---

## 8. Rules for AI Coding Assistants

1. **Scope Awareness:** Check package-specific guidelines ([client/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/AGENTS.md) / [server/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/AGENTS.md)) before writing package code.
2. **Never Guess Schemas or API Contracts:** Always inspect existing code, schemas in `ORA-Final-Architecture.md` (v5), and types before generating new functions or endpoints.
3. **Verification Obligation:** Never declare a task complete without running tests or build commands (`pnpm build`, `pnpm test`).

---

## 9. ORA Design System — Color Rules

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

### Rules for UI Components
1. **Never hardcode `#2C5745`, `#EB7D00`, `#EBE3A7`, or any brand color inside a component.** Use the CSS token or its Tailwind mapping (e.g., `bg-primary`, `text-secondary`).
2. **Never create a second theme system.** `client/app/globals.css` is the single source of truth.
