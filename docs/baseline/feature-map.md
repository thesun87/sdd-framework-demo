# Feature Map

**Human-owned.** Agents read this; they never write it.

> **Ngoại lệ đã ghi nhận:** bảng dưới đây do `bmad-architecture` soạn ngày
> 2026-09-19 và được Tuan Nguyen duyệt trước khi ghi. Mọi thay đổi sau này quay
> về luật trên: người sửa, agent đọc.

Each entry is a vertical slice stated as an *outcome*, not a solution.
Rules (setup guide Appendix B #4):
- ≤ 15 tasks per feature. Larger features must be split.
- Dependency-ordered. `000-walking-skeleton` comes first in Track A.
- One row = one `specs/NNN-slug/` directory.

Hai cột `FR` và `AD` là phần thêm của baseline này: `FR` trỏ về `prd.md` §4,
`AD` trỏ về `architecture.md`. Chúng tồn tại để kiểm được **độ phủ** — không FR
nào mồ côi, và mọi chỗ một FR nằm ở hai feature đều phải có lý do viết ra.

| ID | Outcome (what the user can do afterwards) | Depends on | FR | AD | Track | Status |
|---|---|---|---|---|---|---|
| 000-walking-skeleton | Khách mở được trang chủ, thấy một sản phẩm thật lấy từ database, **tình trạng còn/hết của nó đúng dưới tải đồng thời**, và trang phát đủ header an toàn | — | 4, 5 *(một phần)* | AD-1, AD-21, AD-25, AD-27, AD-28, **AD-29** | A | planned |
| 001-catalog-browse | Khách duyệt danh mục phẳng, tìm sản phẩm theo tên **có bỏ dấu**, và phân trang | 000 | 1–5 | AD-11, AD-19, AD-20 | A | planned |
| 002-accounts | Khách tự đăng ký và đăng nhập; tài khoản chủ shop có sẵn từ lúc triển khai | 000 | 9, 10, 33 | AD-6, AD-8 | A | planned |
| 003-cart-and-wall | Khách thêm hàng vào giỏ ở trình duyệt, giỏ **sống sót qua lần đăng nhập**, và gặp tường đăng ký khi định đặt đơn | 001, 002 | 6, 7, 8, 11 | AD-17 | A | planned |
| 004-place-order | Khách đặt được đơn, **và không bao giờ đặt được đơn vượt tồn kho** | 003 | 12–15 | AD-1, AD-3, AD-18, AD-23 | A | planned |
| 005-my-orders | Khách xem lịch sử và chi tiết đơn của mình, **và không thấy đơn của ai khác** | 004 | 31, 32 | AD-13 | A | planned |
| 006-backoffice-orders | Chủ shop xem được danh sách đơn có lọc, và chi tiết từng đơn | 004 | 29, 30 | AD-9, AD-13 | A | planned |
| 007-order-lifecycle | Chủ shop chuyển trạng thái đơn; khách tự huỷ khi ở `placed`; huỷ hoàn kho **đúng chỗ** | 006 | 16–19 | AD-14, AD-2 | A | planned |
| 008-shipping-and-payment | Chủ shop nhập phí giao hàng và xác nhận thanh toán chuyển khoản | 005, 007 | 20–24 | AD-14, AD-12 | A | planned |
| 009-product-admin | Chủ shop quản lý sản phẩm, danh mục và ảnh | 001 | 25, 26, 28 | AD-22, AD-24, AD-15 | A | planned |
| 010-stock-adjustment | Chủ shop điều chỉnh tồn kho, và **mọi thay đổi đều truy được về nguồn** | 009 | 27 | AD-1, AD-2, AD-4, AD-22 | A | planned |
| 011-password-reset | Khách mất mật khẩu lấy lại được qua chủ shop | 002 | 34 | AD-7 | A | planned |
| 012-anonymisation | Dữ liệu cá nhân trên đơn biến mất đúng lúc — theo yêu cầu (FR-35) và tự động sau 12 tháng (`prd.md` §9.3, không có FR riêng) | 006 | 35 | AD-26 | A | planned |

**Độ phủ:** FR-1…FR-35 phủ đủ. Mỗi FR thuộc đúng một feature, **trừ FR-4 và FR-5**:
`000` chạm chúng ở mức tối thiểu (một sản phẩm, một nhãn còn/hết) để chứng minh được
AD-1 dưới tải đồng thời; `001` mới là nơi chúng hoàn chỉnh. Đây là trùng lặp có chủ ý —
walking skeleton theo định nghĩa phải xuyên qua stack trước khi có feature nào đầy đủ.
Việc ẩn danh hoá tự động ở `prd.md` §9.3 **không có FR riêng** và nằm ở `012` cùng FR-35.

## Ba cảnh báo kèm bảng trên

**`000` sát trần 15 task trước khi làm được gì nhiều.** Nó phải kéo theo Caddy
một origin (AD-8), hai Vite build (AD-9), `packages/shared` (AD-10), migration
(AD-25) và Compose + Postgres (AD-27) — chỉ để hiện **một** sản phẩm. Đó là cái
giá của việc spine cố định nhiều bất biến hạ tầng, và nó được trả một lần.
Nếu vượt trần ở `/speckit-tasks`, thứ nên cắt ra là **bundle `backoffice`**
(hoãn tới `006`), **không phải** test tải đồng thời của AD-21 — bỏ test đó là
bỏ đúng thứ `000` tồn tại để chứng minh. **Cũng không phải CSP (AD-29):** nó là
lớp phòng thủ duy nhất còn lại cho rủi ro XSS mà AD-8 đã chấp nhận có ý thức, và
một bề mặt tồn tại trước lớp phòng thủ của nó là một cửa sổ không ai đóng lại.

**`004` là feature rủi ro nhất.** Nó gánh AD-1, AD-3, AD-18 và AD-23 cùng lúc,
cộng màn *"Đơn chưa đặt được"* mà `addendum.md` §5 gọi là *"khoảnh khắc UX nặng
nhất trong sản phẩm"*. Nó được giữ làm một feature vì tách ra sẽ để lại một
feature **không thất bại đúng cách được** — một đường đặt đơn không biết báo
dòng nào thiếu hàng thì chưa xong. Đây là chỗ khả năng phải chia ở
`/speckit-tasks` là cao nhất.

**`012` là feature tuân thủ, không phải feature sản phẩm.** Không ai dùng nó
hàng ngày, nhưng nó là thứ duy nhất đáp ứng nghĩa vụ **20 ngày** của
`Luật 91/2025/QH15` (xem `prd.md` FR-35). Bỏ nó khỏi v1 là một quyết định tuân
thủ có ý thức, không phải một lần cắt phạm vi.

## Intake queue (Track B)

New requests land here as outcomes. Nothing moves to the table above until a
human has confirmed it fits inside the current architecture baseline. If it does
not, escalate to a baseline revision on a `baseline/*` branch first.

| Date | Requested outcome | Fits current architecture? | Decision |
|---|---|---|---|
| | _Biến thể sản phẩm (size/màu)_ — `prd.md` §7.2 đã đẩy sang Track B | Không — `glossary.md` định nghĩa Product là **một** giá, **một** số tồn kho | Chờ |
| | _Danh mục phân cấp nhiều tầng_ — đáng xem lại ở 20.000 sản phẩm (Y3) | Không — `architecture.md` liệt kê ở mục phương án đã bị loại | Chờ |
| | _Preview khi share link lên Facebook/Zalo_ — `architecture.md` Deferred | Có, nếu chấp nhận SSR riêng cho trang sản phẩm | Chờ |
