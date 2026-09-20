// apps/api/src/modules/stock/stock-conditional-delta.race-spec.ts
//
// Test QUAN TRỌNG NHẤT của cả feature — lý do 000 tồn tại (task-008-brief.md §Objective).
// Bất biến: với tồn kho M và N kết nối ĐỘC LẬP cùng rút 1 đơn vị (N > M), đúng M lần thành
// công, N-M lần trả "0 dòng bị ảnh hưởng" — một GIÁ TRỊ hợp lệ (`applied: false`), KHÔNG
// phải exception. Lặp lại ≥ 10 lần liên tiếp trên CÙNG database (không dựng lại nó), kết
// quả phải giống hệt mỗi lần (SC-002, AD-28).
//
// LUẬT CÔ LẬP (AD-28) — không thương lượng:
//   - Mỗi tiến trình tranh chấp dùng client `pg` RIÊNG của nó (`withUnitOfWork` mở một
//     `pool.connect()` mới mỗi lần gọi) — KHÔNG BAO GIỜ nhiều promise trên MỘT client.
//   - Chạy trên trạng thái ĐÃ COMMIT thật (mỗi lần rút tự BEGIN...COMMIT trên client riêng
//     của nó) — KHÔNG BAO GIỜ cô lập bằng transaction rollback.
//   - Dọn dữ liệu giữa các lần lặp bằng TRUNCATE, không dựng lại database/lược đồ.

import type { Pool, QueryResult } from 'pg';
import {
  assertDatabaseReachable,
  createTestPool,
  seedProduct,
  seedStock,
  truncateAllTables,
  withUnitOfWork,
} from './stock-test-support';
import { withdrawStock } from './stock.service';
import type { WithdrawStockResult } from './stock.contract';

const INITIAL_QUANTITY = 8; // M ≥ 5 (brief yêu cầu)
const CONCURRENT_WITHDRAWALS = 25; // N ≥ 20 và N > M (brief yêu cầu)
const REPEAT_RUNS = 10; // SC-002 / AD-28: lặp lại ≥ 10 lần liên tiếp, không dựng lại database

describe('stock: UPDATE có điều kiện chặn đúng M lần rút trong N tiến trình đồng thời', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool(CONCURRENT_WITHDRAWALS + 5);
    await assertDatabaseReachable(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it(
    `${REPEAT_RUNS} lần chạy liên tiếp trên CÙNG database: mỗi lần đúng ${INITIAL_QUANTITY} ` +
      `thành công / ${CONCURRENT_WITHDRAWALS - INITIAL_QUANTITY} thất bại hợp lệ, cuối cùng quantity = 0`,
    async () => {
      for (let run = 1; run <= REPEAT_RUNS; run += 1) {
        // Dọn bằng TRUNCATE — KHÔNG dựng lại database/lược đồ giữa các lần lặp (AD-28).
        await truncateAllTables(pool);
        const productId = await seedProduct(pool);
        await seedStock(pool, productId, INITIAL_QUANTITY);

        // N kết nối ĐỘC LẬP: mỗi phần tử dưới đây gọi `withUnitOfWork`, tức
        // `pool.connect()` ra MỘT client pg riêng rồi tự BEGIN/COMMIT trên đúng client đó.
        // `Promise.allSettled` chạy N lời gọi này THỰC SỰ song song trên N connection khác
        // nhau — không phải N câu lệnh tuần tự trên một client.
        const attempts: Promise<WithdrawStockResult>[] = Array.from(
          { length: CONCURRENT_WITHDRAWALS },
          () =>
            withUnitOfWork(pool, (unitOfWork) =>
              withdrawStock(unitOfWork, { productId, quantity: 1, reason: 'order_placed' }),
            ),
        );

        const results = await Promise.allSettled(attempts);

        // "0 dòng bị ảnh hưởng" (hết hàng / thua cuộc đua) PHẢI là một GIÁ TRỊ trả về
        // (`applied: false`), không phải một rejection. Nếu có rejection, hợp đồng bị vi
        // phạm ngay tại đây — test này thất bại vì lý do đó, không phải vì thiếu module.
        const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        expect(rejected).toHaveLength(0);

        const fulfilled = results.filter(
          (r): r is PromiseFulfilledResult<WithdrawStockResult> => r.status === 'fulfilled',
        );
        const succeeded = fulfilled.filter((r) => r.value.applied === true);
        const failed = fulfilled.filter((r) => r.value.applied === false);

        expect(succeeded).toHaveLength(INITIAL_QUANTITY);
        expect(failed).toHaveLength(CONCURRENT_WITHDRAWALS - INITIAL_QUANTITY);

        // Đúng M dòng stock_ledger (một dòng cho mỗi lần applied:true) — không nhiều hơn,
        // không ít hơn, kể cả dưới tranh chấp thật.
        const ledgerCount = await pool.query<{ n: number }>(
          'SELECT count(*)::int AS n FROM stock_ledger WHERE product_id = $1',
          [productId],
        );
        expect(ledgerCount.rows[0].n).toBe(INITIAL_QUANTITY);

        const finalStock: QueryResult<{ quantity: number }> = await pool.query(
          'SELECT quantity FROM stock WHERE product_id = $1',
          [productId],
        );
        // Tồn kho cuối cùng bằng 0 — không âm ở bất kỳ trạng thái ĐÃ COMMIT nào. `CHECK
        // (quantity >= 0)` là hàng rào cuối (chứng minh riêng ở stock-never-negative); ở
        // đây ta xác nhận UPDATE có điều kiện không bao giờ cần chạm tới hàng rào đó.
        expect(finalStock.rows[0].quantity).toBe(0);
      }
    },
    120_000,
  );
});
