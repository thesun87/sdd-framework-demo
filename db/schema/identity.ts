// db/schema/identity.ts
//
// Lược đồ lưu trữ cho module `identity` (Feature 002-accounts).
// Tuân thủ AD-5: Ranh giới module là ranh giới dữ liệu — chỉ module identity
// được phép đọc/ghi trực tiếp vào các bảng này.

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
  (table) => [
    uniqueIndex('account_email_unique_idx').on(table.email),
  ],
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
  (table) => [
    index('session_account_id_idx').on(table.accountId),
    index('session_expires_at_idx').on(table.expiresAt),
  ],
);

export const failedLoginAttempt = pgTable(
  'failed_login_attempt',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('failed_login_email_attempted_at_idx').on(table.email, table.attemptedAt),
  ],
);
