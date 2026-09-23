// apps/storefront/src/test/authFixtures.ts
//
// Test fixture factories cho storefront authentication tests (T002).

import { storefront } from 'shared';

export type AccountSummaryFixture = storefront.AccountSummary;
export type AuthResponseFixture = storefront.AuthResponse;
export type CurrentUserResponseFixture = storefront.CurrentUserResponse;

export function createAccountSummaryFixture(
  overrides: Partial<AccountSummaryFixture> = {},
): AccountSummaryFixture {
  return {
    id: 1,
    email: 'customer@example.com',
    role: 'customer',
    ...overrides,
  };
}

export function createAuthResponseFixture(
  overrides: Partial<AccountSummaryFixture> = {},
): AuthResponseFixture {
  return {
    account: createAccountSummaryFixture(overrides),
  };
}

export function createCurrentUserResponseFixture(
  account: AccountSummaryFixture | null = createAccountSummaryFixture(),
): CurrentUserResponseFixture {
  return {
    account,
  };
}
