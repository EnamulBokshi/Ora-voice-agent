# Shopify Embedded App — Verification Runbook

Three stages, cheapest first. Stages 1 and 2 need no Shopify account and catch
most misconfiguration; stage 3 is the only one that exercises Shopify's own API.

**Status.** Stage 1 was run on 2026-09-10 and passed in full, but that run
predates the subscription paywall — §1.2 below now expects `402` where it used
to expect `200`, so those results no longer describe current behaviour. Stage 2
predates the embedded app moving into the ORA client. Stage 3 has never been
run: no code in this feature has ever made a live Shopify API call, and
`SHOPIFY_API_VERSION` is a guess.

Re-run stage 1 after any change to the session, provisioning, entitlement, or
CORS paths.

---

## Stage 1 — Local, no Shopify account

Because Shopify signs App Bridge session tokens with the app's Client Secret,
anything holding that secret can mint a valid one. That makes the entire session
bridge testable offline.

### Setup

Mongo and Redis running, and the server built (`pnpm --filter server build`).

```bash
cd server
PORT=5055 \
  SHOPIFY_API_KEY=verify-client-id \
  SHOPIFY_API_SECRET=verify-client-secret \
  ORA_API_URL=http://localhost:5055 \
  node dist/main.js
```

Seed a shop that is already "installed", so the session call takes the
already-provisioned branch and never reaches Shopify. Insert into `businesses`:
`shopifyShopDomain: 'verify-store.myshopify.com'`, `status: 'active'`,
`connectedPlatform: 'shopify'`, a unique `publishableKey`; and into `adminusers`
a matching `businessId` with `role: 'owner'` and `emailVerified: true`.

Seed **no** subscription yet. §1.2 depends on there being none.

### 1.1 Mint a session token

```js
// mint-token.cjs — run with `node mint-token.cjs [variant]`
const crypto = require('crypto');
const SECRET = 'verify-client-secret';
const AUD = 'verify-client-id';
const SHOP = 'verify-store.myshopify.com';
const v = process.argv[2] || 'valid';
const now = Math.floor(Date.now() / 1000);
let claims = {
  iss: `https://${SHOP}/admin`, dest: `https://${SHOP}/admin`, aud: AUD,
  sub: '99', exp: now + 60, nbf: now - 10, iat: now - 10, jti: 'j', sid: 's',
};
let secret = SECRET, alg = 'HS256';
if (v === 'wrong-aud') claims.aud = 'some-other-app';
if (v === 'expired') { claims.exp = now - 120; claims.nbf = now - 240; }
if (v === 'bad-sig') secret = 'not-the-secret';
if (v === 'dest-mismatch') claims.iss = 'https://other.myshopify.com/admin';
if (v === 'alg-none') alg = 'none';
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const h = enc({ alg, typ: 'JWT' }), p = enc(claims);
const sig = alg === 'none' ? '' :
  crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
process.stdout.write(`${h}.${p}.${sig}`);
```

### 1.2 Exchange it — and confirm the paywall holds

```bash
TOKEN=$(node mint-token.cjs valid)
ORA=$(curl -s -X POST http://127.0.0.1:5055/api/v1/shopify/session \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

for ep in dashboard/stats agent-config products conversations; do
  echo "$ep -> $(curl -s -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:5055/api/v1/$ep -H "Authorization: Bearer $ORA")"
done
```

The session exchange must return a token — that is the feature's central claim,
a Shopify-issued identity producing a token every existing ORA guard accepts.

**Expected on those four endpoints: all `402`,** with
`error.code = SUBSCRIPTION_REQUIRED`. The seeded store has no subscription, and
the plan gate is enforced server-side, not only in the embedded UI. A `200` here
means the paywall is bypassable with nothing but an install.

Read one refusal in full to confirm the code, rather than trusting the status:

```bash
curl -s http://127.0.0.1:5055/api/v1/dashboard/stats -H "Authorization: Bearer $ORA"
```

Then confirm the same endpoints return `401` with no header at all, or you have
proven nothing about the token.

Note the route is `dashboard/stats`. There is no bare `/api/v1/dashboard`; it
returns `404` whether authenticated or not.

### 1.3 Now entitle the store and repeat

Insert into `subscriptions`: the same `businessId`, `planId: 'starter'`,
`status: 'active'`, `billingProvider: 'shopify'`, `providerRef: '98765'`, and a
`currentPeriodEnd` in the future (the field is required).

The guard caches its decision for 60 seconds, so either wait it out or clear the
key:

```bash
redis-cli DEL "entitlement:<businessId>"
```

Re-run the loop from §1.2. **Expected: all `200`.**

Then walk the subscription through the states that must revoke access. For each,
update `subscriptions.status`, drop the cache key, and re-run the loop:

| `status` | Expected |
|---|---|
| `active` | `200` |
| `trialing` | `200` |
| `past_due` | `402` |
| `suspended` | `402` |
| `canceled` | `402` |

And with the subscription left `active`, set `businesses.status` to `suspended`
and drop the cache key: **`402` with `error.code = TENANT_SUSPENDED`.** That is
the uninstalled-store path.

### 1.4 A non-Shopify tenant must be unaffected

Seed a second business with **no** `shopifyShopDomain`, `status: 'active'`, no
subscription at all, and an owner. Log in through `/api/v1/auth/login` and call
the same endpoints.

**Expected: all `200`.** The entitlement check is scoped to Shopify tenants on
purpose. A `402` here means every existing web merchant has just been locked out
of their own dashboard.

### 1.5 The storefront widget is gated too

The voice agent is the product, so an unpaid store must not serve it either.
Using the seeded store's `publishableKey`, with **no** subscription (or a
`canceled` one) and the cache key dropped:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://127.0.0.1:5055/api/v1/voice/session/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Publishable-Key: <publishableKey>" -d '{}'
```

**Expected `403`,** with `error.code = WIDGET_DISABLED` and a message that names
no billing detail — this response reaches a shopper on the merchant's
storefront. With an `active` subscription and the cache dropped, the same call
should get past the guard.

### 1.6 Rejection cases

```bash
for v in wrong-aud expired bad-sig dest-mismatch alg-none; do
  T=$(node mint-token.cjs $v)
  printf "%-14s -> %s\n" "$v" "$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST http://127.0.0.1:5055/api/v1/shopify/session -H "Authorization: Bearer $T")"
done
```

**Expected: all `401`.** `wrong-aud` is the important one — that token carries a
*valid signature* under the shared secret and is only rejected because `aud`
does not match this app. A signature-only check would let a sibling app's token
through.

### 1.7 CORS

```bash
curl -sI -X OPTIONS http://127.0.0.1:5055/api/v1/products \
  -H "Origin: https://random-merchant.example" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control
```

**Expected:** `Access-Control-Allow-Origin` echoes the origin, and
**`Access-Control-Allow-Credentials` is absent**. Its presence means the
credentials fix has been reverted, and any site can then make cookie-bearing
calls to the API.

### 1.8 Compliance webhooks

```bash
BODY='{"shop_domain":"verify-store.myshopify.com","customer":{"id":123}}'
HMAC=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "verify-client-secret" -binary | base64)
URL=http://127.0.0.1:5055/api/v1/shopify/webhooks/compliance/customers-data_request

curl -s -o /dev/null -w "valid -> %{http_code}\n" -X POST $URL \
  -H "Content-Type: application/json" -H "X-Shopify-Hmac-Sha256: $HMAC" -d "$BODY"
curl -s -o /dev/null -w "none  -> %{http_code}\n" -X POST $URL \
  -H "Content-Type: application/json" -d "$BODY"
```

**Expected: `200` then `401`.** An unknown topic returns `400`.

### 1.9 The subscription webhook

This is the only path that ever learns about a cancellation. It needs the
`providerRef: '98765'` seeded in §1.3, because the update is scoped to business
*and* charge and does not upsert.

```bash
BODY='{"app_subscription":{"admin_graphql_api_id":"gid://shopify/AppSubscription/98765","name":"Starter","status":"CANCELLED"}}'
HMAC=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "verify-client-secret" -binary | base64)
URL=http://127.0.0.1:5055/api/v1/shopify/webhooks/app-subscriptions-update

curl -s -X POST $URL \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Shopify-Shop-Domain: verify-store.myshopify.com" -d "$BODY"
```

**Expected `{"status":"processed"}`,** then in Mongo:
`subscriptions.status = 'canceled'` and `businesses.status = 'suspended'`. The
gid is reduced to the numeric `98765` to match what the billing callback stores.

Three refusals to check:

```bash
# no signature -> 401
curl -s -o /dev/null -w "no-hmac    -> %{http_code}\n" -X POST $URL \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: verify-store.myshopify.com" -d "$BODY"

# no shop header -> 400
curl -s -o /dev/null -w "no-shop    -> %{http_code}\n" -X POST $URL \
  -H "Content-Type: application/json" -H "X-Shopify-Hmac-Sha256: $HMAC" -d "$BODY"
```

And an unknown shop, with a correct signature, must answer `200` with
`{"status":"ignored"}` rather than an error — Shopify retries a non-2xx for
days, and an unknown shop is not transient.

`PENDING` must change nothing, and an undocumented status must be logged rather
than guessed at. Replay the same request with `"status":"PENDING"` and confirm
neither document moves.

### 1.10 The install path

Mint a token for a shop that is not in the database. The request should reach
Shopify's real token-exchange endpoint and fail there:

```json
{"success":false,"error":{"code":"SHOPIFY_TOKEN_EXCHANGE_FAILED", ... }}
```

That failure is the pass condition at this stage — it proves verification,
tenant lookup, locking, and the outbound call are all wired, and that the only
thing missing is a real shop.

---

## Stage 2 — On the VPS, before any Shopify install

The embedded app is a route tree inside the ORA client, so there is no separate
container to start.

```bash
docker compose -f docker-compose.prod.yml up -d --build ora-client
sudo nginx -t && sudo systemctl reload nginx
```

### 2.1 The container is healthy

```bash
docker compose -f docker-compose.prod.yml ps ora-client
```

Must read `healthy`. There should be **no** `ora-shopify` container; it was
retired along with `packages/shopify-app`'s Next app. If one is still running
from an older deploy, remove it — nginx no longer routes to port 4090, so it
serves nothing while still consuming memory:

```bash
docker rm -f ora-shopify
```

### 2.2 The framing headers — the one most likely to be wrong

Check the entry URL **and** a sub-route. They are not the same test: the
exclusion in `client/next.config.ts` has to cover both `shopify$` and
`shopify/`, and covering only the second is a bug that has already happened
once. `/shopify`, with no trailing slash, is the App URL Shopify Admin frames.

```bash
for p in /shopify /shopify/agent /shopify/billing; do
  echo "== $p"
  curl -sI "https://tryora.live$p" | grep -iE "content-security|x-frame"
done
```

**Expected for each, exactly:**

```
Content-Security-Policy: frame-ancestors https://admin.shopify.com https://*.myshopify.com;
```

**and no `X-Frame-Options` line at all.**

Two ways this fails. `X-Frame-Options: SAMEORIGIN` means the
`location ^~ /shopify` block is not matching, and the server-level header in
`ora.conf` is being inherited. A *second* `Content-Security-Policy` carrying
`frame-ancestors 'none'` means Next is also emitting one: nginx appends rather
than replaces, and a browser intersects multiple policies, so the strictest
wins. Either produces a blank iframe in Shopify Admin with nothing in any log.

Then confirm the dashboard is still **not** framable:

```bash
curl -sI https://tryora.live/dashboard | grep -iE "content-security|x-frame"
```

Expected: `frame-ancestors 'none'` and `X-Frame-Options: DENY`. Same for `/` and
`/admin`.

### 2.3 App Bridge actually ships

A preload link is not a script. `next/script` with
`strategy="beforeInteractive"` is only honoured in a root layout, and in the
nested `/shopify` layout Next downgrades it silently, leaving HTML that loads
App Bridge late or never — `idToken()` then returns a promise that never
settles, which looks like an infinite loading state.

```bash
curl -s https://tryora.live/shopify | grep -o '<script[^>]*app-bridge[^>]*>'
curl -s https://tryora.live/shopify | grep -o 'shopify-api-key" content="[^"]*"'
```

**Expected:** a real `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">`
tag, and an API key meta tag whose value equals `SHOPIFY_API_KEY`. A wrong key
fails identically to a missing one.

### 2.4 Same-origin API reachability

```bash
curl -s https://tryora.live/api/v1/health
```

If that works, the embedded app's relative `/api/v1` calls work, because they
are the same origin.

### 2.5 The widget still works cross-origin

```bash
curl -sI -X OPTIONS https://tryora.live/api/v1/voice/session/bootstrap \
  -H "Origin: https://some-merchant-store.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control
```

Expected: the origin echoed, no `Allow-Credentials`. This is the regression to
watch after any CORS change — merchants' storefronts depend on it.

---

## Stage 3 — Against a real Shopify development store

Everything below runs a Shopify request shape that has never been executed.
Expect to find something here.

### 3.1 The API version, before anything else

`SHOPIFY_API_VERSION` in `server/src/shopify/shopify.constants.ts` and
`api_version` in both `shopify.app.toml` files are `2026-07`, and that value has
never been accepted by a live shop. Check it against Shopify's supported
versions first. If it is wrong, token exchange or the first Admin API call fails
in a way that looks like an auth bug, and you will debug the wrong layer for an
hour.

`shopify app deploy` rewrites the toml and may drop its comments, so re-check
`api_version` and both webhook URIs after every deploy.

### 3.2 Install

```bash
pnpm --filter shopify-app shopify:link    # once, for a manually created app
pnpm --filter shopify-app shopify:dev
```

Open the install link on a development store.

| Watch for | Where | Means |
|---|---|---|
| `Provisioned <shop> as business <id>` | server logs | token exchange and provisioning succeeded |
| `Registered webhook '<topic>'` ×6 | server logs | webhook registration succeeded |
| `app_subscriptions/update` among them, at `/api/v1/shopify/webhooks/app-subscriptions-update` | server logs | billing topic is not pointed at the ingestion route |
| a `businesses` row with `status: 'active'` | Mongo | the provisioning overrides took effect |
| `shopifyAccessToken` matching `^[0-9a-f]{24}:[0-9a-f]{32}:` | Mongo | encrypted at rest, not plaintext |
| the app renders, not a blank panel | Shopify Admin | framing headers and App Bridge correct |

### 3.3 The plan gate

A freshly installed store has no subscription, so it must be stopped in two
places at once.

- Shopify Admin shows the **plan picker**, not the dashboard.
- The API agrees. In the browser devtools network panel, the dashboard calls
  return `402` / `SUBSCRIPTION_REQUIRED`. A gate that renders while the API
  answers `200` is a gate in name only.
- The store's own storefront widget refuses to start.

### 3.4 Buying a plan

Charges are created with `test: true` outside production, so nothing is billed.

Pick a plan. Expect the Shopify-hosted approval screen **in the top frame**, not
inside the embedded iframe — Shopify refuses to be framed, and a same-frame
navigation shows an empty panel.

Approve it, then check:

| Check | Where | Expected |
|---|---|---|
| `subscriptions.planId` | Mongo | the plan actually chosen |
| `subscriptions.providerRef` | Mongo | the **numeric** charge id, no `gid://` prefix |
| `subscriptions.currentPeriodEnd` | Mongo | matches the subscription's period end in Shopify, not today + 30 days |
| `subscriptions.currentPeriodStart` | Mongo | set once, on creation |
| `businesses.status` | Mongo | `active` |
| the dashboard | Shopify Admin | renders, immediately — the entitlement cache is invalidated on the billing write, so there should be no 60-second wait |

Then the part that H1 was about. Replay the callback by hand, naming a dearer
plan:

```bash
curl -sI "https://tryora.live/api/v1/shopify/billing/callback?charge_id=<real id>&shop=<shop>.myshopify.com&plan_id=scale"
```

**`subscriptions.planId` must not change.** The plan comes from what the server
recorded in Redis when it created the charge, or failing that from the
subscription name Shopify reports — never from the query string.

### 3.5 Cancellation

Cancel the app subscription in Shopify Admin. This is the path that did nothing
at all before `app_subscriptions/update` had a receiver.

| Check | Expected |
|---|---|
| Shopify's webhook delivery log | `200` on `/api/v1/shopify/webhooks/app-subscriptions-update` |
| `subscriptions.status` | `canceled` |
| `businesses.status` | `suspended` |
| the embedded app | back to the plan picker |
| dashboard API calls | `402` |
| the storefront widget | stops serving; the voice socket refuses the connection |

Access may persist for up to 60 seconds, the entitlement cache TTL. Webhook
writes invalidate the cache, so this should be immediate; if it is not, the
invalidation is not firing.

### 3.6 Catalog sync

Products should appear without any manual action. Check the log line
`[ShopifySync] <shop>: N product(s) across M page(s), N embedded.` The embedded
count should equal the product count; a large gap means embedding is failing per
product and only the log warnings will say why.

Note that sync is enqueued at install, before any plan is bought. That is
deliberate — the catalog is ready the moment the merchant pays — but it means an
unpaid store does consume embedding cost once.

### 3.7 Catalog webhooks

Edit a product title in Shopify Admin. The change should reach ORA through
`POST /api/v1/ingestion/webhooks/shopify`. If Shopify's webhook delivery page
shows `404`s, `ORA_API_URL` is pointing at the frontend rather than the API.

### 3.8 Uninstall

Remove the app. Expect `shopifyAccessToken` cleared, `status: 'suspended'`,
`shopifyUninstalledAt` set — and the catalog still present, since deletion is
`shop/redact`'s job 48 hours later.

Access must stop, but note the one gap here: `handleAppUninstalled` does not
invalidate the entitlement cache, so a request can still succeed for up to 60
seconds after uninstall. Verify it stops by the 61st second.

### 3.9 Reinstall

Install again on the same store. Expect **one** `businesses` row, not two. That
is what the unique index on `shopifyShopDomain` and the Redis install lock are
for. The store should return to the plan picker, since its subscription is
`canceled`.
