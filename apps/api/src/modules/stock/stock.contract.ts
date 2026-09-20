// apps/api/src/modules/stock/stock.contract.ts
//
// Hợp đồng CÔNG KHAI của module `stock` — CHỈ khai kiểu (type-only), KHÔNG một dòng mã
// hiện thực nào. T009 phải hiện thực ĐÚNG chữ ký `WithdrawStock` bên dưới trong
// `stock.service.ts` (file đó KHÔNG tồn tại — đó là lý do bốn test T008 đỏ).
//
// Nguồn ràng buộc:
//   - data-model.md §Module stock — bảng `stock`/`stock_ledger`, đường ghi duy nhất.
//   - architecture.md AD-1  — delta có điều kiện, không đọc-rồi-ghi.
//   - architecture.md AD-23 — đơn vị công việc do ĐƯỜNG VÀO mở; service không bao giờ tự
//     mở cái nó đã nhận.
//
// AD-23 thể hiện Ở CHỮ KÝ, không chỉ ở hành vi: tham số `unitOfWork` là BẮT BUỘC (không có
// overload/nhánh nào cho phép gọi `withdrawStock` mà không truyền nó), và kiểu của nó chỉ
// phơi ra `query` — không phơi `connect`/`release`/pool. Vì vậy hàm hiện thực (T009) VỀ MẶT
// KIỂU không có cách nào tự mở kết nối/transaction của riêng nó: nó chỉ có thể dùng đúng
// `unitOfWork` mà đường vào (ở feature này: chính test — plan.md §Ghi chú 2, không có HTTP
// cho đường ghi) đã mở sẵn (BEGIN) và sẽ tự COMMIT/ROLLBACK sau khi hàm trả về.

import type { PoolClient } from 'pg';

/**
 * Đơn vị công việc tối giản mà `stock` nhận làm tham số. Chỉ phơi `query` — KHÔNG phơi
 * `connect`, `release`, hay bất kỳ thứ gì cho phép mở/đóng kết nối — để không thể viết một
 * hiện thực "hợp lệ về kiểu" mà lại tự mở connection riêng.
 */
export type StockUnitOfWork = Pick<PoolClient, 'query'>;

/** Đủ ba giá trị của AD-4 (data-model.md dòng `reason`) — `000` chỉ SINH `order_placed`
 *  và test dùng thêm `manual_adjustment` để dựng dữ liệu, nhưng cả ba đều phải được kiểu
 *  chấp nhận ngay từ hợp đồng này. */
export type StockLedgerReason = 'order_placed' | 'order_cancelled' | 'manual_adjustment';

export interface WithdrawStockInput {
  readonly productId: number;
  /** Số đơn vị muốn RÚT khỏi tồn kho — luôn dương. Đường ghi trừ giá trị này. */
  readonly quantity: number;
  readonly reason: StockLedgerReason;
  /** Giá trị TRẦN, KHÔNG khoá ngoại tới `ordering.order` (AD-24) — `stock` không được biết
   *  `ordering` tồn tại. NULL ở `000` (không có luồng đặt hàng thật). */
  readonly orderId?: number | null;
  /** NULL ở `000` — module `identity` (002) chưa tồn tại. */
  readonly actorAccountId?: number | null;
}

/**
 * `applied: false` là một GIÁ TRỊ HỢP LỆ — nghĩa là UPDATE có điều kiện ảnh hưởng 0 dòng vì
 * tồn kho hiện có nhỏ hơn `quantity` yêu cầu ("hết hàng"/thua trong cuộc đua tranh chấp).
 * KHÔNG được ném exception cho trường hợp này (xem stock-conditional-delta.race-spec.ts và
 * stock-never-negative.int-spec.ts).
 */
export type WithdrawStockResult =
  | {
      readonly applied: true;
      /** `stock.quantity` NGAY SAU thao tác — phải khớp `stock_ledger.quantity_after`
       *  của `ledgerId` bên dưới (stock-ledger-matches-quantity.int-spec.ts). */
      readonly quantityAfter: number;
      /** `id` của dòng `stock_ledger` vừa sinh — ĐÚNG MỘT dòng cho một lần `applied: true`. */
      readonly ledgerId: number;
    }
  | { readonly applied: false };

/**
 * Đường ghi DUY NHẤT vào tồn kho (AD-2). Hiện thực PHẢI dùng một câu `UPDATE` có điều kiện
 * trên giá trị đang có — không đọc-rồi-ghi (AD-1):
 *
 *   UPDATE stock SET quantity = quantity - :quantity, updated_at = now()
 *   WHERE product_id = :productId AND quantity >= :quantity
 *
 * Khi số dòng bị ảnh hưởng = 1: hiện thực PHẢI ghi thêm ĐÚNG MỘT dòng `stock_ledger`
 * (`delta = -quantity`, `quantity_after` = giá trị mới) trong CÙNG `unitOfWork` — không mở
 * transaction riêng, không COMMIT/ROLLBACK bên trong hàm này (AD-23: đó là việc của đường
 * vào đã mở `unitOfWork`).
 *
 * Khi số dòng bị ảnh hưởng = 0: trả `{ applied: false }` — KHÔNG ném lỗi, KHÔNG viết dòng
 * sổ cái nào.
 *
 * @param unitOfWork Đơn vị công việc ĐÃ ĐƯỢC MỞ bởi đường vào (test ở `000`; caller khác ở
 *   feature sau). Hàm này không bao giờ tự mở cái nó đã nhận (AD-23) — nó chỉ `query` trên
 *   đúng client được truyền vào, không `BEGIN`/`COMMIT`/`ROLLBACK`, không `pool.connect()`.
 */
export type WithdrawStock = (
  unitOfWork: StockUnitOfWork,
  input: WithdrawStockInput,
) => Promise<WithdrawStockResult>;
