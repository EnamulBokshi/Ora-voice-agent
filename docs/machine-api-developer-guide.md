# ORA Machine & Partner API — Developer Integration Guide

A direct, server-to-server REST API for external applications (Shopify apps, WooCommerce connectors, ERPs, inventory sync workers, customer chat bots, and custom backends) to interact directly with **ORA**.

**Authentication is zero-login**: Simply pass your store's Secret API Key in the `X-API-Key` header with every request. No login endpoints, passwords, or token exchange dances required.

- **Base URL:** `https://<YOUR_ORA_HOST>/api/v1` (Local dev: `http://localhost:5000/api/v1`)
- **Authentication Header:** `X-API-Key: <YOUR_API_KEY>` (or `Authorization: Bearer <YOUR_API_KEY>`)
- **Content-Type:** `application/json` (or `multipart/form-data` for file uploads)

> ⚠️ **CRITICAL SECURITY REQUIREMENT**  
> This API is strictly **server-to-server**. Your `secretApiKey` must **never** be included in browser JavaScript, a public storefront theme, a mobile app binary, or client-side code. Store it securely in your backend environment variables.

---

## Table of Contents

1. [Quick Start & Authentication](#1-quick-start--authentication)
2. [Products API (Shopify / ERP Catalog Sync)](#2-products-api-shopify--erp-catalog-sync)
   - [2.1 Batch Sync Products (Primary Shopify Method)](#21-batch-sync-products-primary-shopify-method)
   - [2.2 Create Single Product](#22-create-single-product)
   - [2.3 List / Search Products](#23-list--search-products)
   - [2.4 Get Product by ID](#24-get-product-by-id)
   - [2.5 Update / Override Product](#25-update--override-product)
   - [2.6 Delete Product](#26-delete-product)
3. [Knowledge & Policy Ingestion API](#3-knowledge--policy-ingestion-api)
   - [3.1 Submit Text Document (Policies, FAQs)](#31-submit-text-document-policies-faqs)
   - [3.2 Upload File (PDF, TXT, CSV, MD, JSON)](#32-upload-file-pdf-txt-csv-md-json)
4. [User Prompts & Chat API](#4-user-prompts--chat-api)
   - [4.1 Submit Customer Prompt](#41-submit-customer-prompt)
   - [4.2 List Captured Prompt Sessions](#42-list-captured-prompt-sessions)
5. [Standard Response & Error Codes](#5-standard-response--error-codes)
6. [Reference Implementation (Node.js & Python)](#6-reference-implementation-nodejs--python)

---

## 1. Quick Start & Authentication

Every request is authenticated by including your API key in the `X-API-Key` header. 

```
[ External App / Shopify App / Worker ]
               │
               ▼  GET /api/v1/products
                  Header: X-API-Key: ora_sk_live_...
[ ORA Server (Instantly Authenticated & Scoped to Store) ]
```

### Where to get your API Key:
1. **Local Development:** When testing locally against `http://localhost:5000/api/v1`, use:
   ```http
   X-API-Key: ora_dev_key
   ```
   *(No setup or account creation required; immediately connects to the dev store).*

2. **Production:** Copy your store's secret key (`ora_sk_live_...`) from **Store Settings -> API Keys** in the ORA Merchant Dashboard.

---

## 2. Products API (Shopify / ERP Catalog Sync)

All product updates automatically generate semantic vector embeddings so ORA's AI Voice and Chat agents can recommend, discuss, and sell them immediately.

### 2.1 Batch Sync Products (Primary Shopify Method)

Atomically upserts a list of products matching on `nativeProductId`. If the product already exists, it is updated; if not, it is created.

- **Method:** `POST`
- **Endpoint:** `/api/v1/products/batch-sync`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X POST http://localhost:5000/api/v1/products/batch-sync \
  -H "X-API-Key: ora_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceTier": "tier1_connector",
    "products": [
      {
        "nativeProductId": "shopify_82910401",
        "name": "Wireless Noise-Canceling Headphones",
        "description": "Over-ear headphones with 30-hour battery life and active noise canceling.",
        "price": 299.99,
        "currency": "USD",
        "stockQuantity": 42,
        "availability": "in_stock",
        "category": "Electronics",
        "images": [
          "https://cdn.shopify.com/products/headphones_front.jpg"
        ]
      },
      {
        "nativeProductId": "shopify_82910402",
        "name": "Smart Fitness Watch",
        "description": "AMOLED display with heart rate and sleep tracking.",
        "price": 149.99,
        "currency": "USD",
        "stockQuantity": 20,
        "availability": "in_stock",
        "category": "Wearables"
      }
    ]
  }'
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

### 2.2 Create Single Product

- **Method:** `POST`
- **Endpoint:** `/api/v1/products`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "X-API-Key: ora_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "nativeProductId": "shopify_992101",
    "name": "Leather Travel Backpack",
    "description": "Full-grain leather backpack with padded 16-inch laptop compartment.",
    "price": 189.00,
    "currency": "USD",
    "stockQuantity": 15,
    "availability": "in_stock",
    "category": "Bags"
  }'
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "_id": "67128abc...",
    "nativeProductId": "shopify_992101",
    "name": "Leather Travel Backpack",
    "price": 189.00,
    "stockQuantity": 15,
    "availability": "in_stock",
    "category": "Bags"
  }
}
```

---

### 2.3 List / Search Products

- **Method:** `GET`
- **Endpoint:** `/api/v1/products`
- **Header:** `X-API-Key: <YOUR_API_KEY>`
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `search` (string, optional keyword query)
  - `category` (string, optional filter)
  - `availability` (`in_stock` | `out_of_stock`, optional)

```bash
curl -X GET "http://localhost:5000/api/v1/products?page=1&limit=20&search=Backpack" \
  -H "X-API-Key: ora_dev_key"
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "67128abc...",
        "nativeProductId": "shopify_992101",
        "name": "Leather Travel Backpack",
        "price": 189.00,
        "stockQuantity": 15,
        "availability": "in_stock",
        "category": "Bags"
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

---

### 2.4 Get Product by ID

- **Method:** `GET`
- **Endpoint:** `/api/v1/products/:id`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X GET http://localhost:5000/api/v1/products/67128abc... \
  -H "X-API-Key: ora_dev_key"
```

---

### 2.5 Update / Override Product

- **Method:** `PATCH`
- **Endpoint:** `/api/v1/products/:id`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X PATCH http://localhost:5000/api/v1/products/67128abc... \
  -H "X-API-Key: ora_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 169.99,
    "stockQuantity": 8
  }'
```

---

### 2.6 Delete Product

- **Method:** `DELETE`
- **Endpoint:** `/api/v1/products/:id`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X DELETE http://localhost:5000/api/v1/products/67128abc... \
  -H "X-API-Key: ora_dev_key"
```

---

## 3. Knowledge & Policy Ingestion API

Feed store policies, shipping rules, return policies, warranties, and FAQs directly into ORA's AI agent.

### 3.1 Submit Text Document (Policies, FAQs)

- **Method:** `POST`
- **Endpoint:** `/api/v1/user-inputs/document`
- **Header:** `X-API-Key: <YOUR_API_KEY>`
- **`docType` options:** `policy`, `brand_rule`, `faq`, `sales_playbook`, `uploaded_doc`, `product_manual`

```bash
curl -X POST http://localhost:5000/api/v1/user-inputs/document \
  -H "X-API-Key: ora_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "docType": "faq",
    "title": "International Shipping Rates",
    "content": "We ship to over 50 countries via DHL Express. Orders over $150 USD qualify for complimentary standard shipping.",
    "sourceUrl": "https://mystore.com/pages/shipping"
  }'
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "67139f...",
      "title": "International Shipping Rates",
      "docType": "faq"
    },
    "chunksCount": 1
  }
}
```

---

### 3.2 Upload File (PDF, TXT, CSV, MD, JSON)

Uploads raw documents, extracts text, and vectorizes them into knowledge embeddings automatically.

- **Method:** `POST`
- **Endpoint:** `/api/v1/user-inputs/upload`
- **Header:** `X-API-Key: <YOUR_API_KEY>`
- **Limits:** Max 10MB; allowed extensions: `.pdf`, `.txt`, `.md`, `.csv`, `.json`.

```bash
curl -X POST http://localhost:5000/api/v1/user-inputs/upload \
  -H "X-API-Key: ora_dev_key" \
  -F "file=@/path/to/shipping_guide.pdf" \
  -F "docType=policy" \
  -F "title=2026 Shipping Policy Guide"
```

---

## 4. User Prompts & Chat API

Forwards customer queries or messages from external channels (Shopify inbox, WhatsApp, Telegram, custom app) into ORA.

### 4.1 Submit Customer Prompt

- **Method:** `POST`
- **Endpoint:** `/api/v1/user-inputs/prompt`
- **Header:** `X-API-Key: <YOUR_API_KEY>`

```bash
curl -X POST http://localhost:5000/api/v1/user-inputs/prompt \
  -H "X-API-Key: ora_dev_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, do you ship to Vancouver and how long does it take?",
    "sessionId": "customer-thread-8812",
    "externalUserId": "cust_5510",
    "idempotencyKey": "msg_event_90214",
    "metadata": { "channel": "shopify_chat" }
  }'
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "67140e...",
    "sessionId": "customer-thread-8812",
    "channel": "api",
    "receivedAt": "2026-09-08T10:14:22.001Z"
  }
}
```

---

## 5. Standard Response & Error Codes

### Success Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid or revoked API key.",
    "correlationId": "req-9b81f3a2"
  }
}
```

### Common HTTP Status Codes

| Status | Code | Meaning |
|---|---|---|
| `401 Unauthorized` | `INVALID_API_KEY` | Missing, incorrect, or revoked `X-API-Key` |
| `400 Bad Request` | `Bad Request` | Validation failed (missing required field or invalid type) |
| `404 Not Found` | `NOT_FOUND` | Product or resource not found |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | Upload exceeds 10MB |
| `415 Unsupported Media` | `UNSUPPORTED_FILE_TYPE` | Extension not supported |

---

## 6. Reference Implementation (Node.js & Python)

### Node.js / TypeScript Helper Class

```typescript
import axios from 'axios';

export class OraClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Batch sync catalog products from Shopify / ERP
  async syncProducts(products: Array<Record<string, any>>) {
    const response = await axios.post(
      `${this.baseUrl}/products/batch-sync`,
      { sourceTier: 'tier1_connector', products },
      { headers: this.headers }
    );
    return response.data;
  }

  // Create a single product
  async createProduct(product: Record<string, any>) {
    const response = await axios.post(
      `${this.baseUrl}/products`,
      product,
      { headers: this.headers }
    );
    return response.data;
  }

  // Query catalog
  async listProducts(params: { page?: number; limit?: number; search?: string } = {}) {
    const response = await axios.get(
      `${this.baseUrl}/products`,
      { headers: this.headers, params }
    );
    return response.data;
  }
}

// ──────────────────────────────────────────────
// Example Usage:
// ──────────────────────────────────────────────
// const ora = new OraClient('http://localhost:5000/api/v1', 'ora_dev_key');
// await ora.syncProducts([
//   { nativeProductId: 'sku_1', name: 'Hoodie', price: 65, stockQuantity: 10 }
// ]);
```

---

### Python Helper

```python
import requests

class OraClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        })

    def sync_products(self, products: list):
        """Batch sync products from Shopify or ERP."""
        res = self.session.post(
            f"{self.base_url}/products/batch-sync",
            json={"sourceTier": "tier1_connector", "products": products}
        )
        res.raise_for_status()
        return res.json()

    def create_product(self, product: dict):
        """Create a single product."""
        res = self.session.post(
            f"{self.base_url}/products",
            json=product
        )
        res.raise_for_status()
        return res.json()

    def list_products(self, **params):
        """List products with pagination and search."""
        res = self.session.get(
            f"{self.base_url}/products",
            params=params
        )
        res.raise_for_status()
        return res.json()

# ──────────────────────────────────────────────
# Example Usage:
# ──────────────────────────────────────────────
# ora = OraClient("http://localhost:5000/api/v1", "ora_dev_key")
# res = ora.sync_products([
#     {"nativeProductId": "sku_1", "name": "Hoodie", "price": 65, "stockQuantity": 10}
# ])
# print(res)
```
