# Tasks: Accounts & Authentication

**Input**: Design documents from `specs/002-accounts/`
**Traceability**: Implements requirements `FR-001` through `FR-015` from `spec.md`.

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/storefront-http.md`, `quickstart.md`

**Tests**: Required. The constitution requires TDD: write tests first, verify they fail for the missing behaviour, then implement.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment. Track B execution uses task briefs for exact allowed/forbidden scope.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label for traceability (`US1`, `US2`, `US3`, `US4`, `US5`)
- Every task includes concrete file paths

---

## Phase 1: Setup (Shared Test Data and Fixtures)

**Purpose**: Prepare reusable fixture data and test helpers for accounts and authentication.

- [x] T001 [P] Extend database seed in `db/seed.ts` to pre-seed the single Shop owner account with role `shop_owner` from environment variables `SHOP_OWNER_EMAIL` and `SHOP_OWNER_PASSWORD` (FR-012, FR-013).
- [x] T002 [P] Create auth test fixtures and helpers in `apps/api/src/modules/identity/identity-test-support.ts` and `apps/storefront/src/test/authFixtures.ts` for accounts, passwords, sessions, and cookies.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, storage migration, and password hashing that MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T003 [P] Add failing shared schema tests in `packages/shared/src/storefront/auth.test.ts` and implement Zod schemas in `packages/shared/src/storefront/auth.ts` and `packages/shared/src/index.ts` for `AccountSummary`, `RegisterRequest`, `LoginRequest`, `AuthResponse`, and `CurrentUserResponse` (FR-002, FR-005).
- [x] T004 [P] Add append-only database schema in `db/schema/identity.ts` and generate migrations in `db/migrations/` for `account`, `session`, and `failed_login_attempt` tables (FR-008, FR-010, FR-014).
- [x] T005 [P] Implement `scrypt` password hashing and verification in `apps/api/src/modules/identity/password-hasher.ts` with unit tests in `apps/api/src/modules/identity/password-hasher.spec.ts` using constant-time comparison (FR-008).
- [x] T006 Implement identity repository in `apps/api/src/modules/identity/identity.repository.ts` for account creation, lookup by normalized email, session CRUD, and failed attempt counting.

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 — Guest self-registers as a Customer (Priority: P1) 🎯 MVP

**Goal**: A Guest provides email and password (≥ 8 characters) to self-register as a Customer, immediately receiving an authenticated session without re-login.

**Independent Test**: Call `POST /api/auth/register` with valid credentials, verify HTTP 201 + `Set-Cookie: shop_session=...`, verify account row created with hashed password, and verify `/api/auth/me` returns the new Customer.

- [x] T007 [P] [US1] Add failing API integration tests in `apps/api/src/modules/identity/auth-register.int-spec.ts` for successful registration, duplicate email rejection (409), password length validation (400), and immediate session cookie issuance (FR-001, FR-002, FR-003, FR-004, FR-005).
- [x] T008 [US1] Implement registration endpoint and service logic in `apps/api/src/modules/identity/identity.service.ts` and `apps/api/src/modules/identity/identity.controller.ts` with cookie setting `shop_session` (FR-001, FR-004).
- [x] T009 [P] [US1] Add storefront registration page in `apps/storefront/src/pages/RegisterPage.tsx` and auth client methods in `apps/storefront/src/api/auth-client.ts`, with tests in `apps/storefront/src/pages/RegisterPage.test.tsx`.

**Checkpoint**: User Story 1 functional and independently testable.

---

## Phase 4: User Story 2 — Customer logs in to establish a session (Priority: P1)

**Goal**: A Customer submits email and password, establishing a session stored in PostgreSQL with sliding 30-day idle and 90-day absolute expiration.

**Independent Test**: Register an account, log in with valid credentials via `POST /api/auth/login`, verify session cookie is set, verify invalid credentials return HTTP 401 anti-disclosure message, and verify `GET /api/auth/me` returns the Customer.

- [ ] T010 [P] [US2] Add failing API integration tests in `apps/api/src/modules/identity/auth-login.int-spec.ts` for valid login, invalid credentials anti-disclosure (401), sliding idle expiration check, and `GET /api/auth/me` (FR-006, FR-007, FR-009, FR-014).
- [ ] T011 [US2] Implement login and current-user endpoints in `identity.service.ts` and `identity.controller.ts` with session persistence in PostgreSQL (FR-006, FR-007, FR-009).
- [ ] T012 [P] [US2] Add storefront login page in `apps/storefront/src/pages/LoginPage.tsx` and header auth state in `apps/storefront/src/components/AuthHeader.tsx` with tests in `apps/storefront/src/pages/LoginPage.test.tsx`.

**Checkpoint**: User Stories 1 and 2 functional and independently testable.

---

## Phase 5: User Story 3 — Customer logs out and invalidates the session (Priority: P1)

**Goal**: A Customer logs out, revoking the session row in PostgreSQL and clearing the session cookie.

**Independent Test**: Log in, call `POST /api/auth/logout`, verify session row is deleted in PostgreSQL, cookie is expired (`Max-Age=0`), and subsequent `GET /api/auth/me` returns Guest state.

- [ ] T013 [P] [US3] Add failing API integration tests in `apps/api/src/modules/identity/auth-logout.int-spec.ts` for session deletion and cookie clearing (FR-011).
- [ ] T014 [US3] Implement logout endpoint in `identity.service.ts` and `identity.controller.ts` (FR-011).
- [ ] T015 [US3] Connect logout button in `apps/storefront/src/components/AuthHeader.tsx` to call logout API and update storefront state to Guest.

**Checkpoint**: User Stories 1, 2, and 3 functional.

---

## Phase 6: User Story 4 — Protection against brute-force login attacks (Priority: P2)

**Goal**: Reject login attempts for an identifier for 15 minutes after 10 failed attempts within a 15-minute window.

**Independent Test**: Send 10 failed login attempts on an identifier within 15 minutes. Verify the 11th attempt returns HTTP 429 even with correct password. Verify successful login resets the failed counter.

- [ ] T016 [P] [US4] Add failing API integration tests in `apps/api/src/modules/identity/auth-rate-limit.int-spec.ts` for 10-attempt lockout trigger, lockout duration, and reset upon successful login (FR-010).
- [ ] T017 [US4] Implement sliding rate limit check in `identity.service.ts` recording and querying `failed_login_attempt` in PostgreSQL (FR-010).

**Checkpoint**: Brute-force protection verified.

---

## Phase 7: User Story 5 — Pre-seeded Shop owner account protection (Priority: P2)

**Goal**: Ensure exactly one Shop owner account exists from seed, with role `shop_owner`, and public registration cannot create admin accounts.

**Independent Test**: Verify seed creates the Shop owner account. Attempt registration with `role: "shop_owner"` and verify rejection or forced `customer` role.

- [ ] T018 [P] [US5] Add API integration tests in `apps/api/src/modules/identity/auth-shop-owner.int-spec.ts` verifying Shop owner login, role disclosure on `/api/auth/me`, and rejection of public admin registration (FR-012, FR-013).

---

## Phase 8: Polish, Cross-Cutting & Verification

**Purpose**: Module wiring, E2E journey, and four-command verification.

- [ ] T019 Register `IdentityModule` in `apps/api/src/app.module.ts` and verify logging middleware and error envelope filters apply to all auth routes.
- [ ] T020 [P] Create Playwright E2E journey in `e2e/auth-journey.e2e-spec.ts` testing registration, login, navigation across storefront with persistent session, logout, and rate limiting lockout.
- [ ] T021 Run and verify all four commands from `docs/baseline/verification.md`: `npm test`, `npm run lint`, `npm run test:regression`, `npm run build`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. MVP increment.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and US1 account schema.
- **User Story 3 (Phase 5)**: Depends on US2 session establishment.
- **User Story 4 (Phase 6)**: Depends on US2 login endpoint.
- **User Story 5 (Phase 7)**: Depends on Setup and US2 login.
- **Polish (Phase 8)**: Depends on all user stories being complete.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup (`db/seed.ts`, fixtures).
2. Complete Phase 2: Foundational (schemas, migrations, password hasher).
3. Complete Phase 3: User Story 1 (registration + immediate session).
4. Validate US1 independently before proceeding.

### Incremental Delivery

1. US1: Customer registration.
2. US2: Login and persistent session.
3. US3: Logout and session revocation.
4. US4: Brute-force rate limiting.
5. US5: Shop owner account protection.
6. Polish: E2E and four-command verification.
