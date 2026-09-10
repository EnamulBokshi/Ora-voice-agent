# ORA Shopify Embedded App

The frontend Shopify Admin frames. It exists as its own workspace package
because its framing policy is the opposite of `client/`'s: this app must be
framable by Shopify Admin, and the ORA dashboard must not be framable at all.
One Next.js app cannot serve both policies without per-route header logic that
fails in the unsafe direction when it is wrong.

## What lives here

| Path | Purpose |
|---|---|
| `shopify.app.toml` | Scope declaration Shopify-managed installation reads, plus the webhook and compliance URLs. Token exchange has nothing to grant without it. |
| `next.config.ts` | `basePath: "/shopify"`. No CSP — the proxy owns `frame-ancestors`. |
| `app/layout.tsx` | Loads App Bridge from Shopify's CDN in the document head. |
| `lib/session-client.ts` | Trades an App Bridge session token for an ORA session, unwraps the ORA response envelope, retries once on 401. Tokens live in memory only. |
| `Dockerfile` | Standalone build for the `ora-shopify` container. |

## One origin, two paths

Served at `https://tryora.live/shopify` by the `ora-shopify` container on port
4090, behind the same nginx as the dashboard and the API. `basePath` in
`next.config.ts` is what makes that work with a single proxy location.

Same-origin is the whole point: this app's `/api/v1/...` calls are same-origin,
exactly like the dashboard's, so **no CORS is involved anywhere**.
`NEXT_PUBLIC_ORA_API_URL` therefore defaults to the relative `/api/v1` and
should stay relative unless the app moves to its own host.

Two config values that are easy to confuse, and are not interchangeable:

| Value | Points at | Used for |
|---|---|---|
| `SHOPIFY_APP_URL` | `https://tryora.live/shopify` | Shopify's "App URL" — what Admin loads in the iframe. `application_url` in the toml. |
| `ORA_API_URL` | `https://tryora.live` | Every address Shopify *calls back* on: webhooks, OAuth callback, billing return. |

Point `ORA_API_URL` at the frontend path by mistake and Shopify accepts the
webhook registration, then 404s every delivery — catalog sync stops with no
error anywhere. The server logs a warning if `ORA_API_URL` is unset and it has
to fall back to `SHOPIFY_APP_URL`.

## The framing header belongs to the proxy

This app sets **no** `Content-Security-Policy`. `deploy/nginx/ora.conf` owns
`frame-ancestors` for `/shopify`, for two reasons:

- It has to override the server-level `X-Frame-Options: SAMEORIGIN`, which would
  otherwise stop Shopify Admin framing the app. In nginx, a location declaring
  any `add_header` inherits none of the server-level ones, which is exactly the
  lever used.
- A browser *intersects* multiple `Content-Security-Policy` headers. Two sources
  emitting `frame-ancestors` would quietly reduce the policy to whatever both
  allow.

If you add a CSP here, coordinate it with the proxy or the iframe will break in
a way that shows up as an empty panel and no log line.

## Setup

```bash
pnpm install                              # links this workspace package
pnpm --filter shopify-app typecheck
pnpm --filter shopify-app dev:standalone  # http://localhost:3001/shopify
```

`basePath` applies in development too, so the app answers on `/shopify`, not
`/`. Run the API alongside it with `pnpm --filter server start:dev`.

Set `NEXT_PUBLIC_ORA_API_URL` to the ORA API origin, including `/api/v1`.

Replace `client_id` in `shopify.app.toml` with the Partner Dashboard Client ID
(the same value as the server's `SHOPIFY_API_KEY`), and keep its `scopes`
identical to the server's `SHOPIFY_SCOPES`. A mismatch grants a token that
cannot do what the app later asks of it.

## Working against Shopify

```bash
pnpm --filter shopify-app shopify:link    # once, for a manually created app
pnpm --filter shopify-app shopify:dev     # tunnel + install link
pnpm --filter shopify-app shopify:deploy  # push toml to the Partner Dashboard
```

`shopify:link` matters: without it, `deploy` creates a *second* Partner app
rather than updating yours. `shopify app dev` opens a Cloudflare tunnel and
temporarily rewrites `application_url`, so the App URL needs no permanent value
during development. Run the API alongside it with
`pnpm --filter server start:dev`.

`deploy` rewrites this file and may drop its comments. Re-check `api_version`
after every deploy — it is duplicated here and in
`server/src/shopify/shopify.constants.ts`, and the two must agree.

## Distribution

| Mode | Reach | Shopify Billing |
|---|---|---|
| Custom | one store, permanently — cannot become public later | exempt |
| Unlisted | publicly installable, not searchable, no review | required |
| Public | App Store listing, review required | required |

For several early clients the answer is **Unlisted**, not Custom — Custom is one
store per app. If you do go Custom, `ShopifyProvider` is dead weight and those
merchants should stay on Stripe.

## Why tokens are held in memory

Shopify Admin frames this app cross-site. Cookies are unreliable or blocked
there, so the ORA access token lives in a module-level variable for the life of
the tab and is re-minted from App Bridge whenever it expires. Nothing is written
to `localStorage`: a token that outlives its tab is a token that leaks.
