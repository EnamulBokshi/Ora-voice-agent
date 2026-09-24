# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It covers what exists, how to run and verify it, and where the documented rules diverge from the code.

**Engineering rules live elsewhere and are authoritative.** Read them before writing code; do not rely on this file for conventions.

| Scope | Read this |
|---|---|
| Repo-wide rules, actor model, security baseline, design tokens | `AGENTS.md` |
| Backend conventions, RBAC, billing, envelopes | `server/AGENTS.md` |
| Frontend conventions, RSC rules, widget embed | `client/AGENTS.md` |
| System architecture (v5/v6) | `ORA-Final-Architecture.md` |
| Implementation status tracker | `build-state.md` |
| Voice AI Engine, Audio Streaming & Interrupts | `.agents/skills/voice-ai-engine-development/` |

## What ORA is

A multi-tenant voice AI sales agent for e-commerce merchants. A merchant connects their store catalog, embeds a widget script, and end-shoppers talk to a Gemini Live voice agent that answers from that merchant's products and knowledge base via RAG.

Four actor types, deliberately distinct — see `AGENTS.md` section 2 before touching any auth path: SuperAdmin, AdminUser (merchant staff), Business (tenant, holds keys), Customer (end-shopper, session token only, never a password).

## Layout

pnpm workspace. `pnpm-workspace.yaml` globs `client`, `server`, `packages/*`. There is **no root `package.json`**.

```
ORA/
├── client/                 Next.js 16 dashboard, admin console, marketing site
├── server/                 NestJS API, feature modules under src/
├── packages/shopify-app/   Shopify CLI app config + theme extension (ora-voice-widget)
├── docs/                   Integration guides and analyses
├── graphify-out/           Generated code-graph reports (see below)
├── deploy/ docker-compose*.yml
├── AGENTS.md  ORA-Final-Architecture.md  build-state.md
```

### Server modules (`server/src/`)

`admin agent-config ai-voice api-access auth billing common conversations customers dashboard events gateway ingestion invoices knowledge live-desk mail notifications orders products rag shopify usage users vector`

Load-bearing pieces worth knowing before editing:

- `main.ts` — `rawBody: true`, global prefix `api/v1`, global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, global `TransformInterceptor` and `AllExceptionsFilter`, then a raw `ws` server attached at `/ws/voice` after Nest binds. CORS is `origin: true` with `credentials: false` on purpose (the widget runs on arbitrary merchant domains; the dashboard and Shopify embedded app are same-origin via nginx). Never make both permissive at once.
- `auth/strategies/jwt.strategy.ts` — every JWT requires a live Redis session keyed by `sessionId`. Any new login path must create that session or its tokens are inert.
- `common/guards/` — `jwt-auth`, `tenant-scope`, `roles`, `api-key` (publishable key), `dual-auth`, `plan-limit`, `optional-jwt-auth`.
- `common/utils/` — `encryption.util.ts`, `business-credentials.util.ts` (read encrypted connector credentials through this, never the raw field), `api-key.util.ts`, `pii-redactor.util.ts`.
- `ingestion/` — four catalog connector tiers: Shopify, WooCommerce, feed, sitemap crawl, manual endpoint. One shared webhook route at `POST /api/v1/ingestion/webhooks/shopify` handles HMAC verification, 24-hour Redis dedupe, and tenant resolution from the signed shop domain only.
- `shopify/` — the Shopify app integration (install/provisioning, staff roles, storefront key, GDPR compliance webhooks) plus a BullMQ `ShopifySyncProcessor` for catalog sync. `shopify.constants.ts` holds `SHOPIFY_API_VERSION`, shared by this module, the ingestion connector, and the Shopify billing provider. Bump it there, not per call site.
- `billing/providers/` — `payment-provider.interface.ts` with `stripe.provider.ts`, `bkash.provider.ts`, and `shopify.provider.ts`. Add new providers here, not in feature modules.

### Client (`client/`)

Next.js 16, React 19, Tailwind 4, shadcn, `@base-ui/react`. Route groups: `app/(marketing)`, `app/(dashboard)`, `app/admin`, plus `app/auth`, `app/verify-otp`, `app/reset-password`.

`proxy.ts` at the package root replaces `middleware.ts` (deprecated in Next 16) — see `client/AGENTS.md`. `lib/api-client.ts` unwraps the backend response envelope; components must not `fetch` the API directly. Widget source lives at `client/widget-src/widget.js`; `pnpm --filter client widget:build` (run automatically by the `predev`/`prebuild` hooks) emits the content-hashed bundle into `client/public/widget/v2/` and rewrites `client/public/widget/latest.json`. Edit the source, never the generated bundle.

## Commands

There is no root `package.json`, so **root-level `pnpm build` / `pnpm test` fail** with `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`. Always target a workspace with `--filter`.

```bash
# Server
pnpm --filter server start:dev      # watch mode
pnpm --filter server build
pnpm --filter server test           # append a pattern, e.g. `test shopify`
pnpm --filter server test -- src/shopify/shopify.service.spec.ts   # single file
pnpm --filter server test -- -t "test name"                          # single test by name
pnpm --filter server test:cov
pnpm --filter server test:e2e       # test/jest-e2e.json
pnpm --filter server lint

# Client
pnpm --filter client dev
pnpm --filter client build
pnpm --filter client typecheck
pnpm --filter client lint

# Local infra (MongoDB + Redis)
docker compose up -d

# Seeds and migrations
pnpm --filter server seed:admin
pnpm --filter server seed:dev-store
pnpm --filter server migrate:hash-keys
pnpm --filter server migrate:archetype-profiles
pnpm --filter server shopify:queue-sync
pnpm --filter server shopify:backfill-domain

# Shopify app (Shopify CLI v4 via npx)
pnpm --filter shopify-app shopify:dev
pnpm --filter shopify-app shopify:deploy
```

Server Jest config is inline in `server/package.json` (`rootDir: src`, `ts-jest`); specs sit next to the code as `*.spec.ts`.

## Verified baseline

- `pnpm --filter client typecheck` — clean at `e69145a`.
- `pnpm --filter server test` — last green count (43 suites, 224 tests) was at `25f217d`; the `shopify/` module and its specs came later, so that count is stale. Passing runs print `ERROR` lines from `AuthService`, `ShopifyConnectorService`, and `WooCommerceConnectorService`; these are deliberate negative-path assertions, not failures. If Jest reports `Module ts-jest in the transform option was not found`, `server/node_modules` is incomplete — run `pnpm install` first.

Re-measure rather than trusting these numbers if the tree has moved on.

## Documented-versus-actual drift

Each item below is a place where a rules document describes something the code does not do. Do not "fix" the code to match the doc without asking — some of these are aspirational roadmap, not regressions.

- `AGENTS.md` section 8 instructs agents to verify with `pnpm build` and `pnpm test`. Both fail at the repo root. Use the `--filter` forms above.
- `AGENTS.md` names `packages/shared-types` as the home for shared types. Only `packages/shopify-app` exists; types are currently duplicated between `client/types/` and server DTOs.
- `client/AGENTS.md` section 6 describes RTK for client state. Redux Toolkit is not a dependency of `client/package.json`.
- `client/AGENTS.md` section 4 requires Server Actions in `actions/`. That directory does not exist; data access goes through `services/` and `lib/api-client.ts`.
- `server/AGENTS.md` section 3.4 specifies invoice PDFs stored in S3. No AWS SDK dependency is installed.
- `AGENTS.md` links to `client/AGENTS.md` and `server/AGENTS.md` with absolute `file:///home/nullpointer/...` paths from another machine. Use the repo-relative files.

## Credentials model

Three distinct key types. Confusing them is the most common source of auth bugs here.

| Key | Format | Lives | Grants |
|---|---|---|---|
| Publishable | `biz_live_<24 hex>` | Merchant storefront, public | Widget WebSocket session and telemetry only. Rejected by every REST endpoint. |
| Secret API key | `ora_sk_live_<32 hex>` | Merchant's own backend `.env` | Full CRUD on products and catalog. |
| OAuth machine token | Bearer, 15-minute | Partner integrations | Scoped; see `docs/machine-api-developer-guide.md`. |

The secret key is stored as a SHA-256 hash (`Business.secretApiKeyHash`) and its plaintext is returned exactly once, from `POST /api/v1/business/secret-key`. `Business.secretApiKey` is a deprecated plaintext column kept only for one-time migration. Connector credentials (`shopifyAccessToken`, `woocommerceConsumerSecret`, `woocommerceWebhookSecret`) are encrypted at rest.

Full API surface: `docs/shopify-store-api-guide.md`, `docs/machine-api-developer-guide.md`, `docs/api-documentation.md`.

## Using the code graph

`graphify-out/` holds generated graph reports — `GRAPH_REPORT.md` for community hubs and navigation, `graph.json` for the full node and edge set, dated subdirectories for history.

Check freshness first. The report header gives its build date; compare it against `git log -1` and treat it as a map of where things live, not as truth about current file contents. `graphify update .` refreshes it at no API cost.

Use it to locate a subsystem quickly, then read the actual files before making claims about behavior.

## Working notes

- Tenant scoping is not optional: every query touching tenant data filters by `businessId`. `AGENTS.md` section 3 and the PR checklist in section 6 apply to every change.
- `Business.status` defaults to `'pending'`, and a pending tenant's API calls fail. Any code path that creates a Business must set the status deliberately.
- `AdminUser.email` is globally unique and `passwordHash` is required. Auto-provisioning a user from an external identity provider collides with an existing web signup; decide the linking behavior explicitly.
- Throw `DomainException`, never a bare `Error`, from services. Responses are enveloped by the global interceptor and filter — do not hand-roll an envelope.
- Branch naming is `feature/<slug>`, `fix/<slug>`, `chore/<slug>`; commits follow Conventional Commits.
