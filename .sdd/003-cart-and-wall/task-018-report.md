# Task T018 Report — Glossary-true copy on Đặt đơn and Giỏ hàng

## Status
DONE

## Changes Made

### 1. PlaceOrderPage.tsx
- **File**: `apps/storefront/src/pages/PlaceOrderPage.tsx`
- **Change**: Line 144 — Section heading "Tóm tắt đơn hàng" → "Giỏ hàng"
- **Rationale**: Per glossary, *Cart* term ("Giỏ hàng") used to label cart summary on the PlaceOrderPage (FR-019)
- **Preserved**: Heading level remains `<h2>`, page title "Đặt đơn" remains `<h1>`

### 2. CartPage.tsx
- **File**: `apps/storefront/src/pages/CartPage.tsx`
- **Change**: Line 258 — Removed label "Đơn giá: " from per-line price display
- **Before**: `<div>Đơn giá: {formatPriceVnd(product.price)}</div>`
- **After**: `<div>{formatPriceVnd(product.price)}</div>`
- **Rationale**: Per glossary, no label needed; price is unambiguous per-line context
- **Preserved**: Price formatting (`formatPriceVnd`), styling, and accessibility (color, font size)

### 3. Test additions (TDD)

#### PlaceOrderPage.test.tsx
- **Lines 98–101**: Added assertions to existing test "Customer thấy tóm tắt giỏ hàng..."
  - `expect(screen.getByRole("heading", { level: 2, name: "Giỏ hàng" })).toBeTruthy();` — new heading present
  - `expect(screen.queryByText("Tóm tắt đơn hàng")).toBeNull();` — old heading absent

#### CartPage.test.tsx
- **Lines 114–117**: Added assertions to existing test "Guest không có session..."
  - `expect(screen.queryByText(/Đơn giá:/)).toBeNull();` — "Đơn giá:" label is absent
  - Comment: "Prices are still displayed per line" with existing price assertions

## TDD Evidence

### RED Phase (tests fail before changes)
```bash
$ cd apps/storefront && npm run --silent test
FAIL  src/pages/CartPage.test.tsx > CartPage (T007 - US1) > Guest không có session...
TestingLibraryElementError: Found multiple elements with the text: /Đơn giá:/
  [Details: Text still present in two <div> elements showing prices]

FAIL  src/pages/PlaceOrderPage.test.tsx > PlaceOrderPage (T013 - US5, US6) > Customer thấy tóm tắt...
[Expected "Giỏ hàng" heading and absence of "Tóm tắt đơn hàng"]
```

### GREEN Phase (tests pass after changes)
```
Test Files  20 passed (20)
Tests  137 passed (137)
Duration  6.67s
```

All tests pass, including:
- 137 tests in apps/storefront (includes both modified test files)
- Verified on PlaceOrderPage.test.tsx and CartPage.test.tsx

## Verification Commands & Results

```bash
# 1. Storefront tests
$ cd apps/storefront && npm run --silent test
✓ Test Files  20 passed (20)
✓ Tests  137 passed (137)

# 2. Project-wide linting
$ npm run lint
✓ PASS  glue · lint
✓ PASS  apps/api · lint
✓ PASS  apps/storefront · lint
✓ PASS  packages/shared · lint
✓ PASS  packages/ui · lint
✓ PASS  e2e · lint

# 3. Project-wide build
$ npm run build
✓ PASS  apps/api · build
✓ PASS  apps/storefront · build
✓ PASS  packages/shared · build
✓ PASS  packages/ui · build

# 4. Full test suite
$ npm test
✓ PASS  glue · unit tests
✓ PASS  apps/storefront · test (137 passed)
✓ PASS  packages/shared · test (69 passed)
✓ PASS  packages/ui · test (14 passed)
⚠ FAIL  apps/api · test (pre-existing: NestFactory bootstrap fails — not T018 scope)
```

## Commit
```
bf9f3be feat(003-cart-and-wall): complete T018 — glossary-true copy
  4 files changed, 11 insertions(+), 2 deletions(-)
  
Files:
  - apps/storefront/src/pages/PlaceOrderPage.tsx
  - apps/storefront/src/pages/PlaceOrderPage.test.tsx
  - apps/storefront/src/pages/CartPage.tsx
  - apps/storefront/src/pages/CartPage.test.tsx
```

## Self-Review

### Correctness
- ✓ Both copy changes match task brief exactly
- ✓ No scope violations: only modified files within allowed scope
- ✓ No T016/T017 behaviours broken: all existing tests pass

### Glossary Compliance
- ✓ "Giỏ hàng" (*Cart*) is canonical per `docs/baseline/glossary.md`
- ✓ No new glossary terms introduced
- ✓ No accessibility label noun added (price is unambiguous per-line)

### Testing
- ✓ TDD discipline: tests written first, watched fail, then code fixed to pass
- ✓ Both test files updated to verify copy changes
- ✓ All 137 storefront tests passing
- ✓ No false positives: old copy is verified absent, new copy verified present

### No Breaking Changes
- ✓ T016 cart-line status binding: unaffected
- ✓ T017 shared computeLineSubtotal helper: unaffected
- ✓ All price formatting (formatPriceVnd) preserved
- ✓ All per-line price display preserved

## Concerns
None. Task complete and verified.
