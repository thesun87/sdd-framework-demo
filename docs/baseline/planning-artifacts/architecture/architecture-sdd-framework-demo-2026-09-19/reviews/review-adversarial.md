---
title: "Review — Adversarial lens → ARCHITECTURE-SPINE"
type: review
lens: adversarial
pass: REVIEW (spine → holes)
status: final
created: 2026-09-19
spine: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../prds/prd-sdd-framework-demo-2026-09-18/prd.md
  - ../../../prds/prd-sdd-framework-demo-2026-09-18/addendum.md
  - ../../../../glossary.md
---

# Review — Adversarial lens

## Phương pháp

Lens này **không** hỏi "spine có thiếu gì so với PRD không" (đó là việc của
`reconcile-prd.md`). Câu hỏi duy nhất ở đây:

> Dựng hai đơn vị ở tầng dưới — hai feature trong `feature-map.md` — mà **mỗi cái
> tuân thủ từng chữ của mọi AD**, rồi xem chúng có build ra hai thứ không lắp được
> vào nhau không. Mỗi cặp tìm được là một lỗ hổng phải bịt bằng một AD mới hoặc
> một AD được siết chặt.

`feature-map.md` hiện chỉ có `000-walking-skeleton` (placeholder), nên các feature
dưới đây là **phân rã hợp lý nhất** suy ra từ §4 của PRD và từ bảng
*Capability → Architecture Map* của chính spine. Chúng là công cụ của lens, không
phải đề xuất về feature map:

| ID giả định | Outcome | FR |
|---|---|---|
| `001-catalog-browse-search` | Duyệt, tìm, phân trang | FR-1–3 |
| `002-product-page` | Trang sản phẩm + còn/hết | FR-4, FR-5 |
| `003-cart-and-wall` | Giỏ hàng + tường đăng ký | FR-6–8, FR-11 |
| `004-accounts-sessions` | Đăng ký, đăng nhập, tài khoản chủ shop | FR-9, FR-10, FR-33 |
| `005-order-placement` | Đặt đơn nguyên tử | FR-12–15 |
| `006-order-lifecycle` | Chuyển trạng thái, huỷ, hoàn kho | FR-16–19 |
| `007-shipping-fee` | Nhập phí, khách thấy tổng mới | FR-20, FR-21 |
| `008-payment-confirmation` | COD, chuyển khoản, gác `confirmed` | FR-22–24 |
| `009-product-admin` | Back office sản phẩm, danh mục, ảnh | FR-25, FR-26, FR-28 |
| `010-stock-adjustment-ledger` | Điều chỉnh tồn kho + màn hình sổ cái | FR-27 |
| `011-backoffice-orders` | Danh sách + chi tiết đơn | FR-29, FR-30 |
| `012-customer-order-history` | Lịch sử đơn + cô lập dữ liệu | FR-31, FR-32 |
| `013-password-reset` | Chủ shop đặt lại mật khẩu khách | AD-7, Q10 |
| `014-anonymisation` | Ẩn danh hoá sau 12 tháng | PRD §9.3, Q3 |

**13 lỗ hổng.** 4 CRITICAL, 5 HIGH, 4 MEDIUM. Bốn cái CRITICAL đều là đường
bán quá tồn kho hoặc rò dữ liệu chéo khách hàng — tức là đánh thẳng vào SM-1 và
bất biến §8 #3, hai thứ mà §1 của PRD nói nếu chỉ giữ được một yêu cầu thì giữ
chúng. Cả bốn đều đi tới đó **mà không vi phạm một chữ nào trong spine**.

---

## Bảng tổng hợp

| # | Mức | Hai đơn vị va nhau | Kiểu va chạm | AD đề xuất |
|---|---|---|---|---|
| H-1 | **CRITICAL** | `010-stock-adjustment-ledger` × `005-order-placement` | Đường ghi tồn kho thứ hai, read-then-write, mất hàng đã trừ | AD-1 siết |
| H-2 | **CRITICAL** | `011-backoffice-orders` × `006-order-lifecycle` | Hai tab cùng huỷ một đơn → hoàn kho hai lần | AD-14 siết |
| H-3 | **CRITICAL** | `005-order-placement` × `010-stock-adjustment-ledger` | Ai sở hữu transaction khi nó vượt biên module | **AD-23** mới |
| H-4 | **CRITICAL** | `003-cart-and-wall` × `005-order-placement` | Khoá idempotency không gắn `customer_id` → trả đơn của khách khác | AD-18 siết |
| H-5 | **HIGH** | `008-payment-confirmation` × `006-order-lifecycle` | `payment_confirmed_at` là trường gác nhưng nằm ngoài cửa AD-14 | AD-14 siết |
| H-6 | **HIGH** | `009-product-admin` × `005-order-placement` | `usecases` mở transaction xuyên miền | AD-22 siết |
| H-7 | **HIGH** | `009-product-admin` × `005-order-placement` | Xoá cứng sản phẩm TOCTOU; không AD nào nói quan hệ nào là FK | **AD-24** mới |
| H-8 | **HIGH** | `002-product-page` × `003-cart-and-wall` (và AD-3 tự mâu thuẫn) | Con số tồn kho rò sang storefront qua đúng hai cửa spine tự mở | AD-19 siết |
| H-9 | **HIGH** | `012-customer-order-history` × `014-anonymisation` | Cron ẩn danh hoá cần một phương thức đọc không lọc `customer_id` | AD-13 siết |
| H-10 | **HIGH** | `002-product-page` × `011-backoffice-orders` | Một phiên, hai bề mặt: XSS ở storefront cầm quyền chủ shop | AD-8 siết |
| H-11 | **MEDIUM** | `010-stock-adjustment-ledger` × `006-order-lifecycle` | `stock_ledger.order_id`: id nội bộ hay `order_code`? Và nó mục ra sao | AD-2 siết |
| H-12 | **MEDIUM** | `010-stock-adjustment-ledger` × `011-backoffice-orders` | Hai usecase định nghĩa hai hình dạng cho cùng một projection + N+1 | **AD-25** mới |
| H-13 | **MEDIUM** | `006-order-lifecycle` × `012-customer-order-history` | 403 hay 404: hai endpoint, hai câu trả lời cho cùng một loại request | AD-13 siết |

---

## H-1 — `010-stock-adjustment-ledger` × `005-order-placement` · CRITICAL

### Cái mỗi bên xây, và câu nó đang tuân thủ

**`005-order-placement`** đọc **AD-1**:

> *"Mọi lần **trừ kho** thực hiện bằng `UPDATE ... SET quantity = quantity - :n
> WHERE product_id = :id AND quantity >= :n`"*

và xây đúng thế. Không đọc-rồi-ghi. Hoàn hảo.

**`010-stock-adjustment-ledger`** phải hiện thực **FR-27**, mà FR-27 nói:

> *"Chủ shop **đặt lại** con số tồn kho của một sản phẩm"* · *"Đặt tồn kho về một
> số nguyên ≥ 0 thành công"* · *"Mỗi thay đổi tồn kho ghi lại: sản phẩm, **giá trị
> trước**, giá trị sau, …"*

Đây là một phép **gán tuyệt đối**, không phải một phép trừ. Và để ghi được
`giá trị trước` vào `stock_ledger` (AD-2 bắt buộc: *"mỗi lần thay đổi ghi một dòng
`stock_ledger` trong cùng transaction"*), 010 **buộc phải đọc** giá trị hiện tại.
Nó viết:

```sql
SELECT quantity FROM stock WHERE product_id = :id;   -- lấy "giá trị trước"
UPDATE stock SET quantity = :new WHERE product_id = :id;
INSERT INTO stock_ledger (…, before, after, reason) VALUES (…, 'manual_adjustment');
```

Người xây 010 đọc AD-1 và kết luận — **đúng theo mặt chữ** — rằng câu cấm
đọc-rồi-ghi thuộc về mệnh đề *"mọi lần trừ kho"*, và việc này không phải trừ kho.
Nó cũng ở trong module `stock`, đi qua service công khai, có ghi sổ cái: **AD-2
thoả, AD-4 thoả, AD-5 thoả, AD-16 thoả.**

### Va chạm cụ thể

Tồn kho = 10. Chủ shop đếm kho tay, thấy 3, bấm "Đặt tồn kho = 3". Cùng lúc chị
Hằng đặt 2 món.

| t | `010` (điều chỉnh) | `005` (đặt đơn) | `stock.quantity` |
|---|---|---|---|
| 1 | `SELECT` → đọc được 10 | | 10 |
| 2 | | `UPDATE … quantity - 2 WHERE quantity >= 2` → commit | 8 |
| 3 | `UPDATE … SET quantity = 3` → commit | | **3** |

Hai món chị Hằng vừa mua **được cộng lại vào kho**. Đúng ra phải còn 1.
`CHECK (quantity >= 0)` thoả ở mọi bước — **bất biến ở tầng dữ liệu không nhìn
thấy gì cả**, vì đây không phải một phép trừ xuống âm, đây là một phép ghi đè mù.
Tiêu đề AD-1 *"bất biến tồn kho được bảo đảm ở tầng dữ liệu, không ở tầng ứng
dụng"* sai trên đúng đường này.

Sổ cái thì ghi: `−2 (order_placed)`, rồi `before=10, after=3`. Cộng dồn từ 10 ra 1;
cột nói 3. **AD-4 sẽ bắt được** — nhưng chỉ ở lần cron kế tiếp, tức là sau khi hai
món ma đã được bán ra. Và AD-4 chỉ nói *"chênh lệch được xử lý như một sự cố"*;
nó không nói sự cố đó **làm gì**. Không có AD nào nói phải chặn bán, phải khoá sản
phẩm, hay phải báo ai.

Tệ hơn: **test bắt buộc của AD-21 không bao giờ chạm tới đường này.** AD-21 đòi
"N tiến trình cùng đặt đơn cho một sản phẩm tồn kho M". Không tiến trình nào trong
đó điều chỉnh tồn kho. Lỗ này nằm ngoài toàn bộ vùng phủ mà spine tự đặt ra cho mình.

### AD đề xuất — siết AD-1

> **AD-1 (siết).** Luật này áp cho **mọi** đường ghi vào `stock.quantity`, không
> riêng phép trừ.
>
> - **Trừ kho** (đặt đơn): `UPDATE … SET quantity = quantity - :n WHERE
>   product_id = :id AND quantity >= :n`.
> - **Hoàn kho** (huỷ đơn): `UPDATE … SET quantity = quantity + :n WHERE
>   product_id = :id`.
> - **Gán tuyệt đối** (điều chỉnh tay, FR-27): `UPDATE … SET quantity = :new
>   WHERE product_id = :id AND quantity = :expected`, trong đó `:expected` là con
>   số mà chủ shop **đã nhìn thấy trên màn hình lúc bấm**. Số dòng bị ảnh hưởng = 0
>   nghĩa là *"tồn kho đã đổi dưới tay bạn"* — trả về màn hình đọc lại với con số
>   mới, **không bao giờ retry tự động**, vì một retry tự động sẽ ghi đè đúng cái
>   thay đổi mà kiểm tra này tồn tại để phát hiện.
>
> Ba câu lệnh trên là **danh sách đóng**. `before`/`after` của dòng `stock_ledger`
> lấy từ mệnh đề `RETURNING` của chính câu lệnh đó, **không bao giờ** từ một
> `SELECT` đứng trước. Không đường ghi tồn kho nào được phép tồn tại dưới hình
> dạng `SELECT` rồi `UPDATE` theo giá trị vừa đọc — kể cả khi nó không phải phép trừ.

> **AD-21 (bổ sung).** Thêm một test đồng thời mang tên: *một điều chỉnh tay chạy
> song song với một lần đặt đơn trên cùng sản phẩm; kết quả cuối phải là một trong
> hai kết quả tuần tự hợp lệ, không bao giờ là một kết quả thứ ba.*

---

## H-2 — `011-backoffice-orders` × `006-order-lifecycle` · CRITICAL

### Cái mỗi bên xây

**`006-order-lifecycle`** đọc **AD-14**:

> *"**một hàm duy nhất** trong `ordering` thực hiện mọi chuyển trạng thái, đối
> chiếu một bảng chuyển hợp lệ khai báo tường minh. Nó là nơi duy nhất gọi `stock`
> để hoàn kho"*

và xây đúng một hàm `transition(orderId, to, actor)`. Bên trong: đọc đơn, tra
bảng, ghi trạng thái, ghi `order_status_event`, và nếu là `placed|confirmed →
cancelled` thì gọi `stock.public.refund()`. Một cửa. AD-14 thoả trọn vẹn.

**`011-backoffice-orders`** hiện thực FR-29 + FR-30. FR-30 nói:
*"Các hành động khả dụng đúng theo trạng thái hiện tại"*, nên nó vẽ nút "Huỷ đơn"
trên cả màn hình danh sách lẫn màn hình chi tiết. Nó **không tự chuyển trạng thái**
— nó gọi đúng cái cửa duy nhất của 006. AD-14 thoả trọn vẹn.

### Va chạm cụ thể

Chủ shop mở danh sách đơn ở tab 1 và chi tiết cùng đơn đó ở tab 2. Đơn ở `placed`,
2 món. Bấm "Huỷ" ở cả hai tab (hoặc: bấm một lần, mạng chậm, bấm lại).

| t | Request A | Request B | Kết quả |
|---|---|---|---|
| 1 | đọc `status = 'placed'` | | |
| 2 | | đọc `status = 'placed'` | |
| 3 | bảng chuyển: `placed → cancelled` ✓ | | |
| 4 | | bảng chuyển: `placed → cancelled` ✓ | |
| 5 | `stock.refund(+2)` | | kho +2 |
| 6 | | `stock.refund(+2)` | **kho +4** |
| 7 | ghi `order_status_event` | ghi `order_status_event` | 2 dòng trùng |

**Hoàn kho hai lần cho một lần huỷ.** Hai món không tồn tại vừa được đưa vào kho
để bán. Đây là **bán quá tồn kho** — đúng thứ §1 của PRD nói là một yêu cầu duy
nhất phải giữ nếu mọi thứ khác bị cắt.

FR-18 đã nhìn thấy nguy cơ này và viết thẳng ra:
*"Huỷ hai lần cùng một đơn không hoàn kho hai lần (FR-16 đã chặn, kiểm chứng riêng
ở đây)"* — nó **uỷ thác việc chặn cho FR-16**. FR-16 uỷ thác cho bảng chuyển hợp
lệ. Bảng chuyển hợp lệ là một cấu trúc dữ liệu tĩnh; nó không có khái niệm đồng
thời. **AD-14 nói "một cửa", nó không nói "một cửa có khoá".** Chuỗi uỷ thác kết
thúc ở hư không.

Hệ quả phụ, cũng thật: hai dòng `order_status_event` trùng làm hỏng SM-4 (trung vị
`placed → confirmed`) và làm SM-3 (*"không có lần chuyển trạng thái nào bị từ chối"*)
**dễ đạt hơn khi hệ thống sai** — cả hai request đều thành công, không có 409 nào
để đếm.

Lưu ý một cái bẫy: người xây sẽ tra bảng *Phương án đã bị loại* của spine, thấy
dòng **"Khoá bi quan (`SELECT … FOR UPDATE`)"** bị loại, và dùng nó để từ chối
khoá dòng đơn. Lý do loại ở đó là *"tranh chấp tăng ở sản phẩm bán chạy"* — nó nói
về **tranh chấp tồn kho**, không về một dòng `order` mà đúng một người đang xem.
Spine không phân biệt, nên việc từ chối đó có thể biện minh được bằng chính spine.

### AD đề xuất — siết AD-14

> **AD-14 (siết).** Hàm chuyển trạng thái duy nhất mở transaction của chính nó và
> **khoá dòng `order` bằng `SELECT … FOR UPDATE` trước khi đọc trạng thái**, rồi
> mới tra bảng chuyển. Việc ghi trạng thái, ghi `order_status_event`, và lời gọi
> hoàn kho tới `stock` nằm trong **cùng** transaction đó. Một lần huỷ không bao giờ
> hoàn kho hai lần vì không bao giờ có hai lần chuyển `→ cancelled` cùng đọc được
> `placed`.
>
> Ngoài ra, mọi request chuyển trạng thái mang theo **trạng thái hiện tại mà người
> dùng đang nhìn thấy**; lệch với trạng thái đọc được dưới khoá → **HTTP 409**
> (đúng mã lỗi FR-16 đã quy định), kèm trạng thái thật để UI đọc lại. Đây là cách
> hai tab của cùng một chủ shop được phân xử.
>
> **Khoá bi quan bị loại ở bảng *Phương án đã bị loại* là khoá trên `stock`, vì
> lý do tranh chấp trên sản phẩm bán chạy. Nó không áp cho khoá trên một dòng
> `order`,** nơi tranh chấp tối đa là số tab mà một người đang mở. Ghi rõ điều này
> vào bảng đó để không ai viện dẫn nhầm.

> **AD-21 (bổ sung).** Test mang tên: *hai request huỷ đồng thời trên cùng một đơn
> `placed` → đúng một lần hoàn kho, đúng một dòng `order_status_event`, request
> còn lại nhận 409.*

---

## H-3 — `005-order-placement` × `010-stock-adjustment-ledger` · CRITICAL

### Hai AD kéo ngược nhau

**AD-3** đặt transaction ở `ordering`:

> *"tạo đơn, trừ kho mọi dòng, và ghi sổ cái nằm trong **một** transaction"*

**AD-2** đặt việc ghi sổ cái ở `stock`, cũng trong một transaction:

> *"Mọi thay đổi đi qua service công khai của `stock`, và **mỗi lần thay đổi ghi
> một dòng `stock_ledger` trong cùng transaction**"*

**AD-5** cấm hai module chạm bảng của nhau:

> *"Truy cập chéo **chỉ** qua service công khai (`<domain>.public.ts`) của module
> sở hữu."*

Ba câu này cùng đúng thì có đúng một câu hỏi không ai trả lời: **`ordering` mở một
transaction rồi gọi `stock.public.deduct()` — lời gọi đó chạy trong transaction
nào?** Spine im lặng hoàn toàn. Không có chữ "transaction" nào trong AD-5, AD-22,
hay bảng *Consistency Conventions*.

### Hai bản dựng, cả hai đều hợp lệ

**Bản A — `010` đóng gói transaction của chính nó.** Người xây `010` đọc AD-2
(*"trong cùng transaction"*) và viết `stock.public.ts` tự chủ:

```ts
export async function deduct(productId: bigint, n: number, cause: Cause) {
  return db.transaction(async (tx) => {          // ← stock tự mở
    const [row] = await tx.update(stock)…returning()
    await tx.insert(stockLedger)…
  })
}
```

Chữ ký `deduct(productId, n, cause)` không nhận transaction handle — **đúng tinh
thần AD-5**: không có gì của tầng dữ liệu rò qua biên module. `010` xây xong,
review qua, hợp lệ từng chữ.

`005` gọi hàm đó bên trong `db.transaction()` của mình. Với Drizzle (và với mọi ORM
có `db` là một pool), `db.transaction()` lồng trong `db.transaction()` **lấy một
connection khác** và mở một transaction **độc lập**. Hệ quả:

- Dòng 1 trừ kho OK (transaction riêng, **commit ngay**).
- Dòng 2 không đủ hàng → `005` rollback transaction của nó.
- Đơn hàng biến mất. **Tồn kho của dòng 1 không quay lại.**
- `stock_ledger` có một dòng `order_placed` mang `order_id` của một đơn **chưa
  bao giờ tồn tại**.

AD-3 hứa *"rollback toàn bộ và **không có đơn nào tồn tại** — không có đơn một
phần"*. Lời hứa đó đúng về **đơn**, và sai về **kho**. Và AD-4 mù với sự cố này:
cột và sổ cái **khớp nhau** — cả hai cùng sai. Cron đối chiếu trả về "không lệch".

**Bản B — `005` truyền transaction xuống.** Người xây `005` đọc AD-3
(*"một transaction"*), thấy bản A không đạt, và đổi chữ ký:
`deduct(tx, productId, n, cause)`. Bây giờ một handle database đi qua biên module.
`ordering` cầm trong tay một `tx` mà nó có thể dùng để
`tx.execute(sql\`UPDATE stock …\`)` — **đúng cái mà AD-2 và AD-5 tồn tại để cấm**,
và không có gì ở tầng type chặn lại. Ngoài ra `010` vừa bị đổi chữ ký public bởi
một feature khác, tức là biên module đã mềm đi.

Cả hai bản đều đọc được từ spine. **Cái quyết định bên nào thắng là feature nào
được xây trước** — và đó chính là định nghĩa của một lỗ hổng trong spine.

### Va chạm phụ: thứ tự khoá chỉ được cố định cho một đường

AD-3 cố định thứ tự `product_id` tăng dần **cho việc đặt đơn**. Đường hoàn kho của
`006` (AD-14) xử lý cũng nhiều dòng của cùng một đơn và **không có luật thứ tự
nào**. Hai đơn cùng chứa sản phẩm A và B, huỷ đồng thời theo thứ tự ngược nhau →
deadlock. Đây đúng là kịch bản mà AD-3 mô tả trong mục *Prevents* của chính nó,
nhưng luật chỉ được viết cho một nửa hệ thống.

### AD đề xuất — AD-23 mới

> ### AD-23 — Ai mở transaction thì người đó sở hữu nó; module tham gia, không mở
>
> - **Binds:** cả năm module, `usecases`, AD-2, AD-3, AD-5, AD-14
> - **Prevents:** `ordering` mở transaction theo AD-3 trong khi `stock` mở
>   transaction của riêng nó theo AD-2 — hai transaction, một đơn vị công việc, và
>   rollback của bên ngoài không hoàn tác bên trong. AD-4 không phát hiện được vì
>   cột và sổ cái cùng sai một lượng.
> - **Rule:**
>   1. `packages/shared` khai một kiểu **`UnitOfWork`** mờ (opaque): nó không phơi
>      ra `execute`, `select` hay bất kỳ lối nào chạy SQL tuỳ ý. Nó chỉ là một
>      token định danh transaction.
>   2. **Mọi phương thức ghi trong `<domain>.public.ts` nhận `uow: UnitOfWork` làm
>      tham số đầu tiên.** Phương thức đọc thì không.
>   3. Module nhận `uow` **tham gia** transaction đó. **Không module nào được gọi
>      `db.transaction()` khi đã nhận một `uow`** — và không đường ghi nào được
>      chạy ngoài một `uow`.
>   4. Transaction chỉ được mở ở **đúng một chỗ**: controller/service của module
>      khởi xướng đơn vị công việc. `usecases` **không** thuộc số đó (xem H-6).
>   5. Vì `UnitOfWork` không phơi ra API chạy SQL, việc truyền nó qua biên module
>      **không** là một lỗ hổng của AD-5: `ordering` không có cách nào dùng nó để
>      chạm bảng của `stock`.

> **AD-3 (siết).** Luật *"xử lý theo `product_id` tăng dần"* áp cho **mọi thao tác
> chạm nhiều dòng `stock` trong một transaction** — đặt đơn (FR-14), hoàn kho khi
> huỷ (FR-18), và bất kỳ điều chỉnh hàng loạt nào nếu sau này có. Không phải riêng
> đặt đơn.

---

## H-4 — `003-cart-and-wall` × `005-order-placement` · CRITICAL

### Cái mỗi bên xây

**AD-18** nói, nguyên văn:

> *"client sinh một **khoá idempotency** cho mỗi lần bấm đặt đơn và gửi kèm
> request. Khoá được lưu kèm đơn dưới một **ràng buộc duy nhất ở tầng dữ liệu**;
> request thứ hai mang cùng khoá **trả về đơn đã tạo**"*

**`003-cart-and-wall`** sở hữu màn hình đặt đơn ở storefront, nên nó sinh khoá:
`crypto.randomUUID()` khi khách vào bước xác nhận. Đúng AD-18.

**`005-order-placement`** lưu khoá và hiện thực "trả về đơn đã tạo":

```sql
CREATE UNIQUE INDEX ON "order" (idempotency_key);
```

```ts
const existing = await orderRepo.findByIdempotencyKey(key)   // ← đúng mặt chữ AD-18
if (existing) return existing
```

Đúng từng chữ của AD-18: *một* ràng buộc duy nhất, trên khoá, và request thứ hai
mang cùng khoá trả về đơn đã tạo.

### Va chạm 1 — rò dữ liệu chéo khách hàng (authz bypass)

`findByIdempotencyKey(key)` **không nhận `customer_id`**. Nó không thể nhận, vì
AD-18 định nghĩa khoá là thứ định danh *request*, không phải thứ định danh *khách*.

**AD-13** nói:

> *"repository của `ordering` **không phơi ra phương thức nào đọc đơn mà không
> nhận `customer_id`**"*

`005` vừa phơi ra đúng một phương thức như thế — **và AD-18 là thứ bắt nó làm vậy.**
Hai AD mâu thuẫn trực tiếp, và AD-18 thắng vì nó cụ thể hơn.

Hệ quả: khách B gửi đặt đơn với một khoá trùng khoá của khách A (client yếu, một
hằng số bị copy-paste lúc dev rồi lọt lên prod, một request bị replay, hoặc đơn
giản là một client tự viết) → hệ thống **trả về đơn của khách A**: mã đơn, các dòng
hàng, **tên người nhận, số điện thoại, địa chỉ giao hàng**. Bất biến §8 #3 —
*"Không khách hàng nào đọc được dữ liệu của khách hàng khác"* — sụp qua một đường
mà FR-32 không nghĩ tới, vì FR-32 chỉ nói về endpoint *đọc* đơn, còn đây là
endpoint *tạo* đơn.

Và đây là dữ liệu cá nhân theo NĐ 13/2023 (§9.1). Không test nào của AD-21 chạm
tới: AD-21 liệt kê *"mỗi bất biến của `PRD §8` và AD-18 có ít nhất một test mang
tên nó"* — test của AD-18 sẽ là "bấm hai lần không tạo hai đơn", không phải "hai
khách khác nhau dùng chung khoá".

### Va chạm 2 — retry đến khi request thứ nhất còn đang bay

Kịch bản mà lens được yêu cầu săn. Request 1 chậm **chính vì** đang tranh chấp tồn
kho — tức là đúng lúc khách bấm lại.

| t | Request 1 (đang bay) | Request 2 (retry) |
|---|---|---|
| 1 | `BEGIN` | |
| 2 | | `findByIdempotencyKey` → **NULL** (R1 chưa commit) |
| 3 | trừ kho dòng 1, 2, 3 | |
| 4 | | trừ kho dòng 1, 2, 3 — **kho bị trừ lần hai** |
| 5 | `INSERT order (…, key)` | |
| 6 | | `INSERT order (…, key)` → **block** trên unique index |
| 7 | `COMMIT` | |
| 8 | | unique violation → rollback |

Với **AD-23 đã áp dụng** (H-3), rollback của R2 hoàn tác cả phần trừ kho, nên tồn
kho cuối cùng đúng. Nhưng:

- Khách nhận **HTTP 409 / 500** cho đúng cú bấm nhầm của mình, thay vì *"trả về đơn
  đã tạo"* mà AD-18 hứa. Toàn bộ lý do tồn tại của AD-18 thất bại ở đúng kịch bản
  nó được viết ra để xử lý.
- Trong suốt bước 4–8, tồn kho **bị giữ hai lần**. Một khách thứ ba đặt đơn trong
  cửa sổ đó nhận *"Đơn chưa đặt được — hết hàng"* cho hàng thực ra vẫn còn. AD-3
  gọi kết quả đó là *"tham khảo, không phải cam kết"*, nên nó hợp lệ — nhưng nó là
  một màn hình thất bại giả, ở đúng khoảnh khắc UX nặng nhất của sản phẩm
  (addendum §5).

Và **nếu H-3 được giải theo bản A** (stock tự mở transaction), bước 4 **không được
rollback** và đây thành một đường trừ kho hai lần thẳng thớm.

### AD đề xuất — siết AD-18

> **AD-18 (siết).**
>
> 1. Ràng buộc duy nhất là **`UNIQUE (customer_id, idempotency_key)`**, không bao
>    giờ trên `idempotency_key` một mình. Khoá là thứ định danh *một lần bấm của
>    một khách*, không phải một định danh toàn cục.
> 2. Việc tra khoá đi qua một phương thức repository **nhận `customer_id`** —
>    `findOwnOrderByIdempotencyKey(customerId, key)` — nên AD-13 không có ngoại
>    lệ nào. Một khoá thuộc khách khác được coi như **chưa từng thấy**, không phải
>    một lần trúng.
> 3. **Thứ tự bắt buộc bên trong transaction:** `INSERT` dòng `order` (mang khoá)
>    là thao tác **đầu tiên**, trước mọi lời gọi trừ kho. Unique index khi đó là
>    thứ tuần tự hoá các bản sao: request thứ hai **block** ở `INSERT` chứ không
>    đi tiếp vào việc trừ kho.
> 4. **Cấm mẫu "đọc trước rồi chèn".** Khi `INSERT` trả về vi phạm unique, đó
>    **không** phải lỗi: rollback, đọc lại đơn của chính khách đó theo khoá, và
>    trả về **HTTP 200 kèm đơn đã tạo** — đúng lời hứa của AD-18 kể cả khi retry
>    đến lúc request đầu còn đang bay.
>
> **AD-21 (bổ sung).** Hai test mang tên: *(a) hai request đồng thời cùng
> `(customer_id, key)` trên tồn kho M → cùng một `order_code`, trừ kho đúng một
> lần, cả hai nhận 200; (b) hai khách khác nhau dùng chung một giá trị khoá → hai
> đơn riêng biệt, không khách nào nhìn thấy đơn của người kia.*

---

## H-5 — `008-payment-confirmation` × `006-order-lifecycle` · HIGH

### Cái mỗi bên xây

**AD-14** khoá chặt một thứ duy nhất: **cột trạng thái.**

> *"Không controller nào `UPDATE` trực tiếp **cột trạng thái**."*

**`008-payment-confirmation`** hiện thực FR-24. Và FR-24 nói rõ:

> *"Xác nhận thanh toán tự nó **không** đổi trạng thái đơn — đó là hai hành động
> riêng."*

Nên `008` **không** đi qua cửa AD-14 — nó không được phép, vì nó không phải một
chuyển trạng thái. Nó viết thẳng:

```sql
UPDATE "order" SET payment_confirmed_at = now(), payment_confirmed_by = :actor
WHERE id = :id AND payment_method = 'bank_transfer' AND payment_confirmed_at IS NULL;
```

Không chạm cột trạng thái. **AD-14 thoả. AD-12 thoả** (spine tự liệt `payment_*`
là trường của `Order`). AD-5, AD-2 không liên quan.

**`007-shipping-fee`** làm y hệt cho FR-20, và **AD-12 cấp phép tường minh**:

> *"Sau khi tạo, các trường này chỉ thay đổi qua đúng hai đường: nhập phí giao hàng
> (FR-20) và ẩn danh hoá (§9.3)"*

```sql
UPDATE "order" SET shipping_fee = :fee, shipping_fee_updated_at = now()
WHERE id = :id AND status = 'placed';
```

**`006-order-lifecycle`** giữ cửa trạng thái và, theo AD-14, đọc `payment_confirmed_at`
trực tiếp để chặn huỷ (FR-24) và gác `confirmed`.

### Va chạm cụ thể — trạng thái và trường gác đọc lẫn nhau, không ai khoá

`payment_confirmed_at` và `shipping_fee` **không phải trường dữ liệu thường**. Cả
hai là **trường gác**: chúng xuất hiện trong điều kiện của bảng chuyển trạng thái,
và ngược lại trạng thái xuất hiện trong điều kiện ghi của chúng. Hai bên đọc nhau,
hai bên ghi độc lập, không bên nào khoá.

**Đua 1 — huỷ × xác nhận thanh toán.** Đơn `bank_transfer` ở `placed`. Chị Hằng
bấm "Huỷ đơn" (FR-17 cho phép ở `placed`). Cùng lúc chủ shop bấm "Đã nhận tiền".

| t | `006` (huỷ) | `008` (xác nhận tiền) |
|---|---|---|
| 1 | đọc đơn: `status=placed`, `payment_confirmed_at IS NULL` → **cho huỷ** | |
| 2 | | `UPDATE … payment_confirmed_at = now() WHERE … IS NULL` → **1 dòng, commit** |
| 3 | `UPDATE status='cancelled'`, `stock.refund(+n)`, ghi event → **commit** | |

Kết quả: một đơn **`cancelled` và đã xác nhận nhận tiền cùng lúc** — trạng thái mà
FR-24 tuyên bố là không thể tồn tại (*"mọi yêu cầu chuyển sang `cancelled` → HTTP
409, **dù từ chủ shop hay khách hàng, dù đơn đang ở trạng thái nào**"*). Tồn kho đã
được hoàn. Shop đang giữ tiền của một đơn đã huỷ, và §7.2 nói **không có quy trình
hoàn tiền** — chính xác cái tình huống mà phần *"Vì sao chặn thay vì xử lý"* của
FR-24 được viết ra để loại bỏ. Tiền vừa rời sổ sách một cách im lặng, đúng như
FR-24 cảnh báo.

**Đua 2 — nhập phí × chuyển `confirmed`.** Chủ shop nhập phí ở tab 1 (`WHERE
status='placed'` — đọc được), bấm "Xác nhận đơn" ở tab 2. Interleave → phí được ghi
lên một đơn đã thành `confirmed`. FR-20 nói việc đó phải là **HTTP 409**. Và FR-21
mất lời hứa cốt lõi của nó: *"Đơn ở `placed` có phí > 0 vẫn hiển thị nút huỷ"* —
tổng tiền của khách vừa tăng ở đúng khoảnh khắc quyền huỷ biến mất, là **chính xác**
vấn đề mà addendum §4 mô tả khi loại bỏ trạng thái `awaiting_customer_approval`.
Phương án bị loại quay lại qua cửa sau, dưới dạng một race condition.

### AD đề xuất — siết AD-14

> **AD-14 (siết).** `Order` có một tập **trường gác** khai báo tường minh:
> `status`, `payment_confirmed_at`, `shipping_fee`. Một trường là *trường gác* khi
> nó xuất hiện trong điều kiện của bảng chuyển trạng thái **hoặc** khi điều kiện
> ghi của nó đọc `status`.
>
> **Mọi lần ghi vào bất kỳ trường gác nào đi qua cùng một cửa** trong `ordering`:
> cửa đó khoá dòng `order` (`SELECT … FOR UPDATE`, xem AD-14 siết ở H-2), đọc lại
> **toàn bộ** tập trường gác dưới khoá, đối chiếu một **bảng luật hợp lệ duy nhất**
> phủ cả ba loại thao tác (chuyển trạng thái, xác nhận thanh toán, nhập phí), rồi
> mới ghi. FR-24 giữ nguyên nghĩa "xác nhận thanh toán không đổi trạng thái": đó
> là một **hàng khác trong cùng bảng luật**, không phải một đường ghi khác.
>
> **Thêm một trường vào `Order` mà nó tham gia điều kiện của một luật chuyển là
> một thay đổi kiến trúc, không phải một task** — nó phải được thêm vào danh sách
> trường gác trong cùng commit.

> **AD-21 (bổ sung).** Test mang tên: *huỷ đơn `placed`/`bank_transfer` đồng thời
> với xác nhận thanh toán → đúng một bên thắng; không bao giờ tồn tại đơn vừa
> `cancelled` vừa có `payment_confirmed_at`.*

---

## H-6 — `009-product-admin` × `005-order-placement` · HIGH

### Điều AD-22 **không** cấm

**AD-22** cấm ba thứ, rất rõ:

> *"Nó **không sở hữu bảng nào** và **không chứa luật nghiệp vụ** của riêng miền
> nào — chỉ dàn dựng thứ tự gọi và ghép kết quả. […] `usecases` không được tự kiểm
> tra tồn kho, không được tự quyết định chuyển trạng thái có hợp lệ không."*

Nó **không nói gì về transaction.** Và AD-3 vừa dạy cả đội một bài: *thao tác cần
nguyên tử thì bọc trong một transaction.*

**`009-product-admin`** cần FR-25 (xoá cứng sản phẩm chưa từng bán) — mà spine
tuyên bố tường minh là lý do tồn tại của tầng `usecases`. Người xây thấy ngay rằng
"kiểm tra rồi xoá" không nguyên tử, tra AD-3, và viết:

```ts
// usecases/hardDeleteProduct.ts — không sở hữu bảng, không có luật nghiệp vụ
export async function hardDeleteProduct(productId: bigint) {
  return db.transaction(async (tx) => {           // ← usecases mở transaction
    const used = await ordering.public.productAppearsInAnyOrder(tx, productId)
    if (used) throw new ProductInUse()
    await stock.public.remove(tx, productId)
    await catalog.public.hardDelete(tx, productId)
  })
}
```

Không sở hữu bảng ✓. Không chứa luật nghiệp vụ của riêng miền nào — nó chỉ *hỏi*
`ordering` và *bảo* `catalog`, y như AD-22 mô tả ✓. Gọi service công khai ✓. Không
module nào import `usecases` ✓. **AD-22 thoả trọn vẹn.**

### Va chạm cụ thể

Bây giờ `usecases` cầm một transaction ôm `ordering` + `stock` + `catalog`, và:

- **Thứ tự khoá vừa có người thứ hai.** AD-3 cố định `product_id` tăng dần cho
  `005`. `009` khoá theo thứ tự `order_line → stock → product`. Một lần đặt đơn
  đang giữ khoá trên `stock(A)` và chờ `stock(B)`; usecase xoá sản phẩm đang giữ
  khoá trên `product(B)` và chờ `stock(B)`. Không deadlock ở ví dụ này, nhưng
  **kỷ luật thứ tự khoá của AD-3 đã ngừng là bất biến toàn cục** — nó chỉ còn đúng
  cho những transaction mà `ordering` mở. Không có gì trong spine để chỉ ra rằng
  cái vừa mất là một bất biến.
- **Trần p95 gãy.** SM-C1 nói ngưỡng 1,0 s là **trần**, không phải mục tiêu. Một
  transaction do `usecases` mở sống suốt một chuỗi dàn dựng nhiều lời gọi (và, nếu
  người xây thêm một lời gọi nữa sau này, còn dài hơn), giữ khoá trên `stock(A)`
  suốt thời gian đó. Mọi lần đặt đơn chạm sản phẩm A xếp hàng phía sau. Không có
  test nào của AD-21 (N tiến trình **cùng đặt đơn**) tạo ra tải kiểu này.
- **Chữ ký public vừa bị ép đổi từ bên ngoài.** Ba module phải nhận `tx`/`uow` vì
  một feature back office, không vì nhu cầu của chính chúng.

Và cái sâu hơn: nếu một thao tác **thật sự cần** nguyên tử xuyên hai module, thì
điều đó đang nói **biên module đặt sai chỗ** — đó là một kết luận kiến trúc, không
phải một chi tiết hiện thực. Spine không có chỗ nào để nói câu đó.

### AD đề xuất — siết AD-22

> **AD-22 (siết).** `usecases` **không được mở transaction và không được truyền
> transaction đi**. Nó không nhận `UnitOfWork` (AD-23) trong bất kỳ chữ ký nào.
>
> Mỗi usecase là một **chuỗi các lời gọi module commit độc lập**. Với mỗi usecase
> có thể hỏng giữa chừng, spine (hoặc `plan.md` của feature) phải nêu tường minh
> **một trong hai**: hành động bù trừ, hoặc lý do trạng thái trung gian là chấp
> nhận được. Không usecase nào được merge khi chưa có một trong hai câu đó.
>
> Một thao tác thật sự đòi nguyên tử xuyên hai module là **bằng chứng biên module
> đặt sai chỗ** → escalate lên một thay đổi kiến trúc trên nhánh `baseline/*`,
> không giải quyết bằng một transaction ở `usecases`.
>
> *Hệ quả cho FR-25:* vì không có transaction xuyên miền, bất biến "sản phẩm đã
> từng bán thì không xoá cứng" **không thể** do usecase giữ. Nó phải nằm ở tầng dữ
> liệu — xem **AD-24** (H-7).

---

## H-7 — `009-product-admin` × `005-order-placement` · HIGH

### Điều chưa ai giao cho ai

Cùng cặp feature, một lỗ khác — và nó tồn tại **ngay cả khi H-6 đã được bịt**.

**`009-product-admin`** hiện thực FR-25:

> *"Sản phẩm đã xuất hiện trong bất kỳ đơn hàng nào **không xoá cứng được** […]
> Sản phẩm chưa từng xuất hiện trong đơn nào thì xoá cứng được."*

Theo **AD-22** (và với AD-22 đã siết theo H-6, **không có transaction**), usecase
trở thành:

```ts
const used = await ordering.public.productAppearsInAnyOrder(productId)  // commit 1
if (!used) await catalog.public.hardDelete(productId)                   // commit 2
```

**`005-order-placement`** chạy giữa hai lời gọi đó. Cửa sổ là mili giây, nhưng chị
Hằng đặt đơn lúc 10 giờ đêm đúng lúc chủ shop dọn danh mục, và spine không có gì
làm hẹp nó lại.

### Va chạm cụ thể

`order_line.product_id` trỏ tới một dòng `product` **vừa bị xoá**. Hệ quả dây chuyền:

- **FR-25 mất chính lý do tồn tại của mình** — *"để đơn cũ vẫn đọc được"*.
- **FR-30** (chi tiết đơn ở back office) và **FR-31** (chi tiết đơn của khách) đổ
  vỡ vĩnh viễn trên đơn đó. Với FR-31, đây là **kênh duy nhất** khách biết trạng
  thái đơn (§4.11) — chị Hằng mất hẳn đơn của mình.
- `stock` và `stock_ledger` còn dòng trỏ tới một `product_id` chết. **AD-4** đòi
  sổ cái append-only, không bao giờ xoá — nên chúng ở lại mãi. Cron đối chiếu của
  AD-4 hoặc crash hoặc lặng lẽ bỏ qua; spine không nói cái nào.

### Lỗ gốc: spine chỉ phán quyết **một** quan hệ vượt biên

Spine nói về đúng một quan hệ:

> *"`STOCK_LEDGER.order_id` cố ý **không** vẽ quan hệ tới `ORDER` […] Quan hệ vượt
> biên module khác là khoá ngoại ở tầng dữ liệu, **không phải** giấy phép `JOIN` ở
> tầng repository (AD-5)."*

*"Quan hệ vượt biên module khác là khoá ngoại"* — câu đó là một **khẳng định**, không
phải một luật: nó không nói FK đó mang `ON DELETE` gì, và không nói FK nào bắt buộc
tồn tại. `order_line.product_id`, `stock.product_id`, `order.customer_id`,
`product.category_id` — bốn quan hệ vượt biên, bốn hành vi xoá khác nhau cần thiết
(RESTRICT, CASCADE, RESTRICT, SET NULL theo FR-26), **không cái nào được phán quyết**.
Người xây `009` và người xây `005` sẽ đoán khác nhau, và người đoán trước thắng.

### AD đề xuất — AD-24 mới

> ### AD-24 — Mọi quan hệ vượt biên module được phán quyết một lần, kèm hành vi xoá
>
> - **Binds:** cả năm module, FR-25, FR-26, AD-2, AD-5, AD-22
> - **Prevents:** một bất biến vòng đời mà **không module đơn lẻ nào nhìn thấy đủ
>   dữ liệu để giữ** (FR-25: `catalog` không được đọc `ordering`) rơi xuống
>   `usecases` dưới dạng một kiểm tra "check-then-act" không có khoá — mà AD-22 lại
>   cấm `usecases` giữ bất biến. Kết quả: không ai giữ nó.
> - **Rule:** spine khai một bảng đóng, và không quan hệ vượt biên nào tồn tại
>   ngoài bảng này:
>
>   | Quan hệ | FK ở tầng dữ liệu? | Hành vi xoá | Vì sao |
>   |---|---|---|---|
>   | `order_line.product_id → product.id` | **Có** | **`RESTRICT`** | FR-25: đơn cũ phải đọc được. Xoá cứng thất bại **ở tầng dữ liệu**, không ở một `if` trong usecase. |
>   | `stock.product_id → product.id` | **Có** | `CASCADE` | Không có sản phẩm thì không có tồn kho. |
>   | `product.category_id → category.id` | **Có**, nullable | **`SET NULL`** | FR-26 nói đúng điều này. |
>   | `order.customer_id → account.id` | **Có** | `RESTRICT` | Tài khoản sống vĩnh viễn (spine, mục Deferred). |
>   | `stock_ledger.order_code` | **Không** | — | AD-2: `stock` không được biết `ordering` tồn tại. Xem **H-11** cho cái giá của nó. |
>   | `stock_ledger.product_id → product.id` | **Có** | `RESTRICT` | Sổ cái append-only (AD-4) thì không được trỏ vào hư không. Hệ quả: sản phẩm từng có bất kỳ chuyển động kho nào cũng không xoá cứng được — **hẹp hơn FR-25**, và đây là một quyết định người curate phải xác nhận. |
>
>   Lời gọi `productAppearsInAnyOrder` ở `usecases` **giữ nguyên** — nhưng vai trò
>   của nó đổi: nó chỉ để **UI nói trước cho chủ shop** rằng nút xoá sẽ không dùng
>   được. Nó **không phải** cái chặn. Cái chặn là FK.

---

## H-8 — `002-product-page` × `003-cart-and-wall` · HIGH

### Hai cửa mà chính spine mở ra cho con số tồn kho

**AD-19** là một lời hứa về **hình dạng type**, không phải về một bộ lọc:

> *"hợp đồng của Trang bán hàng phơi ra **một giá trị enum `in_stock |
> out_of_stock`**, không bao giờ là số nguyên. […] Đường đọc của storefront
> **không có cách nào** lấy được số lượng — đây là ràng buộc về *hình dạng type*,
> không phải một bộ lọc chạy lúc chạy."*

**`002-product-page`** tuân thủ: `ProductDetail.stock: 'in_stock' | 'out_of_stock'`
trong namespace `storefront` của `packages/shared`. Hoàn hảo.

**`003-cart-and-wall`** hiện thực FR-6, và FR-6 nói:

> *"Nhưng giỏ **phải đánh dấu đúng những dòng** đang vượt tồn kho, **nêu rõ số
> lượng còn bán được**."*

Không có cách nào thoả FR-6 bằng một enum hai giá trị. Người xây `003` thêm vào
namespace `storefront`:

```ts
export const CartLineStatus = z.object({
  productId: z.bigint(),
  exceedsStock: z.boolean(),
  availableQuantity: z.number().int(),   // ← con số, ở storefront
})
```

Cả hai đều đang tuân thủ — `002` tuân AD-19, `003` tuân FR-6 — và namespace
`storefront` bây giờ **có con số tồn kho chính xác**, đi tới mọi trình duyệt khách.
Ràng buộc "hình dạng type" của AD-19 vừa bị vô hiệu hoá cho toàn hệ thống: bất kỳ
người xây nào về sau cũng có một tiền lệ hợp lệ để trích dẫn.

### Tệ hơn: **AD-3 tự mâu thuẫn với AD-19**

Đây không cần feature thứ hai để phá — spine đã tự làm. **AD-3**, nguyên văn:

> *"`ordering` thực hiện **một lần đọc riêng, ngoài transaction**, trả về *mọi*
> dòng không đủ hàng **kèm số lượng hiện có**"*

"Số lượng hiện có" là một số nguyên, gửi tới **storefront**, trong payload lỗi của
API đặt đơn — và bảng *Consistency Conventions* mở sẵn cửa cho nó:

> *"Một envelope duy nhất khai trong `packages/shared`, có chỗ cho **payload lỗi
> có kiểu** (AD-3 cần trả danh sách dòng thiếu hàng)."*

Nên `005-order-placement`, chỉ bằng cách tuân thủ AD-3 và bảng quy ước, đưa con số
tồn kho chính xác vào bundle khách — qua một envelope mà mọi endpoint dùng chung,
tức là **hình dạng type cho phép nó ở mọi response lỗi của storefront**.

AD-19 tự mô tả là bất khả xâm phạm ở tầng type. Trên thực tế nó có **ba** lỗ, và
hai trong số đó do chính spine khoét: FR-6 (giỏ), AD-3 (payload từ chối), và
envelope lỗi dùng chung. Người xây `002` sẽ tin AD-19 đang bảo vệ mình, và nó không.

### AD đề xuất — siết AD-19

> **AD-19 (siết).** Con số tồn kho chính xác xuất hiện ở storefront tại **đúng hai
> chỗ, cả hai được gọi tên**, và không chỗ nào khác:
>
> 1. `CartLineAvailability` — dòng giỏ vượt tồn kho (FR-6).
> 2. `OrderRejectionLine` — payload từ chối đơn vì thiếu hàng (AD-3, FR-14).
>
> Cả hai là **kiểu riêng, đặt tên riêng** trong namespace `storefront`, **không
> phải một trường của một product read-model nào**. Không read-model nào mô tả
> `Product`, `ProductDetail` hay `ProductListItem` được mang một trường số lượng —
> đây vẫn là ràng buộc hình dạng type, và bây giờ nó kiểm chứng được bằng một test
> quét schema.
>
> **Payload lỗi có kiểu không phải một cửa mở.** Envelope lỗi dùng chung mang một
> union **đóng** các kiểu payload; thêm một biến thể là một thay đổi có review, và
> mỗi biến thể được gán bề mặt (`storefront` | `backoffice`) tường minh.
>
> Người curate baseline phải xác nhận rằng hai ngoại lệ này **chấp nhận được so
> với `[ASSUMPTION]` ở FR-5** (*"số lượng tồn chính xác là thông tin kinh doanh"*).
> Nếu không chấp nhận được thì **FR-6 và AD-3 phải đổi**, không phải AD-19 — và đó
> là quyết định của người, không của kiến trúc sư.

---

## H-9 — `012-customer-order-history` × `014-anonymisation` · HIGH

### Cái mỗi bên xây

**AD-13** là một luật về **hình dạng repository**, không về hành vi controller:

> *"repository của `ordering` **không phơi ra phương thức nào đọc đơn mà không
> nhận `customer_id`**; truy cập của chủ shop đi qua một phương thức riêng tên rõ
> ràng."*

**`012-customer-order-history`** xây đúng: `findForCustomer(customerId, …)`,
`findOneForCustomer(customerId, orderId)`. Rò → 404. Hoàn hảo.

**`014-anonymisation`** hiện thực §9.3: một cron trong tiến trình (AD-16 bắt buộc
như vậy) tìm **mọi đơn của mọi khách** đã `delivered`/`cancelled` 12 tháng trước và
xoá tên/số điện thoại/địa chỉ. Nó **không có `customer_id`** — theo định nghĩa —
và nó **không phải chủ shop**.

Hai lối thoát, cả hai đều hợp lệ theo mặt chữ:

- **(a)** Dùng phương thức của chủ shop. Bây giờ một cron chạy dưới quyền chủ shop
  mà không ai cấp quyền đó, và cái tên *"phương thức riêng tên rõ ràng"* thành sai
  — nó không còn là "của chủ shop".
- **(b)** Thêm `findAnonymisationCandidates(cutoff)` — không có `customer_id`.
  AD-13 bây giờ đọc thành *"không phương thức nào đọc đơn mà không nhận
  `customer_id`, trừ những cái có"*. Lập luận *Prevents* của AD-13 —
  *"một controller mới quên lọc là đủ để thủng"* — vừa mất hiệu lực, vì trong
  repository đã có sẵn một phương thức đọc không lọc, được review duyệt, cho
  feature sau copy.

### Va chạm thứ hai — nullable hay không, và ai trả lời

**AD-12** nói các trường của đơn bất biến trừ hai đường, một trong đó là ẩn danh hoá.
Nhưng **AD-10** nói hình dạng khai một lần trong `packages/shared` và validate ở cả
hai phía. FR-12 nói ba trường địa chỉ **bắt buộc** lúc tạo. Nên `005` khai
`recipientName: z.string().min(1)`.

`014` phải ghi gì? Ba lựa chọn, `014` chọn một mình:

- `NULL` → phải đổi schema thành nullable → **`005` mất ràng buộc bắt buộc lúc
  tạo** ở tầng type, cho mọi đơn mới, vì một cron.
- `''` → thoả type, phá `min(1)`, và `012` render một ô trống mà khách không hiểu.
- `'[đã ẩn danh]'` → một chuỗi sentinel, tức là **dữ liệu được phát minh ở tầng lưu
  trữ**, không có trong glossary — và `CLAUDE.md §4` nói thuật ngữ không có trong
  glossary thì **dừng và hỏi**.

Không lựa chọn nào bị cấm, không lựa chọn nào được chỉ định, và `012` không có cách
nào biết trước để render đúng.

### AD đề xuất — siết AD-13, và một luật về ẩn danh hoá

> **AD-13 (siết).** Repository của `ordering` phơi ra **đúng ba nhóm phương thức
> đọc, và danh sách là đóng**:
>
> 1. `*ForCustomer(customerId, …)` — mọi đường đọc của khách hàng.
> 2. `*ForShopOwner(…)` — đường đọc của chủ shop, gọi từ một controller đã kiểm
>    `role = shop_owner`.
> 3. `*ForSystem(…)` — **chỉ** cho tác vụ nền trong tiến trình (AD-16), **không
>    một controller HTTP nào được gọi**, và mỗi phương thức trong nhóm này được
>    liệt kê tên trong spine.
>
> Thêm một phương thức vào nhóm 3 là **một thay đổi kiến trúc**, không phải một
> task. Nhóm 3 hiện có đúng một thành viên: `findAnonymisationCandidatesForSystem`.
> Một test kiểm rằng không module controller nào import nhóm 3.

> ### AD-26 — Ẩn danh hoá là một trạng thái của đơn, không phải một lần xoá trường
>
> - **Binds:** `ordering`, AD-12, AD-10, AD-13, PRD §9.3, Q3
> - **Prevents:** một cron nền nới lỏng ràng buộc "bắt buộc lúc tạo" của FR-12 cho
>   **mọi** đơn, hoặc phát minh một chuỗi sentinel không có trong glossary.
> - **Rule:** `order` mang `anonymised_at timestamptz NULL`. Ba trường cá nhân
>   thành nullable **dưới một `CHECK`**:
>   `CHECK ((anonymised_at IS NULL) = (recipient_name IS NOT NULL))`.
>   Ràng buộc bắt buộc lúc tạo của FR-12 vì thế vẫn sống ở tầng dữ liệu, và
>   `packages/shared` khai một union hai nhánh tường minh — `Order` và
>   `AnonymisedOrder` — để `012` và `011` **buộc phải** xử lý nhánh đã ẩn danh,
>   không thể quên.
>
>   `anonymised_at` là đường thứ ba và cuối cùng làm đổi một trường của `Order` sau
>   khi tạo; AD-12 phải được sửa để nói "ba đường", không phải "hai".
>
> ⚠️ **Phụ thuộc Q3.** Nếu người quyết định bác mốc 12 tháng, AD này đổi theo. Nó
> được viết ở đây **để Q3 có một hình dạng cụ thể để chấp nhận hay bác bỏ**, không
> phải để đoán trước câu trả lời.

---

## H-10 — `002-product-page` × `011-backoffice-orders` · HIGH

### Điều AD-8 thật sự mua được

**AD-8** lập luận:

> *"tách FE/BE đẩy dự án tới JWT trong `localStorage`, và khi đó **một lỗ XSS bất
> kỳ trở thành đọc trộm dữ liệu khách khác** […] Phiên giữ bằng cookie
> `httpOnly; Secure; SameSite=Lax`."*

**AD-9** bổ sung: hai bundle tách biệt, code back office không bao giờ tới trình
duyệt khách.

Cả hai đúng, và cả hai giải quyết một vấn đề **hẹp hơn** lập luận của chúng. Cookie
`httpOnly` chặn script **đọc** token. Nó **không** chặn script **dùng** token: mọi
`fetch('/api/…', { credentials: 'include' })` chạy từ origin đó vẫn được trình duyệt
đính cookie vào. Và **AD-8 quy định đúng một origin**, nên storefront và back office
**dùng chung một cookie phiên**.

### Cái mỗi bên xây

**`002-product-page`** hiện thực FR-4: hiển thị tên, **mô tả**, giá, ảnh. Mô tả sản
phẩm do chủ shop nhập ở back office. Spine **không có luật nào** nói mô tả được lưu
và render dưới dạng text thuần — không AD nào, không dòng nào trong bảng quy ước.
React escape mặc định, nhưng chủ shop muốn xuống dòng và in đậm, nên `002` (hoặc
`009` sau đó, ở một task nhỏ "cho phép định dạng mô tả") dùng `dangerouslySetInnerHTML`.

**`011-backoffice-orders`** hiện thực FR-29/FR-30 trên `/admin`, gọi
`/api/admin/orders`. Nó dựa vào cookie phiên duy nhất của AD-8. Đúng AD-8, đúng AD-9.

### Va chạm cụ thể

Chủ shop **đăng nhập bằng đúng phiên đó** khi mở storefront để kiểm tra trang sản
phẩm — việc hoàn toàn bình thường, và AD-8 làm cho nó không tránh được (một origin,
một cookie). Một script nhúng qua mô tả sản phẩm chạy **trên origin của storefront**,
với cookie chủ shop:

```js
fetch('/api/admin/orders?limit=100000', { credentials: 'include' })
  .then(r => r.json()).then(exfil)
```

Trả về **mọi đơn của mọi khách**: tên người nhận, số điện thoại, địa chỉ. Bất biến
§8 #3 sụp — và sụp qua đúng loại đường mà AD-8 nói nó đang chặn. `SameSite=Lax`
không giúp gì: request là **same-site**, đó là điểm của AD-8. AD-9 không giúp gì:
kẻ tấn công không cần code back office, chỉ cần đường dẫn API, và
*"tên trường, luồng nghiệp vụ đọc được trong DevTools"* mà AD-9 lo — chúng đọc được
từ chính traffic của chủ shop.

Nguồn nhiễm ở đây là chủ shop tự nhập, nghe như "không phải mối đe doạ". Nhưng
`013-password-reset` tồn tại **chính xác vì** tài khoản chủ shop có thể bị chiếm; và
tên sản phẩm, tên danh mục, tên tệp ảnh (FR-28) đều là đầu vào tự do đi tới bundle
khách. Quan trọng hơn: **spine không ở đâu nói rằng dữ liệu nào là text thuần** —
nên mọi feature render chuỗi đều tự quyết định.

### AD đề xuất — siết AD-8

> **AD-8 (siết).** Một origin, **hai cookie**:
>
> - `sid` — phiên, `httpOnly; Secure; SameSite=Lax; Path=/`. Định danh người dùng
>   cho mọi endpoint.
> - `sid_admin` — **`Path=/api/admin`**, `httpOnly; Secure; SameSite=Lax`. Cấp khi
>   một tài khoản `shop_owner` đăng nhập. **Mọi endpoint quyền chủ shop nằm dưới
>   `/api/admin` và đòi cả hai cookie.**
>
> Trình duyệt không đính `sid_admin` vào request tới `/api/…` ngoài `/api/admin`,
> nên script chạy trên trang storefront không có cách nào gọi API quản trị — kể cả
> khi chủ shop đang đăng nhập. Đây là ràng buộc của trình duyệt, không phải một
> kiểm tra trong code có thể bị quên.
>
> **Đăng xuất và AD-7 xoá cả hai cookie.** AD-7 nói *"Đặt lại huỷ mọi phiên đang
> mở"* — "mọi phiên" bây giờ có nghĩa cụ thể.

> **Bảng Consistency Conventions (bổ sung một dòng).**
>
> | Concern | Convention |
> |---|---|
> | Chuỗi do người dùng nhập | **Text thuần, không bao giờ HTML.** Tên sản phẩm, mô tả, tên danh mục, tên người nhận, địa chỉ, tên tệp ảnh được lưu nguyên văn và render qua escape mặc định của React. **Không `dangerouslySetInnerHTML` ở bất kỳ app nào** — một lint rule, không một quy ước. Muốn mô tả có định dạng thì đó là một thay đổi phạm vi trên `baseline/*`, kèm một quyết định về sanitiser. |

---

## H-11 — `010-stock-adjustment-ledger` × `006-order-lifecycle` · MEDIUM

### `order_id` — id nội bộ hay `order_code`?

**AD-2** nói:

> *"`stock_ledger.order_id` là **một giá trị tham chiếu, không phải khoá ngoại**"*

Bảng quy ước nói `Order` có hai định danh: `bigint` PK nội bộ, và `order_code` công
khai *"là thứ duy nhất hiện cho khách"*. **FR-27** nói dòng sổ cái ghi **"mã đơn"**
— và glossary không có dòng nào phân biệt "order id" với "order code".

**`005`** trừ kho và truyền `order.id` (bigint) — cột tên là `order_id`, kiểu bigint,
không còn gì để bàn.

**`010`** xây màn hình sổ cái (FR-27) và phải hiển thị **mã đơn** cho chủ shop. Nó
gọi `ordering.public.getOrderCodes([...ids])` để dịch ngược. Được — nếu `005` thật
sự ghi id nội bộ.

**`006`** hoàn kho khi huỷ. Người xây đọc FR-27 (*"mã đơn"*), đọc bảng quy ước
(*"`order_code` … là thứ duy nhất hiện cho khách"*), và ghi `order_code`. Cột là
`bigint` → hoặc build gãy (may mắn), hoặc cột được ai đó đổi thành `text` trong một
migration của feature sau và **những dòng `005` đã ghi trở thành vô nghĩa**.

### `order_id` mục dần, và không ai sở hữu việc đó

**AD-4** cấm sửa/xoá sổ cái. **§9.3** giữ đơn 5 năm — câu đó đọc được thành "sau 5
năm thì xoá". Nếu `014` (hoặc một job dọn dẹp về sau) từng xoá đơn, `stock_ledger`
còn lại những dòng trỏ vào hư không, và màn hình FR-27 — thứ tồn tại để trả lời
*"nó sai từ lúc nào"* — có lỗ đúng ở chỗ những sự cố cũ nhất nằm. Không AD nào nói
đơn có bao giờ bị xoá hay không.

Và: không có luật nào nói `order_id` **phải** có giá trị khi `reason ∈
{order_placed, order_cancelled}` và **phải** rỗng khi `reason = manual_adjustment`.
Một dòng `order_placed` với `order_id` NULL thoả mọi AD, và phá tuyên bố truy vết
của FR-27 một cách im lặng.

### AD đề xuất — siết AD-2

> **AD-2 (siết).** Cột tên là **`stock_ledger.order_code text NULL`** — không phải
> `order_id`. Nó mang **`order_code` công khai**, vì `order_code` là định danh
> duy nhất có nghĩa với con người (FR-27 nói "mã đơn") và là thứ duy nhất
> `stock` có thể mang mà không cần biết `ordering` tồn tại.
>
> Ràng buộc tính đầy đủ nằm ở tầng dữ liệu, không ở code:
> ```sql
> CHECK ( (reason = 'manual_adjustment' AND order_code IS NULL)
>      OR (reason IN ('order_placed','order_cancelled') AND order_code IS NOT NULL) )
> ```
>
> **`order_code` không bao giờ được tái sử dụng.** Nếu `ordering` về sau có bất kỳ
> đường xoá đơn nào, nó phải để lại tombstone giữ `order_code`. Spine tuyên bố
> tường minh: **ở v1 không có đường nào xoá một `order`** — giữ 5 năm ở §9.3 là
> *giữ*, không phải *xoá sau đó*, và việc xoá sau 5 năm là một quyết định của
> người curate, không phải một hệ quả suy ra được.

---

## H-12 — `010-stock-adjustment-ledger` × `011-backoffice-orders` · MEDIUM

### Cái mỗi bên xây

**AD-5** nói dữ liệu nhiều miền được *"**ghép ở tầng `usecases`** bằng nhiều lời gọi
service, không bằng một câu truy vấn"*. **AD-22** cho `usecases` gọi mọi module.
**AD-10** nói hình dạng qua biên HTTP khai một lần trong `packages/shared`, tách
namespace `storefront`/`backoffice`.

**`010`** xây `usecases/stockLedgerView.ts`: dòng sổ cái (`stock`) + mã đơn
(`ordering`) + **tên người thao tác** (`identity`). Nó khai trong namespace
`backoffice`:

```ts
export const LedgerRow = z.object({ …, actorLabel: z.string() })   // '—' nếu không tra được
```

**`011`** xây `usecases/orderListView.ts`: đơn (`ordering`) + **tên người thao tác**
của các `order_status_event` (`identity`). Nó khai, cũng trong `backoffice`:

```ts
export const OrderRow = z.object({ …, operator: z.object({ id, displayName }).nullable() })
```

Hai đơn vị, hai hình dạng, **cùng một khái niệm**. Cả hai tuân AD-10 từng chữ —
AD-10 ràng buộc *"mọi hình dạng đi qua biên HTTP định nghĩa **một lần**"*, tức là
mỗi endpoint một lần, chứ không nói *mỗi khái niệm một lần*. Không AD nào cấm hai
projection của cùng một thực thể mang hai tên trường và hai chính sách null.

### Va chạm cụ thể

- Cùng một chủ shop hiện ra là `"Chủ shop"` ở màn hình này và `"—"` ở màn hình kia,
  tuỳ đơn vị nào tra được.
- Khi `013-password-reset` hay `014-anonymisation` đổi nghĩa của "tên hiển thị", **một**
  trong hai được sửa. Cái còn lại trôi — đúng cái trôi mà AD-10 tồn tại để chặn,
  nhưng AD-10 nhìn không tới.
- **N+1.** Vì AD-5 cấm `JOIN` vượt biên, cả hai usecase fan-out mỗi dòng một lời
  gọi. Không AD nào đòi service công khai có dạng batch. `011` phải đạt
  **p95 ≤ 400 ms ở 300.000 đơn** (FR-29) — và spine đã đẩy quyết định index/phân
  trang xuống `/speckit-plan` (mục *Cố ý đẩy xuống dưới*), nên **không ai** sở hữu
  việc này ở tầng có thể nhìn thấy nó.

### AD đề xuất — AD-25 mới

> ### AD-25 — Một khái niệm, một read-model; và service công khai dùng trong danh sách phải là batch
>
> - **Binds:** `usecases`, `packages/shared`, cả năm module, AD-5, AD-10, AD-22, FR-29
> - **Prevents:** (a) hai usecase định nghĩa hai hình dạng cho cùng một projection,
>   với hai chính sách null, rồi trôi khỏi nhau; (b) một N+1 sinh ra bởi chính luật
>   cấm `JOIN` (AD-5), trên đường phải đạt p95 400 ms ở 300.000 đơn.
> - **Rule:**
>   1. Mỗi khái niệm xuất hiện trong **nhiều hơn một** projection có **đúng một**
>      read-model type, **do module sở hữu thực thể đó khai** và export từ
>      `<domain>.public.ts`. `usecases` **ghép** các type đó; nó **không được đặt
>      tên trường mới** cho dữ liệu nó không tự tính ra.
>   2. Mọi phương thức service công khai được `usecases` gọi bên trong một vòng lặp
>      dựng danh sách phải mang dạng **batch** — `getManyByIds(ids: ID[])` — và
>      **không bao giờ** dạng một-bản-ghi. Một N+1 ở `usecases` là **vi phạm kiến
>      trúc**, không phải một vấn đề hiệu năng để tối ưu sau.
>   3. Mỗi usecase khai số lời gọi service của nó là **O(1) theo số dòng trả về**.
>      Không đạt được nghĩa là biên module sai chỗ → escalate, không "tối ưu sau".

---

## H-13 — `006-order-lifecycle` × `012-customer-order-history` · MEDIUM

### Hai luật, hai mã lỗi, một loại request

**AD-13** và bảng *Consistency Conventions* nói một câu duy nhất, không điều kiện:

> *"Truy cập vào đơn của khách khác trả **404**, không phải 403"* ·
> *"Cross-customer → **404** (AD-13)"*

**FR-16** thì đòi **hai** mã, tuỳ ngữ cảnh:

> *"Khách hàng gọi API chuyển trạng thái của chủ shop trên **đơn của chính mình**
> → HTTP **403** (từ chối theo vai trò) […] Trên **đơn của người khác** →
> HTTP **404**"*

**`006`** hiện thực FR-16 và phải phân biệt được. Nó gọi
`findOneForCustomer(callerId, orderId)`: khác null → 403; null → 404. Hoạt động.

**`012`** hiện thực FR-31/FR-32, đọc **AD-13** (câu tuyệt đối), và trả **404 cho
mọi trường hợp** — kể cả khi khách gọi một endpoint chỉ dành cho chủ shop trên đơn
của chính mình. Cũng "đúng" theo AD-13.

Kết quả: cùng một loại request nhận 403 ở endpoint này và 404 ở endpoint kia. FR-16
có một hệ quả kiểm chứng được thất bại, và cái tệ hơn là spine đã dạy hai người xây
hai luật trái nhau mà không ai trong hai người biết có người thứ hai.

Câu hỏi thứ hai không ai trả lời: **chủ shop gọi endpoint của khách hàng** (ví dụ
`GET /api/orders/:id`) — 403, 404, hay chuyển hướng sang view chủ shop? §5 nói chủ
shop **không** xem lịch sử đơn của chính mình (ô `—`), nhưng chủ shop cũng có một
dòng `account`. Không AD nào và không FR nào phủ ô này.

### AD đề xuất — siết AD-13

> **AD-13 (siết).** Quy tắc mã lỗi là một cây quyết định duy nhất, hiện thực **một
> lần** trong một guard dùng chung của `apps/api`, không lặp lại ở từng controller:
>
> | Ai gọi | Đơn tồn tại và thuộc về người gọi? | Endpoint đòi vai trò nào | Mã |
> |---|---|---|---|
> | Không có phiên | — | bất kỳ | **401** (FR-11) |
> | `customer` | Có | `customer` | 200 |
> | `customer` | Có | `shop_owner` | **403** — từ chối theo vai trò; đơn đó khách đã biết là có (FR-16) |
> | `customer` | Không (không tồn tại, hoặc của người khác) | bất kỳ | **404** — hai trường hợp không phân biệt được ở tầng nào (AD-13) |
> | `shop_owner` | — | `shop_owner` | 200 |
> | `shop_owner` | — | `customer` | **403** — §5: chủ shop không có lịch sử đơn |
>
> **403 chỉ được trả khi người gọi đã có quyền biết bản ghi đó tồn tại.** Đó là
> nguyên tắc; bảng trên là cách áp dụng nó, và nó là **nguồn duy nhất** — FR-16 và
> FR-32 đều đọc từ đây.

---

## Điều lens này **không** tìm thấy

Ghi lại để review sau không mất công đi lại:

- **AD-9** (hai bundle) đứng vững trước lens này: không cặp feature nào tôi dựng
  được phá nó mà vẫn tuân thủ, vì ràng buộc là ở build config, không ở code.
- **AD-11** (chuẩn hoá lúc ghi) đứng vững: `001` và `009` đều chỉ có đúng một cách
  hiểu. Lỗ duy nhất — ai gọi hàm chuẩn hoá khi `009` sửa tên sản phẩm — đã bị AD-11
  đóng bằng cụm *"trong cùng thao tác"*.
- **AD-6** (email là định danh, không phải địa chỉ gửi) đứng vững, và độ lệch có ý
  thức so với §9.2 đã được ghi ngay tại chỗ. Đây là mẫu mà các AD khác nên theo.
- **AD-15**, **AD-16**, **AD-20** không có bề mặt cho lens này: chúng ràng buộc
  *cấu hình vận hành* và *sự vắng mặt của thứ gì đó*, không ràng buộc hai đơn vị
  cùng xây một thứ.

## Ghi chú về vùng phủ của AD-21

Bảy lỗ trên đề xuất thêm test mang tên vào AD-21. Tập test mà AD-21 mô tả hiện nay
phủ **một** trục đồng thời duy nhất: *nhiều lần đặt đơn trên một sản phẩm*. Các trục
sau không có test nào, và mỗi trục là một lỗ ở trên:

| Trục đồng thời | Lỗ |
|---|---|
| Điều chỉnh tay × đặt đơn | H-1 |
| Huỷ × huỷ (cùng đơn) | H-2 |
| Huỷ × xác nhận thanh toán | H-5 |
| Nhập phí × chuyển trạng thái | H-5 |
| Retry idempotency khi request đầu còn đang bay | H-4 |
| Hai khách dùng chung khoá idempotency | H-4 |
| Xoá cứng sản phẩm × đặt đơn | H-7 |

**`verification.md` hiện không chạy tới một dòng code sản phẩm nào** (spine đã tự
ghi nhận ở mục Deferred). Cho tới khi khoản đó được người curate giải quyết, **mọi
test trong bảng này là một cam kết chưa có nơi để chạy** — bao gồm cả test gốc của
AD-21. Đây là lý do khoản `verification.md` trong mục Deferred nên được xử lý
**trước** các khoản còn lại, chứ không cùng lúc: nó là điều kiện cần của tất cả.
