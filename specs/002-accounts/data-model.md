# Data Model: Accounts & Authentication

**Feature**: `002-accounts`
**Date**: 2026-09-23

## 1. Domain Entities & Bounded Context

Governed by `AD-5` (Module boundaries are data boundaries), all account and session persistence belongs strictly to the `identity` module. No other module writes to or directly joins these tables.

```
+---------------------------------------------------------+
|                    identity Module                      |
|                                                         |
|  +--------------------+         +--------------------+  |
|  |      account       | 1     * |      session       |  |
|  |--------------------|<--------|--------------------|  |
|  | id (PK)            |         | id (PK, token)     |  |
|  | email (UQ)         |         | account_id (FK)    |  |
|  | password_hash      |         | expires_at         |  |
|  | role               |         | last_active_at     |  |
|  | created_at         |         | created_at         |  |
|  | updated_at         |         +--------------------+  |
|  +--------------------+                                 |
|                                                         |
|  +---------------------------+                          |
|  |   failed_login_attempt    |                          |
|  |---------------------------|                          |
|  | id (PK)                   |                          |
|  | email                     |                          |
|  | attempted_at              |                          |
|  +---------------------------+                          |
+---------------------------------------------------------+
```

---

## 2. Table Specifications

### 2.1 `account`

Stores registered user credentials and administrative role.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Unique internal account identifier |
| `email` | `varchar(255)` | `NOT NULL`, `UNIQUE` | Normalized (lowercase, trimmed) login identifier |
| `password_hash` | `text` | `NOT NULL` | Cryptographic scrypt hash string (`scrypt$N=16384$...`) |
| `role` | `varchar(32)` | `NOT NULL` | Enum: `'customer'` or `'shop_owner'`. Defaults to `'customer'` |
| `created_at` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Account creation timestamp |
| `updated_at` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Last update timestamp |

**Indexes**:
- `account_email_unique_idx`: `UNIQUE (email)`

---

### 2.2 `session`

Stores active server-side sessions. Each row corresponds to an active browser session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `varchar(64)` | `PRIMARY KEY` | Cryptographically secure random session token (entropy ≥ 256 bits) |
| `account_id` | `integer` | `NOT NULL`, `REFERENCES account(id) ON DELETE CASCADE` | Owner account |
| `expires_at` | `timestamp with time zone` | `NOT NULL` | Hard absolute expiration (`created_at + 90 days`) |
| `last_active_at` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Sliding activity timestamp (idle timeout if `now() - last_active_at > 30 days`) |
| `created_at` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Session creation timestamp |

**Indexes**:
- `session_account_id_idx`: `INDEX (account_id)`
- `session_expires_at_idx`: `INDEX (expires_at)`

---

### 2.3 `failed_login_attempt`

Tracks failed login attempts for temporary brute-force rate limiting (10 attempts / 15 minutes).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Attempt record id |
| `email` | `varchar(255)` | `NOT NULL` | Normalized email identifier attempted |
| `attempted_at` | `timestamp with time zone` | `NOT NULL`, `DEFAULT now()` | Failure timestamp |

**Indexes**:
- `failed_login_email_attempted_at_idx`: `INDEX (email, attempted_at)`

---

## 3. Drizzle ORM Schema (`db/schema/identity.ts`)

```typescript
import { pgTable, serial, text, varchar, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const accountRoleEnum = ['customer', 'shop_owner'] as const;
export type AccountRole = (typeof accountRoleEnum)[number];

export const account = pgTable(
  'account',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 32 }).$type<AccountRole>().notNull().default('customer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex('account_email_unique_idx').on(table.email),
  }),
);

export const session = pgTable(
  'session',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => account.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdIdx: index('session_account_id_idx').on(table.accountId),
    expiresAtIdx: index('session_expires_at_idx').on(table.expiresAt),
  }),
);

export const failedLoginAttempt = pgTable(
  'failed_login_attempt',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailAttemptedAtIdx: index('failed_login_email_attempted_at_idx').on(table.email, table.attemptedAt),
  }),
);
```

---

## 4. Lifecycle & Session State Transitions

1. **Registration**:
   - Validate email format + password >= 8 characters.
   - Insert `account` with `role: 'customer'`, normalized lowercase email.
   - Generate secure session token `S`, calculate `expires_at = now() + 90 days`.
   - Insert `session` record.
   - Return HTTP 201 with `Set-Cookie: shop_session=S; HttpOnly; SameSite=Lax; Path=/`.

2. **Login**:
   - Check `failed_login_attempt` count for email in `[now() - 15 minutes, now()]`. If >= 10, reject with HTTP 429.
   - Query `account` by normalized email.
   - Verify `scrypt` hash with `crypto.timingSafeEqual`.
   - If invalid: insert `failed_login_attempt`, return HTTP 401 `"Email hoặc mật khẩu không chính xác."`.
   - If valid: delete failed attempts for this email, generate session token `S`, insert `session`, return HTTP 200 + cookie.

3. **Session Verification (`GET /api/auth/me`)**:
   - Read `shop_session` cookie value. If absent -> return `{ account: null }` (Guest).
   - Query `session` where `id = cookieValue`.
   - If missing, or `now() > expires_at`, or `now() - last_active_at > 30 days`:
     - Delete session if expired, clear cookie, return `{ account: null }`.
   - Update `last_active_at = now()` (sliding window).
   - Return `{ account: { id, email, role } }`.

4. **Logout (`POST /api/auth/logout`)**:
   - Read `shop_session` cookie value.
   - Delete `session` where `id = cookieValue`.
   - Clear cookie with `Max-Age=0`.
   - Return HTTP 200.
