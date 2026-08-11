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

1. **Strict Tenant Scoping:** Every database query involving tenant data MUST be filtered by `businessId`. All collections (`Product`, `Conversation`, `Order`, `Customer`, `Subscription`, `Invoice`, etc.) share collections and are indexed by `businessId`.
2. **Publishable Key vs Secret Credentials (v5 Section 11.5):**
   - Publishable widget keys (`biz_live_xxxx`) are public and authorize WebSocket session initiation only.
   - Merchant platform secrets (Shopify OAuth, WooCommerce keys) are stored server-side encrypted at rest (AES-256).
3. **Dual Payment Provider Model (v5 Section 10):**
   - **Stripe:** International merchants (USD). Auto-renewing subscriptions & webhook listeners.
   - **bKash:** Bangladesh merchants (BDT). Tokenized Checkout agreement + active BullMQ renewal scheduler (`billing:bkash-renewal`).
4. **Response Standard:** All backend endpoints return standardized response envelopes (`{ success: true, data }` or `{ success: false, error: { code, message, correlationId } }`).
5. **Security Defaults:** Never loosen security defaults (`httpOnly`, `Secure`, `SameSite=Strict`, `whitelist: true`, `forbidNonWhitelisted: true`) without explicit human confirmation.

---

## 4. Git & PR Conventions

- **Branch Naming:** `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- **Commits:** Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- **PR Audit:** Any PR modifying auth, RBAC, billing, tenant isolation, or security logic must explicitly link the relevant section of `AGENTS.md` or `ORA-Final-Architecture.md` in the PR description.

---

## 5. Rules for AI Coding Assistants

1. **Scope Awareness:** Check package-specific guidelines ([client/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/AGENTS.md) / [server/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/AGENTS.md)) before writing package code.
2. **Never Guess Schemas or API Contracts:** Always inspect existing code, schemas in `ORA-Final-Architecture.md` (v5), and types before generating new functions or endpoints.
3. **Verification Obligation:** Never declare a task complete without running tests or build commands (`pnpm build`, `pnpm test`).
