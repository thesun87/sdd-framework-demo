# Phase 0 — Research: Accounts & Authentication

**Feature**: `002-accounts`
**Date**: 2026-09-23

## No unresolved Technical Context clarifications

All Technical Context values are pinned by the frozen Baseline (`baseline-0001-ecommerce`), existing feature `000` & `001` implementations, workspace package files, and `docs/tooling-versions.md`. No `NEEDS CLARIFICATION` remains.

| Topic | Source |
|---|---|
| Runtime/framework versions | Node.js `>=24.15`, TypeScript 5.9.x, NestJS 11.2.5, React 19.3.0, Drizzle ORM 0.45.2 |
| Verification commands | `docs/baseline/verification.md` (`npm test`, `npm run lint`, `npm run test:regression`, `npm run build`) |
| Account/Role semantics | `docs/baseline/glossary.md` (Guest, Customer, Shop owner), PRD FR-9, FR-10, FR-33 |
| Single origin & session storage | Architecture AD-8 (Server-side sessions in PostgreSQL, `httpOnly; Secure; SameSite=Lax` cookies, no tokens in Web Storage) |
| Email as identifier | Architecture AD-6 (Email is strictly an identifier, never a sending address; no email/SMS libraries) |
| Module boundaries | Architecture AD-5 (`identity` owns accounts and sessions) |
| Runtime dependency discipline | Architecture AD-16 (Runtime relies only on PostgreSQL + local filesystem; no Redis or external broker) |

---

## D-1 — Password Hashing with Built-in `node:crypto.scrypt`

**Decision**: Use Node.js built-in `crypto.scrypt` with a cryptographically secure random salt (at least 16 bytes) and standardized parameters (`N=16384, r=8, p=1`, 64-byte key). Store salt and hash together formatted as `scrypt$N=16384$salt$hash`.

**Rationale**:
- Standard password hashing algorithm recommended by OWASP.
- Built directly into Node.js runtime (`node:crypto`), requiring zero external dependencies, eliminating native build/compilation issues across Docker, Alpine, and CI.
- Constant-time comparison using `crypto.timingSafeEqual` prevents timing attacks during authentication.

**Alternatives considered**:
- `argon2` / `bcrypt` npm packages: Require native C++ compilation bindings, introducing version pinning fragility and container build overhead without necessity.
- Plain SHA-256 / MD5: Insecure and strictly forbidden.

---

## D-2 — Server-side Sessions in PostgreSQL with `httpOnly` Cookie

**Decision**: Store all sessions in a dedicated PostgreSQL table (`session`). Issue a cryptographically secure random token (32 bytes hex or base64url, 256-bit entropy) stored in an `HttpOnly; SameSite=Lax; Path=/` cookie named `shop_session`. Sessions have a 30-day sliding idle expiration (`last_active_at + 30 days`) and a 90-day absolute expiration (`created_at + 90 days`). Revocation (logout) is a physical row deletion from the `session` table.

**Rationale**:
- Directly enforces `AD-8`: tokens never enter `localStorage` or `sessionStorage` (preventing XSS credential theft).
- Satisfies immediate revocation required by `AD-7` and `FR-10`.
- Complies with PRD FR-10 session lifetime requirements.

**Alternatives considered**:
- Stateless JWT in cookie: JWTs cannot be revoked immediately on server logout or admin action without an external blocklist, violating AD-8 and AD-7.
- Redis-based sessions: Violates AD-16 (runtime dependencies must only be PostgreSQL + filesystem; no Redis allowed).

---

## D-3 — Brute-force Login Rate Limiting in PostgreSQL

**Decision**: Track failed login attempts in a PostgreSQL table `failed_login_attempt` recording `(email, attempted_at)`. When validating a login request, count failed attempts for that email within the last 15 minutes. If count >= 10, reject the attempt with HTTP 429 (or 401 with lockout message) before verifying password hash. On successful login, clear failed attempt records for that email.

**Rationale**:
- PRD FR-10 mandates: "Giới hạn số lần đăng nhập sai: 10 lần trên mỗi định danh trong 15 phút, sau đó từ chối thêm trong 15 phút. Không khoá tài khoản vĩnh viễn".
- Storing in PostgreSQL adheres strictly to AD-16 (no Redis/Memcached) and works reliably across multiple API worker instances and server restarts.

**Alternatives considered**:
- In-memory Map in NestJS process: Lost on server restart and fails to synchronize across multiple container replicas.
- Account lockout flag `locked_until` on account table: Does not protect against attacks where the email does not exist in the database (rate limit must apply to the identifier attempted).

---

## D-4 — Pre-seeded Shop Owner Account

**Decision**: Seed exactly one Shop owner account in `db/seed.ts` with role `shop_owner`, initialized with credentials defined by environment variables (e.g. `SHOP_OWNER_EMAIL`, `SHOP_OWNER_PASSWORD` with default fallbacks for development). The public registration endpoint (`POST /api/auth/register`) strictly sets `role: customer` and rejects any payload attempting to specify or override `role`.

**Rationale**:
- Directly enforces PRD FR-33: "Tài khoản chủ shop tồn tại từ lúc triển khai; không có luồng đăng ký quản trị nào; có đúng một tài khoản chủ shop".

**Alternatives considered**:
- First-time setup wizard: Unnecessary complexity and violates FR-33 requirement that account exists from deployment initialization.

---

## D-5 — Email Normalization and Anti-disclosure Error Messages

**Decision**:
1. All emails are trimmed and converted to lowercase (`email.trim().toLowerCase()`) on both registration and login before database query.
2. Failed login attempts return a generic message: `"Email hoặc mật khẩu không chính xác."` (HTTP 401). The response time and message are identical whether the email was found or not.

**Rationale**:
- Enforces FR-10: "thông báo lỗi không tiết lộ định danh đó có tồn tại hay không".
- Case-insensitivity ensures `User@Example.com` and `user@example.com` refer to the same account without duplicate conflicts.

---

## D-6 — Separate Storefront Auth vs Backoffice Auth Seams

**Decision**: In this feature, implement the Storefront Auth interface (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) using cookie `shop_session`. The authentication guard inspects `shop_session`. When Backoffice (`006`) is built later, it will use cookie `shop_admin_session` and enforce `role: shop_owner`, strictly satisfying AD-8.
