# Shopify Embedded App — Verification Runbook

Three stages, cheapest first. Stages 1 and 2 need no Shopify account and catch
most misconfiguration; stage 3 is the only one that exercises Shopify's own API.

Stage 1 was run on 2026-09-10 and passed in full — results are in
`docs/shopify-embedded-app-implementation.md`. Re-run it after any change to the
session, provisioning, or CORS paths.

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

### 1.2 Exchange it, then use the result

```bash
TOKEN=$(node mint-token.cjs valid)
ORA=$(curl -s -X POST http://127.0.0.1:5055/api/v1/shopify/session \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

for ep in dashboard/stats agent-config products conversations; do
  echo "$ep -> $(curl -s -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:5055/api/v1/$ep -H "Authorization: Bearer $ORA")"
done
```

**Expected: all `200`.** This is the whole point of the feature — a
Shopify-issued identity producing a token every existing ORA guard accepts.
Confirm the same endpoints return `401` with no header, or you have proven
nothing about the token.

Note the route is `dashboard/stats`. There is no bare `/api/v1/dashboard`; it
returns `404` whether authenticated or not.

### 1.3 Rejection cases

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

### 1.4 CORS

```bash
curl -sI -X OPTIONS http://127.0.0.1:5055/api/v1/products \
  -H "Origin: https://random-merchant.example" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control
```

**Expected:** `Access-Control-Allow-Origin` echoes the origin, and
**`Access-Control-Allow-Credentials` is absent**. Its presence means the
credentials fix has been reverted, and any site can then make cookie-bearing
calls to the API.

### 1.5 Compliance webhooks

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

### 1.6 The install path

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

```bash
docker compose -f docker-compose.prod.yml up -d --build ora-shopify
sudo nginx -t && sudo systemctl reload nginx
```

### 2.1 The container is healthy

```bash
docker compose -f docker-compose.prod.yml ps ora-shopify
```

Must read `healthy`. The healthcheck probes `/shopify`, because `basePath` means
the app returns `404` on `/`.

If it is `unhealthy`, check the entrypoint first: Next writes the standalone
server under its file-tracing root, so it can land at
`packages/shopify-app/server.js` rather than `server.js`. The Dockerfile probes
for both.

### 2.2 The framing headers — the one most likely to be wrong

```bash
curl -sI https://tryora.live/shopify | grep -iE "content-security|x-frame"
```

**Expected exactly:**

```
Content-Security-Policy: frame-ancestors https://admin.shopify.com https://*.myshopify.com;
```

**and no `X-Frame-Options` line at all.**

If `X-Frame-Options: SAMEORIGIN` appears, the `location ^~ /shopify` block is
not matching and Shopify Admin will show a blank iframe with nothing in any log.
The server-level header in `ora.conf` is inherited by any location that declares
no `add_header` of its own.

Then confirm the dashboard is still **not** framable:

```bash
curl -sI https://tryora.live/dashboard | grep -iE "content-security|x-frame"
```

Expected: `frame-ancestors 'none'` and `X-Frame-Options: DENY`.

### 2.3 Same-origin API reachability

```bash
curl -s https://tryora.live/api/v1/health
```

If that works, the embedded app's relative `/api/v1` calls work, because they
are the same origin.

### 2.4 The widget still works cross-origin

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

### 3.1 Install

```bash
pnpm --filter shopify-app shopify:link    # once, for a manually created app
pnpm --filter shopify-app shopify:dev
```

Open the install link on a development store.

| Watch for | Where | Means |
|---|---|---|
| `Provisioned <shop> as business <id>` | server logs | token exchange and provisioning succeeded |
| `Registered webhook '<topic>'` ×5 | server logs | webhook registration succeeded |
| a `businesses` row with `status: 'active'` | Mongo | the provisioning overrides took effect |
| `shopifyAccessToken` matching `^[0-9a-f]{24}:[0-9a-f]{32}:` | Mongo | encrypted at rest, not plaintext |
| the app renders, not a blank panel | Shopify Admin | framing headers correct |

If the API version is wrong, this is where it shows: Admin API calls return
`404` or an unsupported-version error. Change `SHOPIFY_API_VERSION` in
`server/src/shopify/shopify.constants.ts` and `api_version` in
`shopify.app.toml` together.

### 3.2 Catalog sync

Products should appear without any manual action. Check the log line
`[ShopifySync] <shop>: N product(s) across M page(s), N embedded.` The embedded
count should equal the product count; a large gap means embedding is failing per
product and only the log warnings will say why.

### 3.3 Webhooks

Edit a product title in Shopify Admin. The change should reach ORA through
`POST /api/v1/ingestion/webhooks/shopify`. If Shopify's webhook delivery page
shows `404`s, `ORA_API_URL` is pointing at the frontend rather than the API.

### 3.4 Uninstall

Remove the app. Expect `shopifyAccessToken` cleared, `status: 'suspended'`,
`shopifyUninstalledAt` set — and the catalog still present, since deletion is
`shop/redact`'s job 48 hours later.

### 3.5 Reinstall

Install again on the same store. Expect **one** `businesses` row, not two. That
is what the unique index on `shopifyShopDomain` and the Redis install lock are
for.
