// db/schema/catalog.ts — module `catalog`: category, product, product_image.
// Hợp đồng cột/ràng buộc: specs/000-walking-skeleton/data-model.md §Module catalog.
//
// Không cột `slug` trên `product` (khoá chính là bigint nội bộ — chỉ Order có mã công khai).
// Không cột trạng thái "Ngừng bán" trên `product` — đó là FR-26, thuộc feature `009`.

import { sql } from 'drizzle-orm';
import { bigint, check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const category = pgTable('category', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull(),
  // Chuẩn hoá LÚC GHI, không lúc đọc (AD-11). Task này chỉ khai báo cột; điền giá trị là T011.
  nameNormalized: text('name_normalized').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const product = pgTable(
  'product',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    // NULL cho phép — Product thuộc về 0..1 Category.
    categoryId: bigint('category_id', { mode: 'number' }).references(() => category.id),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    description: text('description').notNull().default(''),
    // Tiền là bigint VND NGUYÊN (đã gồm VAT) — không numeric thập phân, không float.
    price: bigint('price', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [check('product_price_non_negative', sql`${table.price} >= 0`)],
);

export const productImage = pgTable('product_image', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => product.id, { onDelete: 'cascade' }),
  // Đường dẫn trên đĩa, không phải blob trong database (AD-15).
  path: text('path').notNull(),
  // Ảnh đại diện là bản ghi có `position` nhỏ nhất (UX §571).
  position: integer('position').notNull(),
});
