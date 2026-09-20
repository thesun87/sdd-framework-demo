// apps/api/src/modules/stock/stock-withdraw-quantity-guard.int-spec.ts
//
// Fix wave I-1 (final whole-branch review, R28) — kiểm chứng guard clause mới của
// `withdrawStock` chặn `quantity` không hợp lệ TRƯỚC bất kỳ lời gọi database nào (xem
// stock.service.ts): `quantity <= -1` làm vị từ `quantity >= $1` của UPDATE điều kiện hiển
// nhiên đúng (âm thầm TĂNG tồn kho), và `quantity === 0` làm `stock_ledger.delta <> 0`
// (CHECK constraint) ném lỗi Postgres 23514 thoát ra ngoài dưới dạng exception chưa bắt.
//
// LƯU Ý VỀ TÊN FILE: đây là test THUẦN Ở TẦNG ĐƠN VỊ — KHÔNG chạm database thật, khác với
// mọi `*.int-spec.ts` còn lại trong module này (`./stock.repository` bị mock ở dưới CHÍNH
// VÌ vậy). Hậu tố `.int-spec.ts` (thay vì `.spec.ts` tự nhiên hơn cho một unit test) là CHỦ
// Ý: `apps/api/jest.config.js` có `testRegex: '\\.(int|race)-spec\\.ts$'` — CHỈ khám phá hai
// hậu tố đó; đã xác minh bằng `npx jest --listTests` rằng một file `.spec.ts` trần không bao
// giờ được `npm test`/`jest` chạy, tức bài test sẽ âm thầm không tồn tại. Chính
// `jest.config.js` (comment ở đó) đã dự đoán trước tình huống "thêm unit test thuần vào
// apps/api" và đề nghị tách bằng Jest "projects" — việc đó nằm NGOÀI scope file được phép của
// fix wave này (không sửa `jest.config.js`), nên file này tạm mượn hậu tố `int-spec` để được
// Jest phát hiện; xem `.sdd/000-walking-skeleton/final-review-fixwave-report.md` để biết đầy
// đủ lý do của lựa chọn đặt tên này.

import type { StockUnitOfWork } from './stock.contract';
import { applyConditionalWithdrawal, insertStockLedgerEntry } from './stock.repository';
import { withdrawStock } from './stock.service';

jest.mock('./stock.repository');

const mockApplyConditionalWithdrawal = applyConditionalWithdrawal as jest.MockedFunction<
  typeof applyConditionalWithdrawal
>;
const mockInsertStockLedgerEntry = insertStockLedgerEntry as jest.MockedFunction<typeof insertStockLedgerEntry>;

// `query` không bao giờ thực sự được gọi ở các case ném lỗi — guard clause phải chặn TRƯỚC
// khi `stock.service.ts` chạm tới `unitOfWork`. Ép kiểu tối thiểu vì `StockUnitOfWork` chỉ
// phơi `query` (AD-23).
const fakeUnitOfWork = { query: jest.fn() } as unknown as StockUnitOfWork;

describe('withdrawStock: guard chặn quantity không hợp lệ (I-1, R28)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('quantity = -1 → ném RangeError, KHÔNG gọi repository', async () => {
    await expect(
      withdrawStock(fakeUnitOfWork, { productId: 1, quantity: -1, reason: 'order_placed' }),
    ).rejects.toThrow(RangeError);
    expect(mockApplyConditionalWithdrawal).not.toHaveBeenCalled();
    expect(mockInsertStockLedgerEntry).not.toHaveBeenCalled();
  });

  it('quantity = 0 → ném RangeError, KHÔNG chạm CHECK constraint 23514 của DB', async () => {
    await expect(
      withdrawStock(fakeUnitOfWork, { productId: 1, quantity: 0, reason: 'order_placed' }),
    ).rejects.toThrow(RangeError);
    expect(mockApplyConditionalWithdrawal).not.toHaveBeenCalled();
    expect(mockInsertStockLedgerEntry).not.toHaveBeenCalled();
  });

  it('quantity = 1 → vẫn hoạt động bình thường, guard không chặn giá trị hợp lệ', async () => {
    mockApplyConditionalWithdrawal.mockResolvedValue({ quantityAfter: 4 });
    mockInsertStockLedgerEntry.mockResolvedValue(42);

    await expect(
      withdrawStock(fakeUnitOfWork, { productId: 1, quantity: 1, reason: 'order_placed' }),
    ).resolves.toEqual({ applied: true, quantityAfter: 4, ledgerId: 42 });
    expect(mockApplyConditionalWithdrawal).toHaveBeenCalledWith(fakeUnitOfWork, 1, 1);
  });
});
