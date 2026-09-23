# Storefront HTTP Contract: Accounts & Authentication

**Feature**: `002-accounts`
**Date**: 2026-09-23

All schemas are defined in `packages/shared/src/storefront/auth.ts` and exported via `packages/shared/src/index.ts` (AD-10).

---

## 1. Endpoints

### 1.1 `POST /api/auth/register`

Register a new Customer account and immediately establish an authenticated session.

- **Access**: Public (Guest)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!"
  }
  ```
- **Validation**:
  - `email`: valid email format, string length 3..255.
  - `password`: string, minimum 8 characters, maximum 128 characters.
  - Any extra fields (such as `role`) are stripped or rejected.
- **Success Response**: `HTTP 201 Created`
  - **Headers**:
    `Set-Cookie: shop_session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000`
  - **Body**:
    ```json
    {
      "account": {
        "id": 1,
        "email": "customer@example.com",
        "role": "customer"
      }
    }
    ```
- **Error Responses**:
  - `HTTP 400 Bad Request`: Validation failure (e.g. password < 8 characters).
    ```json
    {
      "code": "VALIDATION_ERROR",
      "message": "Mật khẩu phải có tối thiểu 8 ký tự."
    }
    ```
  - `HTTP 409 Conflict`: Email already registered.
    ```json
    {
      "code": "EMAIL_ALREADY_EXISTS",
      "message": "Email này đã được đăng ký tài khoản."
    }
    ```

---

### 1.2 `POST /api/auth/login`

Authenticate with email and password to start a new session.

- **Access**: Public (Guest)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response**: `HTTP 200 OK`
  - **Headers**:
    `Set-Cookie: shop_session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000`
  - **Body**:
    ```json
    {
      "account": {
        "id": 1,
        "email": "customer@example.com",
        "role": "customer"
      }
    }
    ```
- **Error Responses**:
  - `HTTP 401 Unauthorized`: Invalid email or password (anti-disclosure).
    ```json
    {
      "code": "INVALID_CREDENTIALS",
      "message": "Email hoặc mật khẩu không chính xác."
    }
    ```
  - `HTTP 429 Too Many Requests`: 10 failed attempts within 15 minutes.
    ```json
    {
      "code": "TOO_MANY_ATTEMPTS",
      "message": "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút."
    }
    ```

---

### 1.3 `POST /api/auth/logout`

Terminate the current session and clear the session cookie.

- **Access**: Public / Authenticated
- **Success Response**: `HTTP 200 OK`
  - **Headers**:
    `Set-Cookie: shop_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  - **Body**:
    ```json
    {
      "success": true
    }
    ```

---

### 1.4 `GET /api/auth/me`

Retrieve the current authenticated identity from the `shop_session` cookie.

- **Access**: Public (returns null if unauthenticated Guest)
- **Success Response**: `HTTP 200 OK`
  - If authenticated:
    ```json
    {
      "account": {
        "id": 1,
        "email": "customer@example.com",
        "role": "customer"
      }
    }
    ```
  - If unauthenticated Guest or session expired:
    ```json
    {
      "account": null
    }
    ```

---

## 2. Shared Zod Schemas (`packages/shared/src/storefront/auth.ts`)

```typescript
import { z } from 'zod';

export const AccountRoleSchema = z.enum(['customer', 'shop_owner']);
export type AccountRole = z.infer<typeof AccountRoleSchema>;

export const AccountSummarySchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: AccountRoleSchema,
});
export type AccountSummary = z.infer<typeof AccountSummarySchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email('Email không đúng định dạng').max(255).transform((val) => val.trim().toLowerCase()),
  password: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Email không đúng định dạng').max(255).transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  account: AccountSummarySchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const CurrentUserResponseSchema = z.object({
  account: AccountSummarySchema.nullable(),
});
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
```
