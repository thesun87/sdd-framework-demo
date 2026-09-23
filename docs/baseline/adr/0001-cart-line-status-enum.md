# ADR-0001: Dòng giỏ hàng được đánh dấu bằng enum cấp dòng, không bằng con số tồn kho

- **Status:** accepted
- **Date:** 2026-09-23
- **Deciders:** Tuan Nguyen (thực hiện: agent Claude Code, theo constitution §VII)

## Context

- `prd.md` FR-6 (bản `baseline-0001`) đòi giỏ "đánh dấu đúng những dòng đang vượt tồn kho, nêu rõ
  số lượng còn bán được"; `ux-spec.md` có chuỗi "Chỉ còn {n} sản phẩm".
- `architecture.md` AD-19 cấm con số tồn kho rời Trang quản trị (ngoại lệ duy nhất: payload thất bại
  của AD-3) và ghi "FR-6 cảnh báo giỏ vượt tồn kho bằng còn/hết, không bằng con số".
- Chỉ với `in_stock | out_of_stock`, giỏ **không phát hiện được** dòng có số lượng > tồn kho > 0.
- Phát hiện ở B1 của `003-cart-and-wall`; người quyết định chọn D1 ngày 2026-09-23.

## Decision

Server tính cho mỗi cặp (sản phẩm, số lượng) một **enum cấp dòng** `ok | exceeds_stock |
out_of_stock`; phép so sánh nằm trong `stock`, và không số nguyên tồn kho nào xuất hiện trong hợp
đồng Trang bán hàng.

## Consequences

- FR-6 được sửa: đánh dấu bằng trạng thái cấp dòng, **không** nêu con số; chuỗi `ux-spec.md` đổi
  theo. AD-19 không thêm ngoại lệ, chỉ được làm rõ.
- **Rủi ro đã chấp nhận:** đổi số lượng và quan sát lúc trạng thái chuyển `ok → exceeds_stock` cho
  phép suy ra con số chính xác sau ~log₂(trần số lượng) lần gọi. Không có rate limit hay biện pháp
  giảm thiểu trong v1 (quyết định Q1 = A của `003`). Luật hình dạng của AD-19 vẫn giữ.
- Trần số lượng mỗi dòng là giới hạn **kỹ thuật** (`003` plan R3), không phải luật sản phẩm.
- Nay bị cấm: trả `availableQuantity` hay bất kỳ số nào suy ra từ tồn kho cho Trang bán hàng ngoài
  ngoại lệ AD-3.

## Alternatives considered

| Option | Why rejected |
|---|---|
| Chỉ còn/hết như AD-19 nguyên văn | Không phát hiện dòng vượt tồn kho khi tồn kho > 0 — FR-6 thành AC không kiểm được |
| Thêm ngoại lệ thứ hai cho AD-19 (trả {n}) | Mở con số cho mọi khách bằng một đường đọc chung — đúng thứ AD-19 tồn tại để ngăn |
| Trần số lượng hiển thị cho người dùng | Là luật sản phẩm mới không có FR nào đòi |
