# ORA — Voice-First AI Sales Agent

> **Multi-tenant, voice-first sales agent delivered as a single `<script>` embed.** ORA behaves like a human salesperson: it knows a merchant's catalog, understands store policy, remembers what the customer said, and can act — search, compare, add to cart, place an order — not just answer questions.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started (Local Dev)](#getting-started-local-dev)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)
- [Widget Embed](#widget-embed)
- [Billing & Plans](#billing--plans)
- [Actor Model & Auth](#actor-model--auth)
- [API Reference](#api-reference)
- [Design System](#design-system)

---

## Overview

ORA is a SaaS platform that lets merchants embed a real-time AI voice/chat agent on any storefront. The agent integrates with the merchant's product catalog and can carry out full commerce transactions — not just surface product information.

**Key capabilities:**
- 🎙️ **Real-time voice** via Google Gemini Live API (bidirectional audio streaming)
- 🛍️ **Full commerce actions** — search, compare, add to cart, place orders
- 🏪 **Multi-platform connectors** — Shopify (native), WooCommerce, BigCommerce, Magento, manual feeds
- 🧠 **RAG-powered catalog** — vector-search product retrieval with live-verification fallback
- 💳 **Dual billing** — Stripe (international / USD) + bKash (Bangladesh / BDT)
- 🔒 **Strict multi-tenancy** — every query scoped to `businessId`; AES-256 encrypted credentials

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Merchant's Storefront                        │
│   <script> loader  →  Shadow DOM Widget  →  WebSocket Gateway  │
└───────────────────────────────┬─────────────────────────────────┘
                                │  wss://
┌───────────────────────────────▼─────────────────────────────────┐
│                   NestJS Backend (ora-server)                   │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐    │
│  │  Gateway /  │  │ Conversation│  │  Agent / Tool        │    │
│  │  WS Proxy   │  │   Service   │  │  Orchestration       │    │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘    │
│         │                │                     │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────▼───────────┐    │
│  │  Auth &     │  │ RAG Service │  │ Ingestion / BullMQ   │    │
│  │  RBAC       │  │ (Embeddings)│  │ (Webhook + Feed sync) │   │
│  └─────────────┘  └─────────────┘  └──────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            Data Layer                                   │    │
│  │  MongoDB (tenant-scoped)   Redis (sessions, BullMQ)    │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│               Next.js 16+ Dashboard (ora-client)                 │
│   Merchant dashboard · SuperAdmin command center · Shopify app   │
└──────────────────────────────────────────────────────────────────┘
```

**Query-time product resolution** (same path for voice and text):
1. Customer query → Vector search (top 5 candidates, `businessId`-filtered)
2. Zero/low-confidence → local MongoDB keyword fallback, then live merchant API fallback
3. Batch live-verify price/stock against merchant's tier connector
4. Filter, rank, respond

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 11+ (TypeScript), Mongoose, BullMQ |
| **Frontend** | Next.js 16+ (App Router, RSC, Turbopack), Tailwind CSS, shadcn/ui |
| **Database** | MongoDB 7.0 (shared collections, tenant-scoped by `businessId`) |
| **Cache / Queue** | Redis 7 + BullMQ |
| **AI / Voice** | Google Gemini Live API (bidirectional audio), `text-embedding-004` |
| **Payments** | Stripe (international/USD), bKash Tokenized Checkout (BDT) |
| **Auth** | JWT (memory) + Rotating refresh tokens (httpOnly cookie) + Redis sessions |
| **Deployment** | Docker Compose, Caddy reverse proxy, Contabo VPS |
| **Package manager** | pnpm workspaces |

---

## Monorepo Structure

```
ORA/
├── client/                    # Next.js 16+ merchant dashboard & admin UI
│   ├── app/
│   │   ├── (marketing)/       # Public landing page (Stitch "Lumina" theme)
│   │   ├── (dashboard)/       # Authenticated merchant dashboard
│   │   ├── admin/             # SuperAdmin command center
│   │   └── shopify/           # Shopify embedded app routes
│   ├── components/            # Shared UI components
│   ├── services/              # API client & data services
│   ├── actions/               # Next.js Server Actions
│   └── Dockerfile
│
├── server/                    # NestJS backend API & voice proxy
│   ├── src/
│   │   ├── auth/              # JWT auth, session management
│   │   ├── ai-voice/          # Gemini Live WebSocket proxy
│   │   ├── rag/               # Vector search & retrieval
│   │   ├── ingestion/         # Webhook & feed sync workers
│   │   ├── billing/           # Stripe + bKash providers
│   │   ├── conversations/     # Session & conversation management
│   │   ├── products/          # Catalog & inventory
│   │   ├── shopify/           # Shopify OAuth & webhooks
│   │   ├── admin/             # SuperAdmin endpoints
│   │   └── vector/            # Embedding service & vector store
│   └── Dockerfile
│
├── packages/
│   └── shopify-app/           # Shopify embedded app package
│
├── deploy/
│   ├── nginx/ora.conf         # Nginx reverse proxy config
│   └── caddy/Caddyfile        # Caddy reverse proxy config (active on VPS)
│
├── docker-compose.yml         # Local development stack
├── docker-compose.prod.yml    # Production container stack
├── deploy.sh                  # One-shot production deploy script
└── pnpm-workspace.yaml
```

---

## Getting Started (Local Dev)

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker & Docker Compose

### 1. Clone & install

```bash
git clone <repo-url> ora
cd ora
pnpm install
```

### 2. Start infrastructure (MongoDB + Redis)

```bash
docker compose up -d ora-mongodb ora-redis
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set GEMINI_API_KEY at minimum for voice to work
```

### 4. Run dev servers

```bash
# Terminal 1 — Backend (NestJS)
cd server && pnpm start:dev

# Terminal 2 — Frontend (Next.js)
cd client && pnpm dev
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Backend API | http://localhost:5000/api/v1 |
| API Health | http://localhost:5000/api/v1/health |

### 5. Seed SuperAdmin

```bash
cd server && pnpm seed:admin
```

Default SuperAdmin: `ora.admin@tryora.live` (password from `ADMIN_PASSWORD` in `.env`)

---

## Environment Variables

A full `.env.example` is at the repo root. Key variables:

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key for voice + embeddings | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | 32+ char secret for JWT signing | ✅ |
| `ENCRYPTION_SECRET` | Exactly 32 bytes for AES-256 field encryption | ✅ |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | SuperAdmin credentials to seed | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret for international billing | For billing |
| `BKASH_APP_KEY` / `BKASH_APP_SECRET` | bKash credentials for BDT billing | For billing |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Shopify partner app credentials | For Shopify |
| `RESEND_API_KEY` | Transactional email (OTP, invoices) | For email |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL baked into the client build | Prod only |
| `NEXT_PUBLIC_API_URL` | API base path for the client (default: `/api/v1`) | Prod only |

---

## Production Deployment

The VPS uses **Caddy** as the reverse proxy with automatic HTTPS.

### One-shot deploy (rsync + build + restart)

```bash
./deploy.sh
```

This script:
1. rsyncs the codebase to the VPS at `/root/ora/` (excludes `.env`, `node_modules`, `.next`, etc.)
2. Copies the Caddy config to `/etc/caddy/sites/`
3. Runs `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`
4. Seeds the SuperAdmin

### Production port map

| Container | Internal | Host (localhost only) |
|---|---|---|
| `ora-mongodb` | 27017 | 127.0.0.1:**27018** |
| `ora-redis` | 6379 | 127.0.0.1:**6380** |
| `ora-server` | 5000 | 127.0.0.1:**4000** |
| `ora-client` | 3000 | 127.0.0.1:**4080** |

Caddy proxies all public traffic:

| Path | Upstream |
|---|---|
| `/api/*`, `/ws/*`, `/socket.io/*` | `ora-server` (:4000) |
| `/shopify/*` | `ora-client` (:4080) with Shopify frame headers |
| `/*` | `ora-client` (:4080) |

### Useful container commands

```bash
# View all container statuses
docker compose -f docker-compose.prod.yml ps

# Tail backend logs
docker compose -f docker-compose.prod.yml logs -f ora-server

# Tail frontend logs
docker compose -f docker-compose.prod.yml logs -f ora-client

# Re-seed SuperAdmin
docker compose -f docker-compose.prod.yml exec ora-server node dist/scripts/seed-admin.js

# Rebuild only the frontend (e.g. after env change)
docker compose -f docker-compose.prod.yml build ora-client && \
  docker compose -f docker-compose.prod.yml up -d --no-deps ora-client
```

> **Note on `NEXT_PUBLIC_WS_URL`:** This is baked into the Next.js bundle at build time. After changing it in `.env`, you must rebuild `ora-client`. If you remove it entirely, the client will auto-derive the WebSocket URL from `window.location.host`, making the build host-agnostic.

---

## Widget Embed

Merchants add ORA to any storefront with a two-line snippet:

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

- **Publishable key** (`biz_live_xxxx`) is public and safe to embed — it only authorizes WebSocket session initiation
- Widget mounts inside a **Shadow DOM** to prevent host page CSS pollution
- Voice/chat state is session-scoped and stored server-side in Redis

---

## Billing & Plans

| Plan | USD/mo | BDT/mo | Voice minutes | Orders/mo | Stores | Seats |
|---|---|---|---|---|---|---|
| **Free** | $0 | ৳0 | 100 min | 20 | 1 | 1 |
| **Growth** | $49 | ৳5,500 | 2,000 min | 500 | 3 | 5 |
| **Scale** | $199 | ৳22,000 | Unlimited | Unlimited | Unlimited | Unlimited |

**Stripe** handles international merchants (auto-renewing subscriptions + webhooks).  
**bKash** handles Bangladesh merchants (Tokenized Checkout agreement + active BullMQ renewal scheduler — bKash has no native subscription primitive).

---

## Actor Model & Auth

ORA has four distinct actor types — do not conflate their auth flows:

| Actor | Auth Mechanism | Context |
|---|---|---|
| **SuperAdmin** | JWT (memory) + Rotating refresh token (httpOnly cookie) + Redis session (`role: super_admin`) | `/admin/*` |
| **AdminUser** | JWT (memory) + Rotating refresh token (httpOnly cookie) + Redis session (`role: owner/admin/staff`) | `/dashboard/*` |
| **Business (Tenant)** | Publishable Widget Key (`biz_live_xxxx`) for widget; AES-256 encrypted platform secrets server-side | Widget gateway |
| **Customer** | Ephemeral `Conversation.sessionId` only — never a password or JWT | Voice/chat widget |

**Token lifecycle:**
- Access token: 15-minute TTL, returned in response body, stored in client memory only
- Refresh token: 7-day TTL, rotating, `httpOnly Secure SameSite=Strict` cookie
- On refresh token mismatch → theft detected → entire session revoked immediately

---

## API Reference

Base URL: `https://tryora.live/api/v1`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | Public | Service health check |
| `/auth/login` | POST | Public | AdminUser login |
| `/auth/refresh` | POST | Cookie | Rotate refresh token |
| `/auth/logout` | POST | JWT | Revoke session |
| `/products` | GET/POST | JWT + Tenant | Merchant catalog CRUD |
| `/conversations` | GET | JWT + Tenant | Conversation history |
| `/billing/plans` | GET | JWT | Available plans |
| `/billing/subscribe` | POST | JWT | Create subscription |
| `/admin/stats` | GET | SuperAdmin | Platform-wide metrics |
| `/admin/businesses` | GET | SuperAdmin | Merchant directory |
| `/admin/system/health` | GET | SuperAdmin | Infrastructure diagnostics |
| `/ws/voice` | WS | Publishable key | Voice session proxy |

All responses follow the standard envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "correlationId": "..." } }
```

---

## Design System

ORA uses a centralized design token system defined in `client/app/globals.css`.

**Key palette (dark mode):**

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#C8F031` (Lime) | Buttons, active nav, CTAs |
| `--background` | `#000000` | Page background |
| `--card` | `#111111` | Card surfaces |
| `--status-online` | `#C8F031` | ORA active indicator |

The public landing page uses a separate scoped system under `.lp-root` with `--lp-*` prefixed tokens — never imported into dashboard layouts.

> See `AGENTS.md` for the full color table, chart palette, and component rules.

---

## Further Reading

- [`ORA-Final-Architecture.md`](./ORA-Final-Architecture.md) — Full system architecture (v6)
- [`AGENTS.md`](./AGENTS.md) — Cross-cutting agent & developer rules
- [`client/AGENTS.md`](./client/AGENTS.md) — Next.js conventions & frontend rules
- [`server/AGENTS.md`](./server/AGENTS.md) — NestJS conventions & backend rules

