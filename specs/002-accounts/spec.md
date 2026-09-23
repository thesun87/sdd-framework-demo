# Feature Specification: Accounts & Authentication

**Feature Branch**: `002-accounts`

**Created**: 2026-09-23

**Status**: Draft

**Track**: B — brownfield feature. Baseline `baseline-0001-ecommerce` already exists, and this feature completes a capability listed in `docs/baseline/feature-map.md`: *"Khách tự đăng ký và đăng nhập; tài khoản chủ shop có sẵn từ lúc triển khai"*.

**Input**: User description: "Khách tự đăng ký và đăng nhập; tài khoản chủ shop có sẵn từ lúc triển khai"

**Baseline references**:

- `docs/baseline/feature-map.md`: `002-accounts`, depends on `000`, owns PRD FR-9, FR-10, FR-33, governed by AD-6, AD-8.
- `docs/baseline/prd.md`: §4.4 FR-9 (Đăng ký khách hàng), FR-10 (Đăng nhập và đăng xuất), FR-33 (Tài khoản chủ shop được tạo sẵn).
- `docs/baseline/architecture.md`: AD-5 (Ranh giới module là ranh giới dữ liệu - `identity`), AD-6 (Email là định danh, không bao giờ là địa chỉ gửi), AD-8 (Một origin, phiên lưu ở server, hai bề mặt không dùng chung cookie), AD-10 (Hợp đồng HTTP một nguồn sự thật trong `packages/shared`).
- `docs/baseline/glossary.md`: Guest, Customer, Shop owner.
- `docs/baseline/ux-spec.md`: Biểu mẫu đăng ký/đăng nhập, phản hồi lỗi bảo mật, trạng thái tài khoản trên storefront.

> **Derived artifact.** This specification refines PRD FR-9, FR-10, and FR-33 only. It does not add email/SMS verification channels, social login, customer profile management, self-service password reset, or cart integration (owned by `003-cart-and-wall`). If implementation requires external auth providers or email delivery, that is a scope and baseline conflict.

## Existing behaviour that must not change

Feature `000-walking-skeleton` and `001-catalog-browse` established public storefront browsing. These behaviours remain protected:

- A Guest can open the storefront, browse flat Categories, search Products accent-insensitively, paginate, and view Product details without being prompted or forced to log in.
- Product data and Stock status ("Còn hàng" / "Hết hàng") remain textual, fresh, and exact Stock remains strictly hidden from Guest and Customer.
- Single origin and security headers (CSP, X-Content-Type-Options, Referrer-Policy, HttpOnly cookie directives) remain intact.
- Preserved PostgreSQL invariant tests for stock ledger and constraints must continue to pass.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Guest self-registers as a Customer (Priority: P1)

A Guest provides an email address and a password to create a Customer account. Upon successful registration, the account is created, a server-side session is established immediately, and the user is authenticated as a Customer without needing to log in again.

**Why this priority**: FR-9 is the entry point for Customer identity. Without registration, Customers cannot exist and subsequent cart-persistence or order placement cannot function.

**Independent Test**: Send a registration request with valid email and password. Verify that the account record is persisted with a secure password hash, a session record is created in PostgreSQL, an `httpOnly; Secure; SameSite=Lax` session cookie is set, and the user can query `/api/auth/me` to get their Customer identity.

**Acceptance Scenarios**:

1. **Given** a Guest provides an email and a password of at least 8 characters, **When** they submit the registration form, **Then** an account is created with role `customer`, a session cookie is returned, and `/api/auth/me` returns the new Customer's email.
2. **Given** an account already exists with the email `user@example.com`, **When** another Guest attempts to register with `user@example.com` (or `USER@example.com`), **Then** the request is rejected with a clear message indicating the email is already registered.
3. **Given** a Guest provides a password shorter than 8 characters, **When** they attempt to register, **Then** the request is rejected with a validation error before creating any record.
4. **Given** registration succeeds, **When** inspecting the response and database, **Then** the password is never stored or returned in plaintext, and no verification email is triggered (AD-6).

---

### User Story 2 — Customer logs in to establish a session (Priority: P1)

A registered Customer provides their email and password to log in. Upon authentication, a new server-side session is created in PostgreSQL and returned as an `httpOnly` cookie. The session remains valid across page reloads and navigations.

**Why this priority**: FR-10 is essential for returning Customers to access their accounts.

**Independent Test**: Register a Customer account, clear the browser session cookie, and submit login credentials. Verify that valid credentials return HTTP 200 with the session cookie and invalid credentials return HTTP 401 without revealing whether the email exists.

**Acceptance Scenarios**:

1. **Given** a Customer with email `khach@example.com` and password `MatKhau123!`, **When** they submit correct credentials, **Then** a new session is recorded in the database, the session cookie is set, and the storefront reflects their logged-in status.
2. **Given** an incorrect password or an un-registered email, **When** login is submitted, **Then** the system returns HTTP 401 with a generic error message that does not disclose whether the email exists.
3. **Given** a Customer is logged in, **When** they reload the page or navigate between routes, **Then** `/api/auth/me` returns their identity using the session cookie.
4. **Given** an active session, **When** 30 days pass without activity or 90 days elapse from session creation, **Then** the session is expired and subsequent authenticated requests return HTTP 401.

---

### User Story 3 — Customer logs out and invalidates the session (Priority: P1)

A logged-in Customer chooses to log out. The system destroys the session record in PostgreSQL and clears the session cookie from the browser, returning the user to the Guest state.

**Why this priority**: FR-10 requires clean session termination to protect Customer privacy, especially on shared devices.

**Independent Test**: Log in as a Customer, call `POST /api/auth/logout`, verify that the database session row is deleted/revoked, the cookie is expired, and subsequent calls to `/api/auth/me` return Guest state.

**Acceptance Scenarios**:

1. **Given** a logged-in Customer, **When** they submit a logout request, **Then** the current session row is deleted from the PostgreSQL `session` table.
2. **Given** logout succeeds, **When** inspecting response headers, **Then** the session cookie is cleared with `Max-Age=0` (or expired `Expires`).
3. **Given** a logged-out user, **When** they query `/api/auth/me`, **Then** the response indicates an unauthenticated Guest.

---

### User Story 4 — Protection against brute-force login attacks (Priority: P2)

The system tracks failed login attempts per identifier (email). If an identifier reaches 10 consecutive failed attempts within a 15-minute window, subsequent login attempts for that identifier are rejected for 15 minutes.

**Why this priority**: FR-10 mandates rate limiting because without email/SMS unlock mechanisms (§7.2), permanent account lockout is forbidden, requiring a sliding temporary lockout instead.

**Independent Test**: Submit 10 consecutive invalid login attempts for an email within 15 minutes. Verify that the 11th attempt is rejected with HTTP 429 (or 401 with temporary lock notification), even if the 11th attempt uses the correct password.

**Acceptance Scenarios**:

1. **Given** 10 failed login attempts on `target@example.com` within 15 minutes, **When** an 11th login attempt is made within the 15-minute window, **Then** the system rejects the request due to rate limiting.
2. **Given** an identifier is under temporary lockout, **When** 15 minutes pass without new failed attempts, **Then** login attempts are accepted again.
3. **Given** a successful login occurs before reaching 10 failures, **When** authentication succeeds, **Then** the failed attempt counter for that identifier is reset.

---

### User Story 5 — Pre-seeded Shop owner account existence and protection (Priority: P2)

The single Shop owner account exists from deployment initialization via environment configuration or migration/seed. No public endpoint allows creating a Shop owner account.

**Why this priority**: FR-33 ensures the administrative boundary is strictly protected.

**Independent Test**: Inspect database seeds to verify the Shop owner account exists with role `shop_owner`. Attempt to register an account with role `shop_owner` via the public registration endpoint and verify it is either disallowed by schema or forced to `customer`.

**Acceptance Scenarios**:

1. **Given** database seed runs, **When** querying accounts, **Then** exactly one Shop owner account exists.
2. **Given** a Guest calls `POST /api/auth/register`, **When** the payload includes `role: "shop_owner"`, **Then** the request is rejected or the role is strictly forced to `customer`.
3. **Given** the Shop owner logs in with their credentials, **When** querying session info, **Then** the identity reflects `role: "shop_owner"`.

---

## Edge Cases

- Email casing and whitespace: Email input must be trimmed and converted to lowercase before lookup or insertion.
- Blank or missing fields: Empty email or password returns HTTP 400 validation error.
- Concurrent logins: A Customer may have multiple active sessions from different browsers; logging out from one browser revokes only that specific session.
- Database session cleanup: Expired sessions are ignored during validation and periodically cleaned.
- Cookie security: Cookie flags MUST include `HttpOnly`, `SameSite=Lax`, and `Secure` (in production/HTTPS environments).
- No external communications: At no point shall the system attempt to send an email or SMS for registration confirmation or password reset (AD-6).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(← PRD FR-9)*: The system MUST allow a Guest to self-register a Customer account using email and password without administrative intervention.
- **FR-002** *(← PRD FR-9)*: Registration MUST require only email and password; it MUST NOT request delivery address or personal details during registration.
- **FR-003** *(← PRD FR-9)*: The system MUST reject registration if the email already exists, returning a clear error message.
- **FR-004** *(← PRD FR-9)*: Successful registration MUST immediately establish an authenticated session for the new Customer without requiring a separate login step.
- **FR-005** *(← PRD FR-9)*: The system MUST enforce a minimum password length of 8 characters on the server side.
- **FR-006** *(← PRD FR-10)*: The system MUST authenticate a Customer or Shop owner upon providing valid email and password.
- **FR-007** *(← PRD FR-10)*: Invalid login attempts MUST be rejected with a generic message that does not disclose whether the email exists in the database.
- **FR-008** *(← PRD FR-10)*: Passwords MUST NEVER be stored or transmitted in readable plaintext; they MUST be hashed using a secure cryptographic algorithm (e.g. Scrypt or Argon2).
- **FR-009** *(← PRD FR-10)*: Sessions MUST expire after 30 days of inactivity, and MUST expire absolutely after 90 days from creation.
- **FR-010** *(← PRD FR-10)*: The system MUST track failed login attempts per identifier and reject further attempts for 15 minutes after 10 failed attempts within a 15-minute window.
- **FR-011** *(← PRD FR-10)*: Logging out MUST invalidate the current session in PostgreSQL and clear the session cookie.
- **FR-012** *(← PRD FR-33)*: Exactly one Shop owner account MUST exist from deployment/seed initialization; no public API or screen may allow creating a Shop owner account.
- **FR-013** *(← PRD FR-33)*: The Shop owner account MUST carry the administrative role and MUST NOT be permitted to place orders.
- **FR-014** *(← PRD FR-10, AD-8)*: Sessions MUST be stored as server-side records in PostgreSQL; authentication tokens MUST NOT be stored in browser `localStorage` or `sessionStorage`.
- **FR-015** *(← PRD FR-9, AD-6)*: Email MUST be used strictly as a login identifier; the system MUST NOT integrate email or SMS sending libraries or services.

### Key Entities

- **Account**: Represents an authenticated identity in the system. Attributes: `id`, `email` (unique, lowercase), `password_hash`, `role` (`customer` | `shop_owner`), timestamps.
- **Session**: Represents an active authenticated session stored in PostgreSQL. Attributes: `id` (cryptographically secure session token), `account_id`, `expires_at`, `last_active_at`, `created_at`.
- **FailedLoginAttempt**: Record tracking failed authentication attempts per identifier for rate limiting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid registration submissions create an account and immediately establish an active session verified by `/api/auth/me`.
- **SC-002**: 100% of duplicate email registrations are rejected with HTTP 409 or clear validation failure.
- **SC-003**: 100% of invalid login submissions return HTTP 401 without revealing identifier presence in error text.
- **SC-004**: When 10 invalid login attempts are made within 15 minutes on a single identifier, the 11th attempt is blocked by rate limiting.
- **SC-005**: 100% of session cookies are issued with `HttpOnly; SameSite=Lax`, and 0 authentication tokens are stored in browser Web Storage (`localStorage`/`sessionStorage`).
- **SC-006**: 100% of pre-existing catalog and stock invariant test suites continue to pass without regression.

## Assumptions

- Feature `000` and `001` provide the working PostgreSQL, NestJS API, Caddy proxy, and Storefront Vite client.
- The `identity` module operates as a distinct modular monolith domain bounded by `AD-5`.
- Cart and checkout integration with authentication is deferred to `003-cart-and-wall`.
- Password reset for Customers by the Shop owner is deferred to `011-password-reset` (FR-34).
