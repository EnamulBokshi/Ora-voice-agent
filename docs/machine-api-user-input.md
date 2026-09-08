# ORA User-Input API (OAuth 2.0 Client Credentials)

A server-to-server API for submitting end-user input into ORA: free-text
prompts, text documents, and file uploads. It mirrors the input surfaces the
merchant dashboard exposes, but is authenticated with OAuth 2.0 client
credentials instead of a dashboard session.

Base URL: `https://<host>/api/v1`

> **Server-side only.** The client secret must never be embedded in browser
> JavaScript, a Shopify theme, or a mobile app binary. Anyone who can read the
> secret can call this API as your tenant. For browser/storefront traffic use
> the publishable-key widget endpoints instead.

---

## 1. Get credentials

A merchant `owner` or `admin` creates a client from the dashboard session:

```http
POST /api/v1/oauth/clients
Authorization: Bearer <dashboard access token>
Content-Type: application/json

{ "name": "Telegram bot", "scopes": ["inputs:write"], "allowedIps": [] }
```

Response (`201`):

```json
{
  "id": "6712...",
  "client_id": "ora_client_9f2c1ab4de7c5081bb3e0f42",
  "client_secret": "ora_secret_x7Qp...",
  "scopes": ["inputs:write"],
  "tokenUrl": "/api/v1/oauth/token"
}
```

`client_secret` is shown **once** and is stored only as a bcrypt hash. If it is
lost, revoke the client and create a new one.

Optionally pass `allowedIps` with the caller's static egress IPs — token
issuance is then refused from any other address. Leave it empty for callers on
ephemeral/serverless infrastructure.

Manage clients with `GET /api/v1/oauth/clients` and
`DELETE /api/v1/oauth/clients/:id`. Revocation takes effect immediately: the
client record is re-checked on every request, so already-issued access tokens
stop working too.

## 2. Get an access token

```http
POST /api/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "ora_client_9f2c1ab4de7c5081bb3e0f42",
  "client_secret": "ora_secret_x7Qp..."
}
```

HTTP Basic (`client_secret_basic`) is also accepted:
`Authorization: Basic base64(client_id:client_secret)`.

Response (`200`):

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "inputs:write"
}
```

Tokens live **15 minutes** and there is no refresh token — request a new one
when it expires. Cache the token for its lifetime rather than minting one per
request; the token endpoint is rate limited to 30 requests/min per client and
per IP.

An optional `scope` field may **narrow** the grant (e.g. `"inputs:write"`), but
never widen it beyond what the client was issued.

## 3. Submit a prompt

```http
POST /api/v1/inputs/prompt
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "prompt": "Do you ship to Canada?",
  "sessionId": "tg-chat-88213",
  "externalUserId": "tg-user-4471",
  "idempotencyKey": "tg-update-90210",
  "metadata": { "channel": "telegram" }
}
```

Response (`201`):

```json
{
  "id": "6712...",
  "conversationId": "6712...",
  "sessionId": "tg-chat-88213",
  "channel": "api",
  "receivedAt": "2026-09-08T10:14:22.001Z",
  "redacted": true
}
```

- `sessionId` groups messages into one conversation. It is scoped to your
  tenant, so your values cannot collide with another merchant's. Omit it and a
  new session is created per call.
- `idempotencyKey` — pass the upstream message id. A repeat delivery with the
  same key returns the original record with `"idempotentReplay": true` instead
  of creating a duplicate. Keys are remembered for 24 hours.
- `redacted: true` means emails/phones/addresses were stripped from the stored
  text. Prompts are redacted before they are persisted.
- `prompt` is capped at 8000 characters.

## 4. Submit a text document

```http
POST /api/v1/inputs/documents
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "docType": "faq",
  "title": "Shipping FAQ",
  "content": "We ship to 40 countries...",
  "sourceUrl": "https://example.com/faq"
}
```

`docType` is one of `policy`, `brand_rule`, `faq`, `sales_playbook`,
`uploaded_doc`, `product_manual`. `content` is capped at 200,000 characters.
The document is chunked and embedded into the tenant's vector index.

## 5. Upload a file

```http
POST /api/v1/inputs/documents/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file=@shipping-policy.pdf
docType=policy
title=Shipping Policy
```

Allowed: `pdf`, `txt`, `md`, `csv`, `json`. Maximum 10MB. Text is extracted,
chunked and embedded; the response reports `chunksCount` and
`extractedLength`.

## 6. Read back captured sessions

Requires the `inputs:read` scope, which is **not** granted by default.

```http
GET /api/v1/inputs/prompt-sessions?page=1&limit=20
Authorization: Bearer <access_token>
```

---

## 7. Product Catalog Management (Shopify Apps, ERPs & Automation)

Requires `products:write` for mutating operations and `products:read` for catalog queries.

### 7.1 Batch Sync Products (Primary Integration Method)

Ideal for Shopify apps, catalog sync jobs, and bulk product imports. Products are atomically upserted matching on `nativeProductId` and automatically embedded into the tenant's vector search index for instant AI Voice & Chat discovery.

```http
POST /api/v1/products/batch-sync
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sourceTier": "tier1_connector",
  "products": [
    {
      "nativeProductId": "shopify_829104",
      "name": "Wireless Noise-Canceling Headphones",
      "description": "Premium over-ear wireless headphones with 30-hour battery life.",
      "price": 299.99,
      "currency": "USD",
      "stockQuantity": 42,
      "availability": "in_stock",
      "category": "Electronics",
      "images": ["https://cdn.shopify.com/products/headphones_front.jpg"]
    }
  ]
}
```

Response (`200`):

```json
{
  "success": true,
  "data": {
    "totalProcessed": 1,
    "upsertedCount": 1,
    "modifiedCount": 0
  }
}
```

### 7.2 Create a Single Product

```http
POST /api/v1/products
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nativeProductId": "shopify_992101",
  "name": "Leather Travel Backpack",
  "price": 149.00,
  "currency": "USD",
  "stockQuantity": 10,
  "availability": "in_stock",
  "category": "Bags"
}
```

Response (`201`):

```json
{
  "success": true,
  "data": {
    "_id": "67128...",
    "nativeProductId": "shopify_992101",
    "name": "Leather Travel Backpack",
    "price": 149.00,
    "availability": "in_stock"
  }
}
```

### 7.3 Query Products

Requires the `products:read` scope.

```http
GET /api/v1/products?page=1&limit=20&search=Headphones
Authorization: Bearer <access_token>
```

Response (`200`):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "67128...",
        "nativeProductId": "shopify_829104",
        "name": "Wireless Noise-Canceling Headphones",
        "price": 299.99,
        "stockQuantity": 42,
        "availability": "in_stock"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 7.4 Get Single Product

```http
GET /api/v1/products/:id
Authorization: Bearer <access_token>
```

### 7.5 Update / Override Product

```http
PATCH /api/v1/products/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "price": 279.99,
  "stockQuantity": 35
}
```

### 7.6 Delete Product

```http
DELETE /api/v1/products/:id
Authorization: Bearer <access_token>
```

---

## Errors

Errors use OAuth 2.0 error codes on the token endpoint and ORA domain codes
elsewhere, always as `{ "code": ..., "message": ... }`.

| Status | Code | Meaning |
|---|---|---|
| 401 | `invalid_client` | Unknown client, wrong secret, revoked client, or blocked IP. Deliberately indistinguishable. |
| 400 | `invalid_scope` | None of the requested scopes are granted to this client. |
| 401 | `invalid_request` | Missing or malformed `Authorization: Bearer` header. |
| 401 | `invalid_token` | Token expired, malformed, not a machine token, or its client was revoked. |
| 403 | `insufficient_scope` | Token lacks a scope the route requires. |
| 429 | `slow_down` | Token endpoint rate limit (30/min per client and per IP). |
| 429 | `rate_limit_exceeded` | API rate limit (300/min per client). |
| 400 | `INVALID_FILE` | Missing `file` field on an upload. |
| 413 | `FILE_TOO_LARGE` | Upload above 10MB. |
| 415 | `UNSUPPORTED_FILE_TYPE` | Extension not in the allowed list. |

Request validation runs with `forbidNonWhitelisted`, so **any field not
documented above is rejected with a 400** rather than silently ignored. In
particular there is no `businessId` field on any request: the tenant is derived
from the access token and cannot be influenced by the caller.

## Security model

| Control | Behaviour |
|---|---|
| Tenant isolation | `businessId` comes only from the verified token. Session lookups are namespaced per tenant, and the resolved conversation's tenant is asserted before any write. |
| Secret storage | bcrypt hash only; plaintext returned once at creation. |
| Token lifetime | 15 minutes, no refresh token. |
| Revocation | Immediate — the client record is re-checked on every request, not only at token issuance. |
| Scopes | `inputs:write` to submit, `inputs:read` to read back. Write routes cannot read; neither can touch orders, customers or business config. |
| Token confusion | Machine tokens carry `token_use: client_credentials` and `aud: ora-machine-api` and no `sessionId`, so they cannot be replayed as dashboard sessions, or vice versa. |
| Rate limits | 30/min per client and per IP on token issuance; 300/min per client on the API. |
| PII | Prompts are redacted before storage. |
| Idempotency | Optional per-tenant key, remembered 24h. |
| IP allowlist | Optional per client, enforced at token issuance. |

## Environment

`OAUTH_JWT_SECRET` signs machine tokens. Set it to a value distinct from
`JWT_SECRET`, so rotating it invalidates every machine token without logging
out a single human user. If unset it falls back to `JWT_SECRET`; the
`token_use`/`aud` claims keep the two token classes separate either way, but a
dedicated secret is strongly recommended in production.
