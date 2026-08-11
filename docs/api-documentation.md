# ORA Monorepo API Documentation

This document provides complete API reference specifications across all backend modules, detailing endpoints, HTTP methods, headers, cookies, request DTOs, response envelopes, query parameters, and JSON payload examples.

---

## 1. Global Response Specifications

All API endpoints in ORA return a standardized envelope structure.

### 1.1 Success Envelope Type
```typescript
interface SuccessEnvelope<T> {
  success: true;
  data: T;
}
```

### 1.2 Error Envelope Type
```typescript
interface ErrorEnvelope {
  success: false;
  error: {
    code: string;           // E.g., 'INVALID_CREDENTIALS', 'PRODUCT_NOT_FOUND', 'KNOWLEDGE_DOC_NOT_FOUND'
    message: string;        // Human-readable explanation
    correlationId: string; // Unique request tracing ID (e.g. 'req-a1b2c3d4')
  };
}
```

---

## 2. Phase 1: Authentication & User Management (`/api/auth`)

### Summary

| Endpoint | Method | Auth Guard | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Provision merchant `Business` & owner `AdminUser`. Generates OTP email & sets refresh cookies. |
| `/api/auth/login` | `POST` | Public | Authenticate `AdminUser` with email/password. Returns JWT Access Token & sets httpOnly refresh cookie. |
| `/api/auth/refresh` | `POST` | Public (Cookie) | Rotate Refresh Token and reissue 15-minute JWT Access Token. Revokes session if theft detected. |
| `/api/auth/logout` | `POST` | Public (Cookie) | Revokes active Redis session and clears httpOnly authentication cookies. |
| `/api/auth/me` | `GET` | `JwtAuthGuard` | Fetch current authenticated user profile & business info. |
| `/api/auth/verify-otp` | `POST` | `JwtAuthGuard` | Validate 6-digit email verification OTP. On success, sets `emailVerified: true`. |
| `/api/auth/resend-otp` | `POST` | `JwtAuthGuard` | Request a new 6-digit verification code sent via email. |

---

## 3. Phase 2: Product Catalog (`/api/products`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/products` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Create a new product record in merchant catalog. |
| `/api/products` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List & search catalog products with pagination & filters. |
| `/api/products/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single product details by ID. |
| `/api/products/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Update product details (price, stock, availability, tags). |
| `/api/products/:id` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Delete a product from tenant catalog. |
| `/api/products/batch-sync` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Bulk upsert products from feeds or platform webhooks. |
| `/api/products/:id/verify-live` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Perform live verification update of price & stock. |

---

### 3.1 `POST /api/products`

Creates a new product record.

- **URL:** `/api/products`
- **Method:** `POST`
- **Headers:**
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`

#### Request Payload Body (`CreateProductDto`)
```json
{
  "nativeProductId": "SKU-9021",
  "name": "Wireless Noise-Canceling Headphones",
  "description": "Premium over-ear headphones with active noise cancellation and 30-hour battery life.",
  "price": 299.99,
  "currency": "USD",
  "availability": "in_stock",
  "stockQuantity": 45,
  "images": [
    "https://cdn.auracommerce.com/images/sku-9021-front.jpg"
  ],
  "category": "Electronics",
  "attributes": {
    "color": "Matte Black",
    "connectivity": "Bluetooth 5.3"
  },
  "sourceTier": "tier1_connector"
}
```

#### Response Example (201 Created)
```json
{
  "success": true,
  "data": {
    "_id": "66b8e1f0a4f8901234567891",
    "businessId": "66b8d2e1a4f890123456789f",
    "nativeProductId": "SKU-9021",
    "name": "Wireless Noise-Canceling Headphones",
    "description": "Premium over-ear headphones with active noise cancellation and 30-hour battery life.",
    "price": 299.99,
    "currency": "USD",
    "availability": "in_stock",
    "stockQuantity": 45,
    "images": [
      "https://cdn.auracommerce.com/images/sku-9021-front.jpg"
    ],
    "category": "Electronics",
    "attributes": {
      "color": "Matte Black",
      "connectivity": "Bluetooth 5.3"
    },
    "sourceTier": "tier1_connector",
    "confidenceScore": 1.0,
    "isEmbedded": false,
    "lastVerifiedAt": "2026-08-11T15:55:00.000Z",
    "isActive": true,
    "timesRecommendedByAgent": 0,
    "timesUpsold": 0,
    "createdAt": "2026-08-11T15:55:00.000Z"
  }
}
```

---

### 3.2 `GET /api/products`

Retrieves a paginated list of catalog products filtered by tenant scope.

- **URL:** `/api/products`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `page`: number (default: `1`)
  - `limit`: number (default: `20`)
  - `search`: string (optional search term)
  - `category`: string (optional category filter)
  - `availability`: `in_stock` | `out_of_stock` | `preorder` | `discontinued`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "66b8e1f0a4f8901234567891",
        "nativeProductId": "SKU-9021",
        "name": "Wireless Noise-Canceling Headphones",
        "price": 299.99,
        "availability": "in_stock",
        "stockQuantity": 45,
        "category": "Electronics"
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

### 3.3 `POST /api/products/batch-sync`

Performs bulk upsert of catalog items from external platforms or feeds.

- **URL:** `/api/products/batch-sync`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Request Payload Body (`BatchSyncProductsDto`)
```json
{
  "sourceTier": "tier2_feed",
  "products": [
    {
      "nativeProductId": "FEED-101",
      "name": "Smart Fitness Watch",
      "price": 149.50,
      "availability": "in_stock",
      "stockQuantity": 120,
      "category": "Wearables"
    }
  ]
}
```

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "upsertedCount": 1,
    "modifiedCount": 0,
    "matchedCount": 0
  }
}
```

---

## 4. Phase 2: Context Feeding / Knowledge Base (`/api/knowledge`)

### Summary

| Endpoint | Method | Auth Guard | Roles | Description |
|---|---|---|---|---|
| `/api/knowledge` | `POST` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Create store context document & auto-chunk text. |
| `/api/knowledge` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | List store knowledge base documents for tenant. |
| `/api/knowledge/:id` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Fetch single knowledge base document. |
| `/api/knowledge/:id/chunks` | `GET` | `JwtAuthGuard`, `TenantScopeGuard` | All Roles | Retrieve chunked text snippets for document. |
| `/api/knowledge/:id` | `PATCH` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Update document title/content & re-chunk. |
| `/api/knowledge/:id` | `DELETE` | `JwtAuthGuard`, `TenantScopeGuard` | Owner, Admin | Delete document and cascade delete its chunks. |

---

### 4.1 `POST /api/knowledge`

Adds a context document (e.g. Return Policy, FAQ, Sales Rules) and automatically chunks it into ~500 character snippets for vector index ingestion.

- **URL:** `/api/knowledge`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Request Payload Body (`CreateKnowledgeDocDto`)
```json
{
  "docType": "policy",
  "title": "30-Day Return Policy & Shipping Rules",
  "content": "We offer a hassle-free 30-day money-back guarantee for all original unopened products. Customers can initiate a return through the merchant portal. Domestic orders over $50 qualify for free standard shipping (3-5 business days). International express shipping takes 5-7 business days depending on destination customs clearance.",
  "sourceUrl": "https://auracommerce.com/pages/returns"
}
```

#### Response Example (201 Created)
```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "66b8f3a0a4f89012345678a2",
      "businessId": "66b8d2e1a4f890123456789f",
      "docType": "policy",
      "title": "30-Day Return Policy & Shipping Rules",
      "content": "We offer a hassle-free 30-day money-back guarantee...",
      "sourceUrl": "https://auracommerce.com/pages/returns",
      "isActive": true,
      "createdAt": "2026-08-11T15:55:00.000Z"
    },
    "chunksCount": 1
  }
}
```

---

### 4.2 `GET /api/knowledge/:id/chunks`

Retrieves all chunk snippets generated for a given knowledge base document.

- **URL:** `/api/knowledge/66b8f3a0a4f89012345678a2/chunks`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "66b8f3a0a4f89012345678c9",
      "businessId": "66b8d2e1a4f890123456789f",
      "knowledgeBaseId": "66b8f3a0a4f89012345678a2",
      "text": "We offer a hassle-free 30-day money-back guarantee for all original unopened products. Customers can initiate a return through the merchant portal. Domestic orders over $50 qualify for free standard shipping (3-5 business days). International express shipping takes 5-7 business days depending on destination customs clearance.",
      "chunkIndex": 0,
      "metadata": {
        "docTitle": "30-Day Return Policy & Shipping Rules",
        "docType": "policy"
      }
    }
  ]
}
```
