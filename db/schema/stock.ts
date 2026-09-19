// db/schema/stock.ts — module `stock`: stock, stock_ledger.
// Hợp đồng cột/ràng buộc: specs/000-walking-skeleton/data-model.md §Module stock.
//
// `stock` là chủ sở hữu duy nhất của đường ghi vào tồn kho (AD-2). `stock` KHÔNG biết
// `ordering` tồn tại — do đó `stock_ledger.order_id` là giá trị trần, KHÔNG có khoá ngoại
// (AD-24). Mọi migration sau này chạm bảng `stock` phải nói rõ nó giữ nguyên ràng buộc
// `CHECK (quantity >= 0)` — xem comment đầu file migration sinh ra từ file này.

import { sql } from 'drizzle-orm';
import { bigint, check, integer, pgEnum, pgTable, timestamp } from 'drizzle-orm/pg-core';

import { product } from './catalog.js';

// Đủ BA giá trị của AD-4 ngay từ `000`, dù `000` chỉ sinh ra `order_placed`. Enum là hợp
// đồng dữ liệu — mở rộng sau là một migration chỉ-tiến riêng (AD-25).
export const stockLedgerReason = pgEnum('stock_ledger_reason', [
  'order_placed',
  'order_cancelled',
  'manual_adjustment',
]);

export const stock = pgTable(
  'stock',
  {
    productId: bigint('product_id', { mode: 'number' })
      .primaryKey()
      .references(() => product.id, { onDelete: 'cascade' }),
    // Bất biến trung tâm của sản phẩm: tồn kho không bao giờ âm. `CHECK` sống ở database,
    // không trong code (AD-1).
    quantity: integer('quantity').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [check('stock_quantity_non_negative', sql`${table.quantity} >= 0`)],
);

export const stockLedger = pgTable(
  'stock_ledger',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    // RESTRICT, không CASCADE: sổ cái là bản kiểm toán — xoá Product có dòng sổ cái phải bị
    // chặn ở tầng dữ liệu (AD-24), không phải bằng một `if` trong code.
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    delta: integer('delta').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    reason: stockLedgerReason('reason').notNull(),
    // Giá trị TRẦN, KHÔNG khoá ngoại tới `ordering.order` — `stock` không được biết `ordering`
    // tồn tại (AD-24). Ở `000` luôn NULL vì `000` không có luồng đặt hàng.
    orderId: bigint('order_id', { mode: 'number' }),
    // NULL ở `000` — module `identity` chưa tồn tại (thuộc `002`).
    actorAccountId: bigint('actor_account_id', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('stock_ledger_delta_non_zero', sql`${table.delta} <> 0`),
    check('stock_ledger_quantity_after_non_negative', sql`${table.quantityAfter} >= 0`),
  ],
);
