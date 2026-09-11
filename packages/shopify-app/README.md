# shopify-app

Shopify app configuration. **No application code lives here.**

The embedded app itself is a route tree inside the ORA client, at
`client/app/shopify/`, served by the `ora-client` container. nginx routes
`location ^~ /shopify` there and adds the `frame-ancestors` allowlist that lets
Shopify Admin frame those paths. This package holds only what the Shopify CLI
reads.

This used to be a second Next.js application. Building the merchant dashboard
here would have forked roughly forty components and every service file
permanently, so the app moved into the client instead and this package was
reduced to configuration.

## Contents

| File | Purpose |
|---|---|
| `shopify.app.toml` | App config the CLI deploys: scopes, URLs, webhook topics, API version |
| `shopify.app.ora-voice-ai.toml` | The named variant for the `ora-voice-ai` app handle |
| `extensions/` | Where `shopify app generate extension` puts extensions (empty for now) |

## Commands

```bash
pnpm --filter shopify-app shopify:link     # link to the Partner app before the first deploy
pnpm --filter shopify-app shopify:deploy   # push config and extensions to Shopify
pnpm --filter shopify-app shopify:dev      # tunnel a local client for development
```

`shopify:link` matters: for a manually created Partner app, deploying without
linking first creates a *second* app rather than updating yours.

## Two things to re-check after every deploy

`shopify app deploy` rewrites `shopify.app.toml` and may drop its comments.

1. **`api_version`** must equal `SHOPIFY_API_VERSION` in
   `server/src/shopify/shopify.constants.ts`. Shopify reads the file; the
   server reads the constant. They are duplicated on purpose and drift
   silently.
2. **Webhook URIs.** Catalog topics go to
   `/api/v1/ingestion/webhooks/shopify`; `app_subscriptions/update` has its own
   receiver at `/api/v1/shopify/webhooks/app-subscriptions-update`, because the
   ingestion route dispatches on catalog topics and answers anything else with
   a warning. Pointing billing at the ingestion route means a cancelled
   subscription never reaches ORA. Keep both in step with
   `SHOPIFY_WEBHOOK_TOPICS`.

## Local leftovers

`.env` here holds `NEXT_PUBLIC_SHOPIFY_API_KEY`, which the retired Next app
read at build time. The client now reads it from its own environment. The file
is untracked and can be deleted.
