# ORA — Monorepo Agent Rules & Engineering Workflow

This document governs how AI coding assistants (Antigravity, Cursor, Claude, Copilot, etc.) and human developers contribute to the **ORA** repository. It serves as the primary root entry point for repo-wide architecture, multi-actor domain boundaries, security rules, and agent workflows.

---

## 📁 Package-Specific AGENTS Guidance

This repository is structured as a monorepo. In addition to this root document, each sub-package maintains dedicated guidelines that MUST be adhered to when working within those directories:

- 🎨 **Frontend Dashboard (`client/`):** Refer to [client/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/AGENTS.md) for Next.js 16+ standards, RSC patterns, component structure, and server actions.
- ⚙️ **Backend API (`server/`):** Refer to [server/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/AGENTS.md) for NestJS conventions, MongoDB/Mongoose schemas, Redis session management, and RBAC guards.
- 🛠️ **Custom Agent Skills (`client/.agent/skills/`):** Preserved for local skill definitions (e.g., [my-custom-skill](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/.agent/skills/my-custom-skill/SKILL.md)).

---

## 1. Monorepo Architecture Overview

```
ORA/
├── AGENTS.md                  ← Cross-cutting rules, actor model & package index (this file)
├── pnpm-workspace.yaml        ← Monorepo workspace definition
├── client/                    ← Next.js 16+ Web Dashboard & Admin UI
│   ├── AGENTS.md              ← Frontend architecture & Next.js conventions
│   └── .agent/skills/         ← Custom agent skills directory
└── server/                    ← NestJS Backend API & Services
    └── AGENTS.md              ← Backend architecture, DB schemas & API conventions
```

### Shared Types & Packages Rule
- Never duplicate a type, interface, or enum across `client` and `server`. Shared DTOs and enums belong in `packages/shared-types` (or shared modules), imported by both frontend and backend.

---

## 2. Actor Model (Cross-Cutting Domain Context)

There are **three distinct actor types** in ORA. Do not conflate their authentication or authorization flows.

| Actor | What it is | Auth Mechanism | Primary Context |
|---|---|---|---|
| **AdminUser** | A merchant owner/staff accessing the dashboard | JWT access token (memory) + Refresh token (httpOnly cookie) + Redis session | Admin Dashboard (`client/`) & NestJS Admin Controllers |
| **Business (Tenant)** | The merchant account itself | API key (hashed, `Business.apiKeyHash`) | Public API & Voice Widget Gateway |
| **Customer** | End-shopper interacting with the voice/chat widget | Ephemeral conversation session token (`Conversation.sessionId`) | Voice Widget runtime & Redis state |

> [!IMPORTANT]
> A `Customer` never has a password or a JWT identity. They are identified solely by conversation session tokens. Do not introduce password auth for customers unless explicitly instructed.

---

## 3. Core Security & Scoping Baseline

1. **Strict Tenant Scoping:** Every database query involving tenant data MUST be filtered by `businessId`. Never query `Product`, `Conversation`, `Order`, or `Customer` without explicit tenant filtering.
2. **Secret & Key Protection:** Raw API keys or session tokens must never be stored unhashed or logged in output.
3. **Response Standard:** All backend endpoints return standardized response envelopes (`{ success: true, data }` or `{ success: false, error }`). The frontend relies on this single envelope structure.
4. **Security Defaults:** Never loosen security defaults (`httpOnly`, `Secure`, `SameSite=Strict`, `whitelist: true`, `forbidNonWhitelisted: true`) without explicit human confirmation.

---

## 4. Git & PR Conventions

- **Branch Naming:** `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- **Commits:** Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- **PR Audit:** Any PR modifying auth, RBAC, tenant isolation, or security logic must explicitly link the relevant section of `AGENTS.md` in the PR description.

---

## 5. Rules for AI Coding Assistants

1. **Scope Awareness:** Check package-specific guidelines ([client/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/client/AGENTS.md) / [server/AGENTS.md](file:///home/nullpointer/Documents/work/hype_corporation/ORA/server/AGENTS.md)) before writing package code.
2. **Never Guess Schemas or API Contracts:** Always inspect existing code, schemas, and types before generating new functions or endpoints.
3. **Verification Obligation:** Never declare a task complete without running tests or build commands (`pnpm build`, `pnpm test`).
