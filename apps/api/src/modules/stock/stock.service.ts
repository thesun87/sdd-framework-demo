// apps/api/src/modules/stock/stock.service.ts
//
// Hiện thực ĐÚNG chữ ký `WithdrawStock` khai ở `stock.contract.ts` — đường ghi DUY NHẤT vào
// tồn kho trong toàn hệ thống (AD-2). Đọc kỹ `stock.contract.ts` trước khi sửa file này: mọi
// ràng buộc (AD-1, AD-23, AD-24) đã được giải thích ở đó, không lặp lại đầy đủ ở đây.
//
// AD-23 — `unitOfWork` là tham số BẮT BUỘC, hàm này KHÔNG BAO GIỜ tự `BEGIN`/`COMMIT`/
// `ROLLBACK`/`pool.connect()`. Đường vào (test, hoặc caller sau này) đã mở transaction và sẽ
// tự đóng nó sau khi `withdrawStock` trả về — về mặt KIỂU, `StockUnitOfWork` chỉ phơi `query`
// nên hàm này không có cách nào mở kết nối/transaction riêng của nó.

import type { WithdrawStock } from './stock.contract';
import { applyConditionalWithdrawal, insertStockLedgerEntry } from './stock.repository';

export const withdrawStock: WithdrawStock = async (unitOfWork, input) => {
  const { productId, quantity, reason, orderId = null, actorAccountId = null } = input;

  // Fix wave finding I-1 (final whole-branch review, R28) — `quantity` PHẢI là số nguyên
  // dương. Không chặn ở đây thì: (a) `quantity <= -1` làm vị từ điều kiện của UPDATE
  // (`quantity >= $1`) trở thành hiển nhiên đúng, khiến UPDATE ÂM THẦM TĂNG tồn kho thay vì
  // giảm; (b) `quantity === 0` khiến `stock_ledger.delta <> 0` (CHECK constraint) ném lỗi
  // Postgres 23514 thoát ra ngoài dưới dạng exception chưa bắt, thay vì hợp đồng
  // `{ applied: false }` mà `stock.contract.ts` mô tả cho các trường hợp không hợp lệ.
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError(`withdrawStock: quantity must be a positive integer, got ${quantity}`);
  }

  // MỘT câu UPDATE có điều kiện — AD-1. "0 dòng bị ảnh hưởng" là nhánh hợp lệ dưới đây, không
  // phải exception: `applyConditionalWithdrawal` trả `null` thay vì ném lỗi.
  const withdrawal = await applyConditionalWithdrawal(unitOfWork, productId, quantity);

  if (withdrawal === null) {
    // Hết hàng, hoặc thua một cuộc đua tranh chấp — KHÔNG ghi sổ cái, KHÔNG ném lỗi.
    return { applied: false };
  }

  // Ảnh hưởng đúng 1 dòng → ghi thêm ĐÚNG MỘT dòng stock_ledger, trong CÙNG `unitOfWork`
  // (không mở transaction riêng — AD-23).
  const ledgerId = await insertStockLedgerEntry(unitOfWork, {
    productId,
    delta: -quantity,
    quantityAfter: withdrawal.quantityAfter,
    reason,
    orderId,
    actorAccountId,
  });

  return {
    applied: true,
    quantityAfter: withdrawal.quantityAfter,
    ledgerId,
  };
};
