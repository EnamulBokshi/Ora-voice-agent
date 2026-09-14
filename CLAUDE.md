# CLAUDE.md

Orientation file for Claude Code working in this repository. It covers what exists, how to run and verify it, and where the documented rules diverge from the code.

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

pnpm workspace. `pnpm-workspace.yaml` globs `client`, `server`, `packages/*`. **`packages/` does not exist yet** and there is **no root `package.json`**.

```
ORA/
├── client/                 Next.js 16 dashboard, admin console, marketing site
├── server/                 NestJS API, 25 feature modules under src/
├── docs/                   Integration guides and analyses
├── graphify-out/           Generated code-graph reports (see below)
├── deploy/ docker-compose*.yml
├── AGENTS.md  ORA-Final-Architecture.md  build-state.md
```

### Server modules (`server/src/`)

`admin agent-config ai-voice api-access auth billing common conversations customers dashboard events gateway ingestion invoices knowledge live-desk mail notifications orders products rag scripts usage users vector`

Load-bearing pieces worth knowing before editing:

- `main.ts` — `rawBody: true`, global prefix `api/v1`, global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, global `TransformInterceptor` and `AllExceptionsFilter`, then a raw `ws` server attached at `/ws/voice` after Nest binds.
- `auth/strategies/jwt.strategy.ts` — every JWT requires a live Redis session keyed by `sessionId`. Any new login path must create that session or its tokens are inert.
- `common/guards/` — `jwt-auth`, `tenant-scope`, `roles`, `api-key` (publishable key), `dual-auth`, `plan-limit`, `optional-jwt-auth`.
- `common/utils/` — `encryption.util.ts`, `business-credentials.util.ts` (read encrypted connector credentials through this, never the raw field), `api-key.util.ts`, `pii-redactor.util.ts`.
- `ingestion/` — four catalog connector tiers: Shopify, WooCommerce, feed, sitemap crawl, manual endpoint. One shared webhook route at `POST /api/v1/ingestion/webhooks/shopify` handles HMAC verification, 24-hour Redis dedupe, and tenant resolution from the signed shop domain only.
- `billing/providers/` — `payment-provider.interface.ts` with `stripe.provider.ts` and `bkash.provider.ts`. Add new providers here, not in feature modules.

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
pnpm --filter server test:cov
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
```

## Verified baseline

Measured at commit `25f217d`:

- `pnpm --filter server test` — 43 suites, 224 tests, all passing, about 16s. Passing runs print `ERROR` lines from `AuthService`, `ShopifyConnectorService`, and `WooCommerceConnectorService`; these are deliberate negative-path assertions, not failures.
- `pnpm --filter client typecheck` — clean.

Re-measure rather than trusting these numbers if the tree has moved on.

## Documented-versus-actual drift

Each item below is a place where a rules document describes something the code does not do. Do not "fix" the code to match the doc without asking — some of these are aspirational roadmap, not regressions.

- `AGENTS.md` section 8 instructs agents to verify with `pnpm build` and `pnpm test`. Both fail at the repo root. Use the `--filter` forms above.
- `AGENTS.md` names `packages/shared-types` as the home for shared types. The `packages/` directory does not exist; types are currently duplicated between `client/types/` and server DTOs.
- `client/AGENTS.md` section 6 describes RTK for client state. Redux Toolkit is not a dependency of `client/package.json`.
- `client/AGENTS.md` section 4 requires Server Actions in `actions/`. That directory does not exist; data access goes through `services/` and `lib/api-client.ts`.
- `server/AGENTS.md` section 3.4 specifies invoice PDFs stored in S3. No AWS SDK dependency is installed.
- `bkash.provider.ts` reads `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, and `BKASH_BASE_URL`. None appear in `server/.env.example` (28 keys, none of them bKash).
- `server/src/ingestion/services/shopify-connector.service.ts:197` pins Shopify API version `2024-01`, which is past Shopify's support window.
- `main.ts` configures CORS as `origin: (origin, callback) => callback(null, true)` together with `credentials: true`, reflecting any origin with credentials. Known issue; the current branch `fix/credential-auth-hardening` is where it belongs.

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

Check freshness first. The report states the commit it was built from; compare against `git rev-parse HEAD`. As of this writing the report is from `6a613496` while `HEAD` is `25f217d`, so treat it as a map of where things live, not as truth about current file contents. `graphify update .` refreshes it at no API cost.

Use it to locate a subsystem quickly, then read the actual files before making claims about behavior.

## Working notes

- Tenant scoping is not optional: every query touching tenant data filters by `businessId`. `AGENTS.md` section 3 and the PR checklist in section 6 apply to every change.
- `Business.status` defaults to `'pending'`, and a pending tenant's API calls fail. Any code path that creates a Business must set the status deliberately.
- `AdminUser.email` is globally unique and `passwordHash` is required. Auto-provisioning a user from an external identity provider collides with an existing web signup; decide the linking behavior explicitly.
- Throw `DomainException`, never a bare `Error`, from services. Responses are enveloped by the global interceptor and filter — do not hand-roll an envelope.
- Branch naming is `feature/<slug>`, `fix/<slug>`, `chore/<slug>`; commits follow Conventional Commits.
