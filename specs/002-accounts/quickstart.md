# Quickstart: Accounts & Authentication

**Feature**: `002-accounts`
**Date**: 2026-09-23

## 1. Prerequisites & Environment Setup

Ensure PostgreSQL is running via Docker Compose and environment variables are active:

```bash
# 1. Start PostgreSQL container
docker compose -f ops/compose.yaml up -d postgres

# 2. Run migrations
npm run db:migrate

# 3. Seed initial data (includes the single Shop owner account)
npm run db:seed
```

---

## 2. Four Verification Commands

In accordance with the project constitution and `docs/baseline/verification.md`, run:

```bash
# Unit & integration tests
npm test

# Linting and TypeScript type checks across all workspaces
npm run lint

# Regression test suite (Unit + E2E Playwright)
npm run test:regression

# Production build across all workspaces
npm run build
```

---

## 3. Manual Testing / API Verification

### Register a new Customer
```bash
curl -i -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"khach1@example.com","password":"MatKhau123!"}' \
  -c cookies.txt
```
*Expected*: HTTP 201 Created, `Set-Cookie: shop_session=...; HttpOnly; SameSite=Lax`.

### Query current session
```bash
curl -i -X GET http://localhost/api/auth/me \
  -b cookies.txt
```
*Expected*: HTTP 200 OK, returns `{ "account": { "id": 1, "email": "khach1@example.com", "role": "customer" } }`.

### Logout
```bash
curl -i -X POST http://localhost/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```
*Expected*: HTTP 200 OK, `Set-Cookie: shop_session=; Max-Age=0`.

### Verify unauthenticated after logout
```bash
curl -i -X GET http://localhost/api/auth/me \
  -b cookies.txt
```
*Expected*: HTTP 200 OK, returns `{ "account": null }`.

### Brute-force rate limiting check
Submit invalid password 10 times consecutively:
```bash
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"khach1@example.com","password":"SaiMatKhau"}'
done
```
*Expected*: 1st to 10th request return `401`, 11th request returns `429`.
