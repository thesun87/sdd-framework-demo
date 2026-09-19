# Phase 0 — Research: Walking Skeleton

**Ghi chú về bản chất của file này.** Trong Track A, phần lớn việc "research" đã xảy ra ở
BMAD Phase 3 và đóng băng trong `docs/baseline/architecture.md`. File này **không mở lại**
các quyết định đó. Nó ghi ba loại thứ: (1) chỗ baseline pin sẵn và plan chỉ việc tuân theo,
(2) chỗ baseline để ngỏ và plan chọn một lối có lý do, (3) chỗ baseline không phủ và **phải
người quyết** — mục (3) không được gỡ ở đây.

## Không có NEEDS CLARIFICATION nào trong Technical Context

Mọi ô của Technical Context đều được baseline pin trước. Không dispatch research agent nào.

| Ô | Nguồn pin |
|---|---|
| Ngôn ngữ, runtime, framework, phiên bản | `architecture.md` §Stack (kiểm chứng web 2026-09-19, có tra CVE) |
| Kho dữ liệu | AD-27 + §Stack: PostgreSQL 18.6, thật, cùng major với prod |
| Runner test | §Consistency Conventions "Runner theo thư mục" |
| Ngưỡng hiệu năng | `prd.md` §8 |
| Phụ thuộc runtime cho phép | AD-16 — chỉ PostgreSQL + hệ tệp cục bộ |

---

## D-1 — Đường ghi tồn kho hiện thực AD-1 như thế nào ở `000`

**Decision**: một câu `UPDATE` có điều kiện trên giá trị đang có, trong service công khai của
module `stock`:
`UPDATE stock SET quantity = quantity - :n WHERE product_id = :id AND quantity >= :n`.
Số dòng bị ảnh hưởng = 0 là **kết quả trả về hợp lệ**, không phải exception. Mỗi lần ghi
thành công kèm một dòng `stock_ledger` append-only trong **cùng** đơn vị công việc.

**Rationale**: AD-1 viết thẳng câu này. AD-2 cho `stock` độc quyền đường ghi. AD-4 đòi sổ cái
đi kèm. Không có gì để cân nhắc — chỉ có tuân theo hoặc vi phạm.

**Alternatives considered**: `SELECT … FOR UPDATE` rồi ghi — AD-1 cấm mọi đường đọc-rồi-ghi
theo giá trị vừa đọc; kiểm tra bằng `if` ở tầng service — đúng dưới test đơn luồng, sai dưới
tải đồng thời, đây đúng là lỗi AD-1 tồn tại để chặn.

## D-2 — Test tải đồng thời đóng vai đường vào

**Decision**: `000` không có đường vào HTTP nào ghi tồn kho (đặt đơn là FR-14/feature `004`).
Test tải đồng thời gọi thẳng service công khai của `stock`, **tự mở đơn vị công việc** cho mỗi
lời gọi, trên **N kết nối độc lập**, trạng thái đã commit, dọn bằng `TRUNCATE`.

**Rationale**: AD-23 nói đơn vị công việc do *đường vào* mở và truyền vào service; ở đây test
chính là đường vào. Cách này giữ đúng chữ của AD-23 (module không tự mở cái nó đã nhận, không
transaction lồng) và đúng chữ của AD-28 (không rollback-isolation, nhiều kết nối, `TRUNCATE`).

**Alternatives considered**: dựng tạm một endpoint HTTP chỉ để test gọi — phát minh một đường
vào không FR nào yêu cầu, và nó sẽ phải bị gỡ ở `004`; bọc mỗi test trong transaction rồi
rollback — AD-28 gọi đây là **đường duy nhất trong toàn spine mà một test xanh nói dối**.

## D-3 — Hình dạng hợp đồng HTTP cho tình trạng còn/hết

**Decision**: đường đọc storefront trả **enum hai giá trị**, không bao giờ trả con số tồn kho.
Response chứa trường này mang `Cache-Control: no-store`. Tầng dữ liệu phía client **không**
cache trường này. Xem [contracts/storefront-http.md](./contracts/storefront-http.md).

**Rationale**: FR-007 + AD-19 cấm con số rời Trang quản trị; AD-20 cấm cache ở **mọi** tầng và
gọi cache phía client là tầng nguy hiểm nhất. Trả enum thay vì số làm việc rò rỉ trở thành
**không thể**, thay vì chỉ là chuyện nhớ đừng hiển thị.

**Alternatives considered**: trả `quantity` rồi để giao diện tự quy đổi — con số nằm trong dữ
liệu thô trình duyệt nhận được, vi phạm FR-007 dù màn hình không hiện nó; trả boolean —
không sai, nhưng enum để ngỏ chỗ cho trạng thái `Ngừng bán` (FR-26) mà `009` sẽ cần.

## D-4 — Header an toàn phát ở đâu

**Decision**: `ops/Caddyfile` phát `Content-Security-Policy` và các header kèm theo cho **cả
hai** đường dẫn — đường dẫn bán hàng và đường dẫn quản trị — kể cả khi đường dẫn quản trị chưa
có ứng dụng phía sau ở `000`.

**Rationale**: AD-29 đòi CSP hạ cánh **trong** `000` *"cùng lúc với Caddy, không phải sau"*.
Vì bundle quản trị hoãn tới `006` (quyết định 2026-09-19), phát header sẵn cho đường dẫn của
nó là cách duy nhất giữ đúng cả hai ràng buộc. Hệ quả: `006` chỉ cắm bundle vào một đường dẫn
**đã** được bảo vệ, và không được phép đặt lại chính sách.

**Alternatives considered**: phát header từ ứng dụng NestJS — không phủ được tệp tĩnh do proxy
phục vụ trực tiếp; hoãn header tới `006` — vi phạm AD-29 thẳng, là ARCHITECTURE_CONFLICT.

## D-5 — Không tạo tầng `usecases` ở `000`

**Decision**: không tạo `apps/api/src/usecases/`.

**Rationale**: đồ thị phụ thuộc đã có mũi tên `catalog → stock`, nên đường đọc sản phẩm kèm
tình trạng tồn kho là một lời gọi service công khai hợp lệ. AD-22 dựng `usecases` cho FR-24,
FR-25, FR-27 — cả ba thuộc feature khác. Tạo sẵn một tầng rỗng là mời người sau đặt nhầm luật
nghiệp vụ vào đó.

**Alternatives considered**: tạo sẵn để `009` khỏi phải tạo — `009` tạo nó khi có việc thật cho
nó làm, rẻ hơn là canh một thư mục rỗng khỏi bị lạm dụng.

---

## Đã chốt — không còn treo

Hai mục dưới đây từng là Open Item; người quyết **Tuan Nguyen** đóng chúng ngày **2026-09-19**.

**(A) Nạp Sản phẩm mẫu**: script seed riêng `db/seed.ts`, idempotent, tách khỏi
`db/migrations/`, không chạy ở prod. *Alternatives rejected*: nhét vào migration — làm bẩn
ranh giới AD-25 và khoá dữ liệu demo vào lịch sử chỉ-tiến; nạp tay ngoài repo — phá `SC-007`.

**(B) Tên trường còn/hết**: thuật ngữ **stock status**, giá trị `in_stock` / `out_of_stock`.
*Alternatives rejected*: `available` (không ghép được với canonical term nào); trả `quantity`
rồi để FE quy đổi (vi phạm FR-007 + AD-19 vì con số nằm trong dữ liệu thô).
*Nợ*: một dòng trong `glossary.md`, phải làm trên nhánh `baseline/*` — feature này không tự thêm.
