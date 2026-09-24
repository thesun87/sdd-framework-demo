// apps/storefront/src/test/cartFixtures.ts
//
// Test fixture factories cho storefront cart tests (T007).

import type { storefront } from "shared";

export function createCartLineFixture(
  overrides: Partial<storefront.CartLine> = {},
): storefront.CartLine {
  return {
    productId: 1,
    quantity: 1,
    ...overrides,
  };
}

export function createCartLineStatusOkFixture(
  overrides: Partial<storefront.CartLineStatusResponseItem> = {},
): storefront.CartLineStatusResponseItem {
  return {
    productId: 1,
    lineStatus: "ok",
    product: {
      name: "Sản phẩm mẫu 1",
      price: 100000,
      imagePath: "/images/product-1.jpg",
    },
    ...overrides,
  };
}

export function createCartLineStatusExceedsStockFixture(
  overrides: Partial<storefront.CartLineStatusResponseItem> = {},
): storefront.CartLineStatusResponseItem {
  return {
    productId: 2,
    lineStatus: "exceeds_stock",
    product: {
      name: "Sản phẩm mẫu 2",
      price: 200000,
      imagePath: null,
    },
    ...overrides,
  };
}

export function createCartLineStatusOutOfStockFixture(
  overrides: Partial<storefront.CartLineStatusResponseItem> = {},
): storefront.CartLineStatusResponseItem {
  return {
    productId: 3,
    lineStatus: "out_of_stock",
    product: {
      name: "Sản phẩm mẫu 3",
      price: 300000,
      imagePath: null,
    },
    ...overrides,
  };
}

export function createCartLineStatusNotFoundFixture(
  overrides: Partial<storefront.CartLineStatusResponseItem> = {},
): storefront.CartLineStatusResponseItem {
  return {
    productId: 4,
    lineStatus: "not_found",
    product: null,
    ...overrides,
  };
}

export function createCartLinesStatusResponseFixture(
  lines: storefront.CartLineStatusResponseItem[] = [createCartLineStatusOkFixture()],
): storefront.CartLinesStatusResponse {
  return { lines };
}
