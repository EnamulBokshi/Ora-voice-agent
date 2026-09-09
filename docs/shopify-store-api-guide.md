# ORA Machine API — Shopify Store & App Integration Guide
## Direct Secret API Key Authentication (Method 1)

This guide provides the complete API specification and implementation steps for connecting a **Shopify Store** or **Shopify App** to **ORA** using direct Secret API Key authentication (`X-API-Key`).

This integration enables:
1. **Automated Catalog Synchronization**: Bulk-syncing products and collections from Shopify into ORA.
2. **Instant Semantic Vector Indexing**: Automatic embedding generation so ORA's AI Voice and Sales agents can discuss, search, and sell products accurately in real time.
3. **Real-Time Webhook Updates**: Syncing product creation, price/inventory changes, and deletions instantly.
4. **Live Price & Stock Reconciliation**: Pushing authoritative price and stock during live customer voice sessions.
5. **Storefront Voice Assistant**: Mounting ORA's live AI Voice & Chat orb on the Shopify storefront.

---

## 1. Authentication & Security Architecture

ORA implements a **Zero-Login, Server-to-Server** authentication architecture. Your Shopify backend or private sync worker includes the merchant's Secret API Key in the request header with every call.

### Key Types & Boundaries

| Key Name | Format | Where It Lives | Permitted Actions |
|---|---|---|---|
| **Secret API Key** | `ora_sk_live_<32_hex_chars>` | Backend Server Only (`.env`) | Full CRUD on products, catalog sync, and store management. |
| **Publishable Key** | `biz_live_<24_hex_chars>` | Shopify `theme.liquid` (Frontend) | WebSocket voice session initiation & telemetry only. **Cannot** access REST APIs. |

> ⚠️ **CRITICAL SECURITY RULE**
> Never include your `secretApiKey` (`ora_sk_live_...`) in client-side Liquid templates (`theme.liquid`), frontend JavaScript, or mobile app binaries. It must **only** reside in your Shopify App's secure backend environment variables.

Publishable keys are rejected by every REST endpoint. ORA matches the presented key against the secret key only, so passing a `biz_live_...` value as `X-API-Key` returns `401 INVALID_API_KEY`.

### Obtaining and Rotating the Secret Key

ORA stores only a SHA-256 hash of the secret key, so **the plaintext is shown exactly once**, in the response to:

```http
POST /api/v1/business/secret-key
```

Copy it into your backend's environment at that moment. It cannot be retrieved afterwards — the dashboard can only show the last four characters (`secretApiKeyHint`). If the key is lost or leaked, call that endpoint again to issue a replacement, which immediately invalidates the previous key. `DELETE /api/v1/business/secret-key` revokes without issuing a new one.

A key also stops working the moment the merchant's tenant leaves `status: 'active'` (suspension), which surfaces as `401 INVALID_API_KEY`.

### HTTP Authentication Header

Pass the Secret Key in every REST API request using either of the following headers:

```http
X-API-Key: ora_sk_live_1234567890abcdef1234567890abcdef
```
*or*
```http
Authorization: Bearer ora_sk_live_1234567890abcdef1234567890abcdef
```

The `Authorization: Bearer` form is only recognised for values beginning `ora_sk_`; any other bearer token is treated as an OAuth machine token or a dashboard session, not as an API key.

### Environment Configuration

- **Production Base URL:** `https://<YOUR_ORA_DOMAIN>/api/v1`
- **Local Dev Base URL:** `http://localhost:5000/api/v1`
- **Content-Type:** `application/json`

### Response Envelope

Every successful response is wrapped by ORA's global response interceptor. The payloads documented below are what you will find inside `data`:

```json
{
  "success": true,
  "data": { }
}
```

Every error uses the matching failure envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid or revoked API key.",
    "correlationId": "req-8fa21c04"
  }
}
```

`error.message` is always a single string; validation failures are joined with `; ` rather than returned as an array. Send `X-Correlation-Id` on a request to have your own identifier echoed back in `error.correlationId`.

> **Strict field validation:** ORA rejects unknown properties rather than ignoring them (`forbidNonWhitelisted`). Sending a Shopify field that is not in the tables below — `handle`, `admin_graphql_api_id`, `variants` — returns `400 BAD_REQUEST`. Map into `attributes` instead.

---

## 2. Shopify to ORA Data Mapping

When synchronizing products from Shopify (GraphQL Admin API or REST Admin API) to ORA, map your fields as follows:

| Shopify Product Field | ORA Field | Type | Required? | Description |
|---|---|---|---|---|
| `id` / `admin_graphql_api_id` | `nativeProductId` | String | **Yes** | Unique Shopify product identifier. Used as the upsert key, so pick one form (`String(product.id)` is recommended) and keep it stable across syncs. |
| `title` | `name` | String | **Yes** | Product name / title. |
| `body_html` / `description` | `description` | String | No | Clean text or HTML description. Used for semantic search & AI product knowledge. |
| `variants[0].price` | `price` | Number | **Yes** | Primary unit price (float or integer, e.g. `29.99`). |
| Store currency | `currency` | String | No | 3-letter ISO currency code (defaults to `"USD"`). |
| `variants[0].inventory_quantity` | `stockQuantity` | Number | No | Current available units in inventory. Defaults to `0`. |
| derived from `inventory_quantity` | `availability` | String | No | Enum: `'in_stock'`, `'out_of_stock'`, `'preorder'`, `'discontinued'`. Defaults to `'in_stock'`. |
| `product_type` | `category` | String | No | Product category or department (e.g. `"Apparel"`, `"Electronics"`). |
| `vendor` | `brand` | String | No | Manufacturer or vendor. Filterable via the `brand` query parameter and weighted by product search. |
| `images[].src` | `images` | Array&lt;String&gt; | No | Array of public image URLs. |
| `tags`, options, other metadata | `attributes` | Object | No | Arbitrary key-value metadata (e.g. `{"handle": "wool-sweater", "size": "L"}`). |
| — | `sourceTier` | String | No | `"tier1_connector"`, `"tier2_feed"`, `"tier3_passive"` or `"tier4_manual"`. Defaults to `"tier1_connector"`. **Required at the top level of `/batch-sync`**, where it overrides any per-item value. |

> **Do not map Shopify's `status` field to `availability`.** Shopify `status` is `active`, `draft` or `archived` — a publication state, not a stock state. Derive `availability` from `inventory_quantity`, as the reference implementation in §6 does.

---

## 3. Catalog API Reference

### 3.1 Batch Catalog Sync (Primary Shopify Sync Method)

Upserts a batch of products matching on `nativeProductId`. If a product already exists for this store, it is updated; if not, it is created. ORA automatically re-indexes semantic vector embeddings for all updated items.

Operations are applied as a single MongoDB `bulkWrite`, which is per-document rather than all-or-nothing: a batch can partially succeed, so use the returned counts rather than assuming a transaction.

- **Method:** `POST`
- **Path:** `/api/v1/products/batch-sync`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`

#### Request Body
```json
{
  "sourceTier": "tier1_connector",
  "products": [
    {
      "nativeProductId": "918237461",
      "name": "Merino Wool Crewneck Sweater",
      "description": "Ultra-soft 100% Australian merino wool sweater with ribbed cuffs and hem. Machine washable.",
      "price": 89.00,
      "currency": "USD",
      "stockQuantity": 35,
      "availability": "in_stock",
      "category": "Apparel",
      "brand": "Nordic Weave",
      "images": [
        "https://cdn.shopify.com/s/files/1/0001/products/sweater_navy.jpg",
        "https://cdn.shopify.com/s/files/1/0001/products/sweater_back.jpg"
      ],
      "attributes": {
        "material": "100% Merino Wool",
        "fit": "Regular"
      }
    },
    {
      "nativeProductId": "918237462",
      "name": "Waterproof Commuter Backpack",
      "description": "Weather-resistant 24L commuter pack with 16-inch padded laptop compartment and magnetic buckle.",
      "price": 120.00,
      "currency": "USD",
      "stockQuantity": 12,
      "availability": "in_stock",
      "category": "Bags & Accessories",
      "images": [
        "https://cdn.shopify.com/s/files/1/0001/products/backpack_black.jpg"
      ],
      "attributes": {
        "capacity": "24L",
        "waterproof": true
      }
    }
  ]
}
```

#### cURL Example
```bash
curl -X POST https://api.ora.example.com/api/v1/products/batch-sync \
  -H "X-API-Key: ora_sk_live_YOUR_STORE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d @products.json
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "upsertedCount": 2,
    "modifiedCount": 0,
    "matchedCount": 0
  }
}
```

---

### 3.2 Create Single Product

Creates one product. This endpoint is **not** an upsert: if `nativeProductId` already exists for this store it returns `409 PRODUCT_ALREADY_EXISTS`. Use `/batch-sync` (§3.1) for idempotent syncing, or `PATCH` (§3.5) to change an existing product.

- **Method:** `POST`
- **Path:** `/api/v1/products`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`

#### Request Body
```json
{
  "nativeProductId": "918237463",
  "name": "Insulated Travel Tumbler 20oz",
  "description": "Double-wall vacuum-insulated stainless steel tumbler. Keeps hot for 8h, cold for 24h.",
  "price": 28.50,
  "currency": "USD",
  "stockQuantity": 50,
  "availability": "in_stock",
  "category": "Kitchen & Drinkware",
  "images": [
    "https://cdn.shopify.com/s/files/1/0001/products/tumbler_matte.jpg"
  ],
  "sourceTier": "tier1_connector"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "_id": "67cf8912e841203ab1234567",
    "businessId": "67cd4091a129048123456789",
    "nativeProductId": "918237463",
    "name": "Insulated Travel Tumbler 20oz",
    "price": 28.5,
    "currency": "USD",
    "stockQuantity": 50,
    "availability": "in_stock",
    "category": "Kitchen & Drinkware",
    "sourceTier": "tier1_connector",
    "confidenceScore": 1,
    "isActive": true,
    "createdAt": "2026-09-09T18:00:00.000Z",
    "updatedAt": "2026-09-09T18:00:00.000Z"
  }
}
```

---

### 3.3 List / Search Products

Retrieves paginated products belonging to this merchant store. Only products with `isActive: true` are returned.

- **Method:** `GET`
- **Path:** `/api/v1/products`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`
- **Query Parameters:**
  - `page` *(optional, default: `1`)*: Page number.
  - `limit` *(optional, default: `20`, max: `100`)*: Items per page. Above `100` returns `400 BAD_REQUEST`.
  - `search` *(optional)*: Keyword search across name, category, brand, description and `nativeProductId`. Conversational stop words are stripped, and matches are re-ranked so name and category hits outrank description hits.
  - `category` *(optional)*: Filter by exact category (case-insensitive).
  - `brand` *(optional)*: Filter by exact brand (case-insensitive).
  - `availability` *(optional)*: Filter by availability (`in_stock`, `out_of_stock`, `preorder`, `discontinued`).
  - `minPrice` / `maxPrice` *(optional)*: Price range filter.

> When `search` is supplied, ORA fetches a wider candidate pool and re-ranks it by relevance before slicing to `limit`. Rankings are therefore computed per page; for deterministic bulk export, page without `search`.

#### cURL Example
```bash
curl -G https://api.ora.example.com/api/v1/products \
  -H "X-API-Key: ora_sk_live_YOUR_STORE_SECRET_KEY" \
  -d "page=1" \
  -d "limit=10" \
  -d "category=Apparel"
```

#### Response (`200 OK`)

Pagination metadata is nested under `pagination`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "67cf8912e841203ab1234567",
        "nativeProductId": "918237461",
        "name": "Merino Wool Crewneck Sweater",
        "price": 89,
        "currency": "USD",
        "stockQuantity": 35,
        "availability": "in_stock",
        "category": "Apparel",
        "brand": "Nordic Weave",
        "images": ["https://cdn.shopify.com/s/files/1/0001/products/sweater_navy.jpg"]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3.4 Get Product by ID

Retrieves product details using either the internal MongoDB `_id` or the Shopify `nativeProductId`. Every `:id` route in this section accepts both forms.

- **Method:** `GET`
- **Path:** `/api/v1/products/:id`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`

#### cURL Example
```bash
curl https://api.ora.example.com/api/v1/products/918237461 \
  -H "X-API-Key: ora_sk_live_YOUR_STORE_SECRET_KEY"
```

---

### 3.5 Update / Override Product

Updates specified fields of an existing product. Useful when adjusting price, descriptions, or inventory overrides.

Because this endpoint represents a deliberate manual correction, ORA marks the product `sourceTier: "tier4_manual"` and lowers `confidenceScore` to `0.5`. A later `/batch-sync` will overwrite both, so prefer `/batch-sync` for routine catalog updates and reserve `PATCH` for corrections that should not come from Shopify.

- **Method:** `PATCH`
- **Path:** `/api/v1/products/:id`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`
- **Updatable fields:** `name`, `description`, `price`, `currency`, `availability`, `stockQuantity`, `category`, `brand`, `attributes`

#### Request Body
```json
{
  "price": 79.99,
  "stockQuantity": 18,
  "availability": "in_stock"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "_id": "67cf8912e841203ab1234567",
    "nativeProductId": "918237461",
    "name": "Merino Wool Crewneck Sweater",
    "price": 79.99,
    "stockQuantity": 18,
    "availability": "in_stock",
    "sourceTier": "tier4_manual",
    "confidenceScore": 0.5
  }
}
```

---

### 3.6 Live Price & Stock Reconciliation

Pushes Shopify's authoritative price and stock for one product during a live voice conversation or checkout negotiation, so the AI agent quotes current values rather than the last sync.

**This is a write, not a check.** Any field you supply is stored on the product, `confidenceScore` is raised to `1.0`, `lastVerifiedAt` is stamped, and the values are cached in Redis for 15 minutes. Nothing is compared against a previous value, and no drift is reported — send only values you want to become authoritative.

An empty body still writes: `confidenceScore` and `lastVerifiedAt` are updated even when no price or stock is supplied. Use §3.4 (`GET /products/:id`) when you only want to read.

- **Method:** `POST`
- **Path:** `/api/v1/products/:id/verify-live`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`

#### Request Body
```json
{
  "price": 79.99,
  "stockQuantity": 18,
  "availability": "in_stock"
}
```

#### Response (`200 OK`)

The full product document, plus a computed `isLowStock` flag (true when `availability` is `in_stock` and `stockQuantity` is at or below `LOW_STOCK_THRESHOLD`, default `5`). There is no `verified` field and no `product` wrapper:

```json
{
  "success": true,
  "data": {
    "_id": "67cf8912e841203ab1234567",
    "nativeProductId": "918237461",
    "price": 79.99,
    "stockQuantity": 18,
    "availability": "in_stock",
    "confidenceScore": 1,
    "lastVerifiedAt": "2026-09-09T18:04:11.000Z",
    "isLowStock": false
  }
}
```

---

### 3.7 Delete Product

Removes a product from ORA and cleans up its vector search index. Accepts either the Mongo `_id` or the `nativeProductId`.

- **Method:** `DELETE`
- **Path:** `/api/v1/products/:id`
- **Header:** `X-API-Key: ora_sk_live_<YOUR_SECRET_KEY>`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Product deleted successfully."
  }
}
```

---

## 4. Real-Time Webhook Integration

In addition to batch API syncs, ORA provides a native webhook receiver for Shopify store webhooks.

- **Webhook URL:** `https://<YOUR_ORA_DOMAIN>/api/v1/ingestion/webhooks/shopify`
- **Signature Header:** `X-Shopify-Hmac-Sha256` *(required)*
- **Shop Domain Header:** `X-Shopify-Shop-Domain: <store>.myshopify.com` *(required)*
- **Topic Header:** `X-Shopify-Topic`
- **Delivery ID Header:** `X-Shopify-Webhook-Id` — used for idempotency; a repeated delivery ID is acknowledged without reprocessing.

This endpoint takes no `X-API-Key`. The HMAC signature is the credential.

### Prerequisites

1. **`SHOPIFY_API_SECRET` must be set on the ORA server.** Signatures are verified against your Shopify **app's** shared secret, which is one value for the whole ORA deployment rather than a per-store setting. With it unset, every webhook is rejected.
2. **The merchant's `shopifyStoreUrl` must match the sending store.** ORA resolves the tenant solely by matching `X-Shopify-Shop-Domain` against `Business.shopifyStoreUrl`; a `businessId` in the body or a header is never trusted. If no merchant matches, the request returns `400 BAD_REQUEST` regardless of a valid signature.

Signature verification is enforced in every environment. An invalid or malformed signature returns `401 Unauthorized`.

### Supported Webhook Topics

1. `products/create` — Creates the product in ORA and computes vector embeddings.
2. `products/update` — Updates price, variants, stock, and descriptions.
3. `products/delete` — Deletes the product and removes its vector index.
4. `inventory_levels/update` — Updates stock quantities and switches `in_stock` / `out_of_stock` status.

Any other topic is acknowledged with `200 OK` and logged as unhandled, so subscribing to extra topics is harmless but has no effect.

---

## 5. Storefront Frontend Embedding (Shopify Liquid)

To display ORA's live AI Voice orb and conversational sales widget on your Shopify storefront, add the following snippet before `</body>` in your theme's `layout/theme.liquid` (or as a Shopify App Embed Block):

```liquid
{% comment %} ORA AI Voice & Conversational Sales Assistant {% endcomment %}
<script
  src="https://app.ora.example.com/widget/ora-widget.js"
  data-ora-key="biz_live_89a2b1c4e7f09312"
  data-ora-api="https://api.ora.example.com"
  defer>
</script>
```

Note the two different origins: `src` loads the widget bundle from the ORA **web application** origin, which serves the static asset, while `data-ora-api` points at the **API** origin. The API server hosts no static files, so pointing `src` at it returns `404`. Copy the exact snippet from **ORA Dashboard → Setup → Integration**, which fills in both origins and the merchant's real publishable key.

> **Notice:** The storefront widget uses `biz_live_...` (the public publishable key). It will **never** expose or require your `ora_sk_live_...` secret key.

---

## 6. Reference Implementation (Node.js / TypeScript)

Here is a production-ready client class for your Shopify App or worker service:

```typescript
import axios, { AxiosInstance } from 'axios';

export interface OraProductInput {
  nativeProductId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  stockQuantity?: number;
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued';
  category?: string;
  brand?: string;
  images?: string[];
  attributes?: Record<string, any>;
  sourceTier?: 'tier1_connector';
}

export class OraShopifyClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, secretApiKey: string) {
    if (!secretApiKey.startsWith('ora_sk_live_')) {
      console.warn('[OraClient] Warning: Expected secret key starting with ora_sk_live_');
    }

    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        'X-API-Key': secretApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  /** Unwraps ORA's { success, data } envelope. */
  private unwrap<T>(body: any): T {
    return body?.data ?? body;
  }

  /**
   * Bulk sync Shopify products to ORA with automatic vector re-indexing.
   * This is the idempotent entry point: use it for both first import and
   * every resync.
   */
  async batchSyncProducts(products: OraProductInput[]) {
    const payload = {
      sourceTier: 'tier1_connector',
      products: products.map((p) => ({
        ...p,
        availability: p.availability || ((p.stockQuantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock'),
      })),
    };

    const response = await this.client.post('/products/batch-sync', payload);
    return this.unwrap<{
      upsertedCount: number;
      modifiedCount: number;
      matchedCount: number;
    }>(response.data);
  }

  /**
   * Create a single product. Throws 409 PRODUCT_ALREADY_EXISTS if the
   * nativeProductId is already in the catalog -- batchSyncProducts is the
   * upsert, this is not.
   */
  async createProduct(product: OraProductInput) {
    const response = await this.client.post('/products', {
      sourceTier: 'tier1_connector',
      ...product,
    });
    return this.unwrap(response.data);
  }

  /**
   * Update price or inventory for an existing product. Marks the product as a
   * manual override (tier4_manual), so prefer batchSyncProducts for routine
   * catalog updates.
   */
  async updateProduct(nativeProductId: string, updates: Partial<OraProductInput>) {
    const response = await this.client.patch(
      `/products/${encodeURIComponent(nativeProductId)}`,
      updates,
    );
    return this.unwrap(response.data);
  }

  /**
   * Push authoritative price and stock during a live voice session. This
   * writes the supplied values onto the product.
   */
  async reconcileLive(
    nativeProductId: string,
    live: { price?: number; stockQuantity?: number; availability?: OraProductInput['availability'] },
  ) {
    const response = await this.client.post(
      `/products/${encodeURIComponent(nativeProductId)}/verify-live`,
      live,
    );
    return this.unwrap<{ isLowStock: boolean; price: number; stockQuantity: number }>(
      response.data,
    );
  }

  /**
   * Delete a product when removed from Shopify. Accepts the nativeProductId.
   */
  async deleteProduct(nativeProductId: string) {
    const response = await this.client.delete(
      `/products/${encodeURIComponent(nativeProductId)}`,
    );
    return this.unwrap<{ message: string }>(response.data);
  }

  /**
   * Query products from ORA. `limit` is capped at 100.
   */
  async listProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    brand?: string;
  }) {
    const response = await this.client.get('/products', { params });
    return this.unwrap<{
      items: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(response.data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example Usage in a Shopify App Sync Worker:
// ─────────────────────────────────────────────────────────────────────────────
async function runCatalogSync(shopifyProducts: any[]) {
  const ora = new OraShopifyClient(
    process.env.ORA_API_URL || 'https://api.ora.example.com/api/v1',
    process.env.ORA_SECRET_KEY!, // 'ora_sk_live_...'
  );

  const formattedProducts: OraProductInput[] = shopifyProducts.map((sp) => {
    const primaryVariant = sp.variants?.[0] || {};
    const inventory = primaryVariant.inventory_quantity || 0;

    return {
      nativeProductId: String(sp.id),
      name: sp.title,
      description: sp.body_html?.replace(/<[^>]*>?/gm, '') || '', // strip HTML tags
      price: parseFloat(primaryVariant.price || '0'),
      currency: 'USD',
      stockQuantity: inventory,
      // Derived from inventory, never from Shopify's publication `status`.
      availability: inventory > 0 ? 'in_stock' : 'out_of_stock',
      category: sp.product_type || 'General',
      brand: sp.vendor,
      images: sp.images?.map((img: any) => img.src) || [],
      // Anything without a first-class ORA field belongs here; unknown
      // top-level properties are rejected with 400 BAD_REQUEST.
      attributes: {
        handle: sp.handle,
        tags: sp.tags,
      },
    };
  });

  const result = await ora.batchSyncProducts(formattedProducts);
  console.log(`[ORA Sync Success] Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
}
```

---

## 7. Error Codes & Troubleshooting

All errors arrive in the failure envelope shown in §1, with the code below in `error.code`.

| HTTP Status | Error Code | Meaning | Remediation |
|---|---|---|---|
| `401 Unauthorized` | `INVALID_API_KEY` | Unknown or revoked key, or the merchant's tenant is not `active`. | Check the `X-API-Key` header. Verify you are not sending a publishable key (`biz_live_...`). Issue a new key with `POST /business/secret-key` — an existing key's plaintext cannot be re-read. |
| `401 Unauthorized` | `AUTHENTICATION_REQUIRED` | Neither `X-API-Key` nor a valid token was supplied. | Include `X-API-Key: ora_sk_live_...` in your request headers. |
| `400 Bad Request` | `BAD_REQUEST` | Missing required field, failed validation constraint, unknown property, or `limit` above `100`. | Read `error.message`, which lists every violation joined with `; `. Move non-standard Shopify fields into `attributes`. |
| `403 Forbidden` | `insufficient_scope` | The credential lacks a scope the route requires. Applies to OAuth machine tokens; a secret API key holds every scope. | Reissue the machine client with `products:read` / `products:write`. |
| `404 Not Found` | `PRODUCT_NOT_FOUND` | The specified `nativeProductId` or `_id` does not exist in this merchant store. | Verify the identifier, or run an initial batch sync. |
| `409 Conflict` | `PRODUCT_ALREADY_EXISTS` | `POST /products` was called with a `nativeProductId` already in the catalog. | Use `POST /products/batch-sync` for idempotent syncing, or `PATCH /products/:id` to modify the existing product. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected server fault. | Retry with backoff. Quote `error.correlationId` when reporting it. |

### Rate Limits

Secret API key requests are not rate limited at present, so a sync worker should still batch its writes rather than issuing one request per product. If you need a documented, enforced quota, use **Method 2 (OAuth 2.0 client credentials)** instead: machine tokens are limited to **300 requests per minute per client**, and exceeding that returns `429` with `error.code: "rate_limit_exceeded"`.

---

## 8. Choosing Between Method 1 and Method 2

| | Method 1 — Secret API Key | Method 2 — OAuth 2.0 Client Credentials |
|---|---|---|
| Credential | Long-lived `ora_sk_live_...` | `client_id` + `client_secret`, exchanged for a 15-minute token |
| Setup | One dashboard call, paste into `.env` | `POST /api/v1/oauth/clients`, then `POST /api/v1/oauth/token` per token |
| Scopes | Full tenant access | Granular: `products:read`, `products:write`, `inputs:read`, `inputs:write` |
| Rate limit | None enforced | 300 requests/minute/client |
| IP allowlist | Not available | Optional per client |
| Best for | A merchant's own private sync worker | A multi-tenant app, or any integration that should hold least privilege |

A Shopify **App** distributed to many merchants should prefer Method 2, so each installation holds a narrowly scoped, individually revocable credential.
