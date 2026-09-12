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
| `extensions/ora-voice-widget/` | Theme app extension: the storefront widget app embed |

## The storefront widget extension

`extensions/ora-voice-widget/` is what removes the copy-paste step. It ships an
app embed block that injects the same loader
(`client/public/widget/ora-widget.js`) a standalone merchant pastes into
`theme.liquid` by hand. The merchant enables it in
Online Store > Themes > Customize > App embeds; there is nothing to copy.

The block gets the store's publishable key from an app-owned metafield,
`$app:ora/publishable_key`, which the server writes during install
(`ShopifyService.syncStorefrontKey`). Liquid drops the `$app:` prefix, so the
block reads `app.metafields.ora.publishable_key.value`. The namespace and key
are declared once in `SHOPIFY_STOREFRONT_KEY_METAFIELD`
(`server/src/shopify/shopify.constants.ts`) and must match the Liquid — a
mismatch renders no widget and no error, on every storefront at once.

Writing that metafield needs no access scope: an app always owns the metafields
on its own installation, which is why `scopes` in `shopify.app.toml` is
unchanged. The write cannot fail an install; when it does fail, the session
exchange retries it on the merchant's next page load, and the block's
`publishable_key` setting is a manual override of last resort.

After the first `shopify app deploy`, Shopify assigns the extension a UUID. Put
it in the client's `NEXT_PUBLIC_SHOPIFY_THEME_EXTENSION_ID` so the setup guide's
"Open theme editor" button lands on ORA's embed already selected. Without it the
button still opens the App embeds panel.

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
