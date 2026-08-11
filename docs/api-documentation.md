# ORA Monorepo API Documentation — Authentication Phase

This document provides complete API reference specifications for the **Authentication Phase** (`/api/auth`), including endpoints, HTTP methods, headers, cookies, request DTOs, response envelope structures, and payload examples.

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
    code: string;           // E.g., 'INVALID_CREDENTIALS', 'EMAIL_ALREADY_EXISTS', 'TOKEN_THEFT_DETECTED'
    message: string;        // Human-readable explanation
    correlationId: string; // Unique request tracing ID (e.g. 'req-a1b2c3d4')
  };
}
```

---

## 2. Authentication Endpoints Summary

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

## 3. Detailed Endpoint Reference & Examples

### 3.1 `POST /api/auth/register`

Creates a new merchant account (`Business`) and primary owner account (`AdminUser`). Sends a 6-digit recipient verification OTP code via email.

- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Cookies Set:**
  - `refreshToken`: httpOnly, Secure, SameSite=Strict, Path=/api/auth, Max-Age=7 days
  - `sessionId`: httpOnly, Secure, SameSite=Strict, Path=/api/auth, Max-Age=7 days

#### Request Payload Body (`RegisterDto`)
```json
{
  "businessName": "Aura Commerce Store",
  "domain": "auracommerce.com",
  "name": "Alex Merchant",
  "email": "alex@auracommerce.com",
  "password": "SuperSecretPassword123!"
}
```

#### Response Example (201 Created)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "66b8d2e1a4f8901234567890",
      "name": "Alex Merchant",
      "email": "alex@auracommerce.com",
      "role": "owner",
      "emailVerified": false
    },
    "business": {
      "id": "66b8d2e1a4f890123456789f",
      "name": "Aura Commerce Store",
      "domain": "auracommerce.com",
      "publishableKey": "biz_live_8f3a91bc7d0e4129b0123456"
    }
  }
}
```

#### Error Example — Duplicate Email (409 Conflict)
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email address is already registered.",
    "correlationId": "req-9f8e7d6c"
  }
}
```

---

### 3.2 `POST /api/auth/login`

Authenticates an existing `AdminUser` via email and password.

- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Cookies Set:** `refreshToken`, `sessionId`

#### Request Payload Body (`LoginDto`)
```json
{
  "email": "alex@auracommerce.com",
  "password": "SuperSecretPassword123!"
}
```

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "66b8d2e1a4f8901234567890",
      "name": "Alex Merchant",
      "email": "alex@auracommerce.com",
      "role": "owner",
      "emailVerified": true
    },
    "business": {
      "id": "66b8d2e1a4f890123456789f",
      "name": "Aura Commerce Store",
      "domain": "auracommerce.com",
      "publishableKey": "biz_live_8f3a91bc7d0e4129b0123456"
    }
  }
}
```

---

### 3.3 `POST /api/auth/refresh`

Rotates the refresh token stored in `httpOnly` cookie and issues a fresh 15-minute Access Token.

- **URL:** `/api/auth/refresh`
- **Method:** `POST`
- **Cookies Required:** `refreshToken`, `sessionId`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Example — Token Theft / Mismatch (401 Unauthorized)
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_THEFT_DETECTED",
    "message": "Security alert: Invalid refresh token presented. Session revoked.",
    "correlationId": "req-1a2b3c4d"
  }
}
```

---

### 3.4 `POST /api/auth/logout`

Revokes the user's active session in Redis and clears authentication cookies.

- **URL:** `/api/auth/logout`
- **Method:** `POST`
- **Cookies Required:** `sessionId`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully."
  }
}
```

---

### 3.5 `GET /api/auth/me`

Retrieves profile details for the currently authenticated `AdminUser` and their merchant `Business`.

- **URL:** `/api/auth/me`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66b8d2e1a4f8901234567890",
      "name": "Alex Merchant",
      "email": "alex@auracommerce.com",
      "role": "owner",
      "emailVerified": true
    },
    "business": {
      "id": "66b8d2e1a4f890123456789f",
      "name": "Aura Commerce Store",
      "domain": "auracommerce.com",
      "publishableKey": "biz_live_8f3a91bc7d0e4129b0123456",
      "status": "active"
    }
  }
}
```

---

### 3.6 `POST /api/auth/verify-otp`

Validates a 6-digit OTP code sent to the merchant's email.

- **URL:** `/api/auth/verify-otp`
- **Method:** `POST`
- **Headers:**
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`

#### Request Payload Body (`VerifyOtpDto`)
```json
{
  "code": "482910"
}
```

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Email address successfully verified.",
    "emailVerified": true
  }
}
```

#### Error Example — Invalid OTP Code (400 Bad Request)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid verification code. 3 attempts remaining.",
    "correlationId": "req-5e6f7g8h"
  }
}
```

---

### 3.7 `POST /api/auth/resend-otp`

Triggers a new 6-digit OTP code email generation.

- **URL:** `/api/auth/resend-otp`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <accessToken>`

#### Response Example (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "New verification OTP sent to your email."
  }
}
```
