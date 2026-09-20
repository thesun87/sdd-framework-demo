// apps/api/src/modules/stock/stock.public.ts
//
// Bề mặt CÔNG KHAI duy nhất của module `stock` mà các module khác được phép gọi (AD-5) —
// không module nào khác được import `stock.repository.ts` hay `stock.service.ts` trực tiếp,
// và không module nào khác được `SELECT`/`UPDATE` trực tiếp lên bảng `stock`/`stock_ledger`.
//
// Ở `000`, người gọi duy nhất (tương lai, T011) là `catalog`, và chỉ cho nhu cầu ĐỌC:
// hiển thị `stockStatus` trên trang sản phẩm. `catalog` KHÔNG gọi và KHÔNG cần `withdrawStock`
// — không có đường ghi tồn kho nào bắt đầu từ HTTP ở `000` (plan.md §Ghi chú 2). Vì vậy file
// này CHỈ đọc: không `BEGIN`/`COMMIT`, không tham gia đơn vị công việc nào (AD-23 ràng buộc
// đường GHI, không ràng buộc đọc-để-hiển-thị).

import type { storefront } from 'shared';

import type { StockUnitOfWork } from './stock.contract';
import { readStockQuantity } from './stock.repository';

/**
 * Re-export kiểu canonical `StockStatus` (`z.infer<typeof StockStatusSchema>`) từ
 * `packages/shared/src/storefront/product.ts` — nguồn sự thật DUY NHẤT cho hình dạng này
 * (AD-10). Không khai lại union cục bộ ở đây nữa (fix wave I-2, final whole-branch review).
 */
export type StockStatus = storefront.StockStatus;

/**
 * Suy ra `stockStatus` hiển thị cho khách từ `quantity` tồn kho hiện có — ĐỌC THUẦN, không
 * phải `withdrawStock`. Quy tắc: còn hàng khi `quantity > 0`; hết hàng khi `quantity <= 0`
 * HOẶC khi product chưa từng được cấp một dòng `stock` (chưa có tồn kho ban đầu) — cả hai
 * trường hợp đều là "không còn gì để bán", không phân biệt với khách hàng.
 *
 * Con số `quantity` chính xác KHÔNG BAO GIỜ được trả ra khỏi hàm này (FR-007/AD-19) — chỉ
 * nhãn hai giá trị.
 */
export async function getStockStatus(
  queryable: StockUnitOfWork,
  productId: number,
): Promise<StockStatus> {
  const quantity = await readStockQuantity(queryable, productId);
  return quantity !== undefined && quantity > 0 ? 'in_stock' : 'out_of_stock';
}
