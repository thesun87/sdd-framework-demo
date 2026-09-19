---
title: "Reconcile — PRD + Addendum → ARCHITECTURE-SPINE"
type: reconcile
pass: RECONCILE (input → spine)
status: final
created: 2026-09-19
input:
  - ../../../prds/prd-sdd-framework-demo-2026-09-18/prd.md
  - ../../../prds/prd-sdd-framework-demo-2026-09-18/addendum.md
spine: ../ARCHITECTURE-SPINE.md
---

# Reconcile — PRD + Addendum → ARCHITECTURE-SPINE

**Phạm vi của pass này.** Đây **không** phải review chất lượng spine. Câu hỏi duy nhất:
*đầu vào đòi hỏi, hàm ý hoặc ràng buộc điều gì mà spine đã im lặng đánh rơi?*
Mỗi phát hiện dưới đây đều trỏ về một câu cụ thể trong PRD hoặc addendum.

**Quy ước "đã hạ cánh" vs "bị đánh rơi".** `.memlog.md` của phiên kiến trúc ghi rất
nhiều quyết định có ý thức. Nhưng memlog là **nhật ký phiên**, không phải artifact
hạ nguồn: `/speckit-specify`, task brief và người curate baseline đọc
`ARCHITECTURE-SPINE.md`. Vì vậy một kết luận chỉ nằm trong memlog mà không có trong
spine vẫn được tính là **đánh rơi ở spine** — và được đánh dấu rõ là *"có trong
memlog, không có trong spine"* để phân biệt với thứ chưa ai nghĩ tới.

---

## 0. Kết quả hai câu hỏi bắt buộc

### 0.1 FR-1..FR-33 có chỗ trong "Capability → Architecture Map" không?

**Về mặt số học: có. Không FR nào vắng mặt.** 12 dòng của bảng phủ kín FR-1 đến FR-33
(FR-23 và FR-33 xuất hiện hai lần, có chủ ý).

Nhưng "có tên trong một khoảng FR" khác với "được một AD cai trị". Các FR sau **chỉ
được đặt tên trong một khoảng**, không AD nào nói gì về nội dung của chúng:

| FR | Có trong map ở dòng | AD nào thật sự cai trị nội dung? | Ghi chú |
|---|---|---|---|
| FR-3 | FR-1–3 | Không (AD-11 chỉ nói tìm kiếm) | Kích thước trang 24/100 bị đẩy ngược về `/speckit-plan` — xem F-11 |
| FR-19 | FR-16–19 | AD-14 chỉ chặn chuyển tiếp ra khỏi `delivered` | Bước xác nhận riêng không có nhà — F-18 |
| FR-21 | FR-20, FR-21 | Không | Không có gì về đường đọc của khách sau khi phí đổi |
| FR-22 | FR-22–24 | Không | Vô hại — COD không yêu cầu cơ chế nào |
| FR-23 | FR-22–24 và dòng `settings` | Không có thực thể, và mâu thuẫn quy ước Cấu hình — **F-5** |
| FR-26 | FR-25–28 | Không | "Danh mục phẳng" không được chốt ở đâu — **F-10** |
| FR-28 | FR-25–28 | AD-15 (chỉ lưu trữ + sao lưu) | Ràng buộc định dạng/5 MB không có nhà (chấp nhận được, spine tự defer chi tiết trường) |
| FR-29 | FR-29, FR-30 | AD-9, AD-13 (bảo mật, không phải hiệu năng) | p95 ≤ 400 ms ở 300.000 đơn không có nhà — F-12 |
| FR-33 | FR-9–11, FR-33 và dòng `settings` | AD-7 (chỉ nói đặt lại mật khẩu) | "Đúng một tài khoản chủ shop", "không API công khai nào tạo được" — F-13 |

### 0.2 Bốn bất biến xuyên suốt PRD §8 — có AD nào **thực thi** không?

| # | Bất biến | AD thực thi | Đánh giá |
|---|---|---|---|
| 1 | Tồn kho không bao giờ âm | **AD-1** (`CHECK (quantity >= 0)`), AD-2, AD-4 | ✅ Thực thi ở tầng dữ liệu, đúng khuynh hướng addendum §1 |
| 2 | Không đơn nào được tạo mà thiếu hàng ở bất kỳ dòng nào | **AD-1 + AD-3** (một transaction, rollback toàn bộ) | ✅ Thực thi |
| 3 | Không khách nào đọc dữ liệu khách khác | **AD-13** (ép ở repository, 404), AD-8 (cookie), AD-7 (mật khẩu tạm) | ✅ Thực thi, và AD-7/AD-8 chặn hai đường vòng mà PRD không thấy trước |
| 4 | Giá và địa chỉ trên đơn đã tạo là bất biến | **AD-12** (sao chép, không tham chiếu; đúng hai đường ghi) | ✅ Thực thi |

**Nhưng PRD §8 viết nguyên văn:** *"Bất biến xuyên suốt (áp dụng cho mọi FR, **phải có
test bảo vệ**)"*. Vế thứ hai — nghĩa vụ test — **không hạ cánh ở đâu cả**. Xem F-1.

---

## 1. Phát hiện

### F-1 · [CRITICAL] · Điều kiện kiểm chứng SM-1 (addendum §7) biến mất hoàn toàn — và quy ước "Kiểm chứng" còn cấm task tự thêm test

**Đầu vào đòi hỏi gì.**
- Addendum §7: *"Dù phase kiến trúc chọn cơ chế nào trong §1, phải có **một test tải
  đồng thời thật**: N tiến trình cùng đặt đơn cho một sản phẩm có tồn kho M, và số đơn
  thành công phải bằng đúng M."* Và: *"Không có nó, 'không bao giờ bán quá tồn kho' chỉ
  là một câu trong tài liệu."*
- Addendum §1 kết thúc bằng cảnh báo trỏ thẳng tới §7: *"Điều kiện kiểm chứng áp dụng
  cho **mọi** cơ chế trong bảng nằm ở §7: nó gác SM-1 và là **thứ dễ bị bỏ sót nhất
  trong tài liệu này**."*
- PRD §8: bốn bất biến *"phải có test bảo vệ"*. FR-32: *"Đây là bất biến phải có test
  bảo vệ, không phải một hành vi ngầm hiểu."*

**Spine làm gì.** Không một chữ nào. `SM-1` xuất hiện trong `Binds` của AD-1 và AD-4,
nhưng không AD nào phát biểu nghĩa vụ chứng minh. Deferred đẩy *"ngưỡng coverage"* về
`/speckit-plan`.

**Vì sao đây là CRITICAL, không phải "đã defer đúng chỗ".** Addendum §7 tự ghi đích đến
là `/speckit-plan`, đúng. Nhưng addendum §1 buộc nó vào **kết quả của quyết định kiến
trúc**: spine chọn cơ chế, nên spine phải phát biểu điều kiện chứng minh cơ chế ấy.
Nghiêm trọng hơn, quy ước **Kiểm chứng** của spine chủ động đóng cửa:

> *"Các lệnh trong `docs/baseline/verification.md`, chạy nguyên văn. **Task không tự đặt
> lệnh test riêng.**"*

Kết hợp lại: spine cấm task tự thêm test, đồng thời không tạo chỗ cho test tải đồng thời
và test bất biến. Đường duy nhất còn lại là `verification.md` — một file
human-owned/baseline (CLAUDE.md §3) mà spine **không** yêu cầu bổ sung. Bằng chứng của
cam kết trung tâm của sản phẩm rơi vào khe giữa hai tài liệu.

**Cần gì.** Một AD (hoặc một dòng Deferred có người nhận rõ ràng) phát biểu: cơ chế
AD-1/AD-3 chỉ được coi là đã hiện thực khi có test N-tiến-trình/M-tồn-kho; và bốn bất
biến §8 mỗi cái có một test bảo vệ đặt ở đâu; và `verification.md` phải mọc thêm lệnh
tương ứng trước khi freeze.

---

### F-2 · [CRITICAL] · FR-25 (xoá cứng có điều kiện) đòi `catalog → ordering` — chiều bị luật phụ thuộc của spine cấm

**Đầu vào đòi hỏi gì.** FR-25: *"Sản phẩm đã xuất hiện trong bất kỳ đơn hàng nào **không
xoá cứng được** — nó chỉ được đánh dấu ngừng bán... Sản phẩm **chưa từng** xuất hiện
trong đơn nào thì xoá cứng được."*

**Spine làm gì.** Đồ thị phụ thuộc trong *Design Paradigm* được tuyên bố là **luật**:
*"Mũi tên là chiều được phép gọi; không có mũi tên nghĩa là cấm... Không module nào gọi
ngược chiều mũi tên."* Các mũi tên có: `ordering → catalog`, `ordering → inventory`,
`ordering → identity`, `payment → ordering`, `catalog → inventory`, `settings → identity`.
**Không có `catalog → ordering`.** AD-5 siết thêm: *"Không `JOIN` qua biên module trong
repository, không import repository của module khác."*

Nhưng `PRODUCT` thuộc `catalog`, `ORDER_LINE` thuộc `ordering`. Để trả lời "sản phẩm này
đã từng xuất hiện trong đơn nào chưa", `catalog` bắt buộc phải hỏi `ordering` — chiều bị
cấm — hoặc JOIN qua biên — cũng bị cấm.

**Đây không phải chi tiết hiện thực.** Spine tự nâng đồ thị này lên hàng luật và biến nó
thành cơ sở vạch `allowed/forbidden scope` cho task brief (quy ước *"Ranh giới thư mục =
allowed scope"*). Một luật mà một FR đã có không thể tuân thủ sẽ vỡ ở task đầu tiên chạm
FR-25, và người thực thi sẽ tự gỡ bằng cách phá biên — đúng loại phân kỳ mà AD-5 sinh ra
để chặn.

**Ghi chú liên quan (thấp hơn):** cùng FR-25, xoá cứng một sản phẩm sẽ kéo theo các dòng
`stock_ledger` của nó, trong khi AD-4 tuyên bố sổ cái *"append-only và không bao giờ được
cập nhật hay xoá"*. Hai luật này cũng chưa được hoà giải.

---

### F-3 · [HIGH] · FR-5 "tình trạng tồn kho **không được cache**" bị đánh rơi — và AD-16 còn chủ động cho phép cache

**Đầu vào đòi hỏi gì.** FR-5, trong phần hệ quả kiểm chứng được: *"Tình trạng được đọc
trực tiếp từ con số tồn kho hiện tại tại thời điểm dựng trang. Tình trạng tồn kho **không
được cache**; nếu tầng nào đó cache trang sản phẩm, phần tình trạng tồn kho phải nằm
ngoài phần được cache."*

Đây là một ràng buộc kiến trúc thuần tuý, viết trong prose của một FR chứ không phải
trong §8 — đúng dạng mà cấu trúc AD-block hay bỏ sót.

**Spine làm gì.** Không AD nào nhắc tới cache của tình trạng tồn kho. Ngược lại, AD-16
viết: *"Cache, lập lịch và job nền chạy trong tiến trình NestJS"* — tức là hợp thức hoá
cache in-process mà không kèm ngoại lệ. Và kiến trúc đặt một reverse proxy (Caddy) trước
mọi thứ, tức là có sẵn một tầng cache HTTP thứ hai.

**Hệ quả.** Một task tối ưu p95 đọc ≤ 400 ms hoàn toàn có thể cache response trang sản
phẩm; không có gì trong spine chặn lại, và bài test chức năng nào cũng vẫn xanh. Cam kết
§1 ("khách biết còn hay hết **trước khi** bỏ công đặt") bị bào mòn ở chỗ không ai nhìn.

---

### F-4 · [HIGH] · Hai phản chỉ số SM-C1 và SM-C2 không có mặt ở bất kỳ đâu trong spine

**Đầu vào đòi hỏi gì.** PRD §10, mục *"Phản chỉ số (không được tối ưu)"*:
- **SM-C1:** *"Ngưỡng p95 ≤ 1,0 s là **trần**, không phải mục tiêu để đua. Bất kỳ tối ưu
  nào làm giảm độ trễ bằng cách **nới lỏng tính nguyên tử** của kiểm tra tồn kho đều là
  làm hỏng sản phẩm. Nếu phải chọn, chọn chậm hơn."*
- **SM-C2:** *"Tường đăng ký (FR-11) và việc từ chối đơn thiếu hàng (FR-14) **đều làm
  giảm** tỷ lệ chuyển đổi, và cả hai đều đúng. Đơn bị từ chối vì hết hàng là hệ thống làm
  đúng việc của nó, không phải một thất bại cần tối ưu."*

**Spine làm gì.** AD-3 ghi `NFR p95 đặt đơn ≤ 1,0 s` trong `Binds` — **dưới dạng mục
tiêu**, không có một chữ nào nói đó là trần và không được mua bằng tính nguyên tử. SM-C1
và SM-C2 không xuất hiện trong toàn bộ tài liệu.

**Vì sao quan trọng.** AD-3 gộp *tạo đơn + trừ kho mọi dòng + ghi sổ cái* vào một
transaction. Đó chính xác là thứ mà một tối ưu độ trễ sẽ muốn tách ra. SM-C1 là lời cảnh
báo viết sẵn cho đúng cám dỗ đó, và nó là loại nội dung mà chỉ spine — không phải
`/speckit-plan` — có thẩm quyền đóng đinh, vì nó là một luật về **cách được phép thay đổi
kiến trúc**, không phải một ngưỡng số.

---

### F-5 · [HIGH] · FR-23 "thông tin ngân hàng do chủ shop cấu hình, không hardcode" không có thực thể, và quy ước Cấu hình của spine mâu thuẫn trực tiếp với nó

**Đầu vào đòi hỏi gì.** FR-23: *"Thông tin ngân hàng **do chủ shop cấu hình, không
hardcode**."* Khách phải thấy tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền,
nội dung chuyển khoản.

**Spine làm gì.**
- Module `settings` tồn tại và cây nguồn ghi `settings/ # thông tin ngân hàng, mật khẩu chủ shop`.
- **Sơ đồ ER "Thực thể lõi" không có thực thể nào cho settings.** Đoạn văn dưới sơ đồ gán
  chủ sở hữu cho `STOCK`, `STOCK_LEDGER`, `PRODUCT`, `CATEGORY`, `PRODUCT_IMAGE`, `ORDER`,
  `ORDER_LINE`, `ORDER_STATUS_EVENT`, `ACCOUNT` — **không nhắc `settings` lẫn `payment`.**
- Trong khi đó quy ước **Cấu hình** viết: *"Biến môi trường, đọc và validate một lần lúc
  khởi động... Không đọc `process.env` rải rác."*

Nếu thông tin ngân hàng là biến môi trường thì **chủ shop không cấu hình được lúc chạy** —
vi phạm FR-23 nguyên văn. Nếu nó là một bảng thì AD-5 (*"một bảng thuộc đúng một module"*)
đòi bảng đó có tên và có chủ, mà mô hình dữ liệu của spine không có.

**Cùng lỗ hổng, cho `payment`.** `payment` là một trong sáu module, sở hữu *"phương thức
thanh toán, xác nhận chuyển khoản"*, nhưng không sở hữu thực thể nào trong ER. Trạng thái
"đã xác nhận nhận thanh toán" — thứ gác `confirmed` ở FR-24 và gác **mọi** đường huỷ —
không có chủ sở hữu được nêu tên. Thêm nữa, AD-14 nói **một hàm duy nhất trong `ordering`**
thực hiện mọi chuyển trạng thái; hàm đó phải đọc được trạng thái xác nhận thanh toán, mà
luật phụ thuộc chỉ cho `payment → ordering`, không cho chiều ngược lại. Hoặc trạng thái ấy
nằm trên `ORDER` (và khi đó `payment` gần như rỗng), hoặc AD-14 phải gọi ngược mũi tên.
Spine không chọn.

---

### F-6 · [HIGH] · Spine không có mục "phương án đã bị loại" — đích đến mà addendum §4 chỉ đích danh

**Đầu vào đòi hỏi gì.** Addendum §4 mở đầu: *"Đích đến: **tài liệu kiến trúc** và UX spec —
**để không ai đề xuất lại chúng ở review**."* Và §4 nói rõ nó chỉ chứa các phương án bị
loại *không có mục riêng*; những cái khác nằm rải trong §1 (hàng đợi tuần tự hoá), §2
(cộng dồn sổ cái), §3 (công cụ tìm kiếm riêng).

**Spine làm gì.** Không có mục nào liệt kê phương án bị loại. `Deferred` là một thứ khác —
nó chứa *xung đột chưa giải* và *việc hoãn lại*, không phải *cửa đã đóng*.

**Từng phương án, đã hạ cánh hay chưa:**

| Phương án bị loại | Nguồn | Trong spine? |
|---|---|---|
| Giữ chỗ tồn kho trong giỏ | §4 | Ngầm (AD-17 + FR-7), **không nêu là đã loại** |
| Trạng thái `awaiting_customer_approval` | §4 | ✅ Chặn hiệu quả: quy ước "Trạng thái đơn" đóng băng đúng 5 giá trị + AD-14 dùng bảng chuyển khai báo tường minh |
| Cho phép đảo ngược `delivered` | §4 | ✅ AD-14 (`Prevents`) |
| Sổ địa chỉ của khách hàng | §4 | ✅ AD-12 (*"không trỏ tới một bản ghi hồ sơ"*) |
| **Danh mục phân cấp nhiều tầng** | §4 | ❌ Không ở đâu cả — xem F-10 |
| Hàng đợi tuần tự hoá đặt đơn | §1 | Ngầm (AD-16 cấm dịch vụ mạng), lý do thật (*phá kỳ vọng "khách thấy mã đơn ngay" ở UJ-1*) mất |
| Khoá bi quan / khoá lạc quan | §1 | ❌ Không nêu. AD-3 lại đặt tiêu đề *"khoá theo thứ tự cố định"* — dễ đọc thành khoá bi quan, đúng phương án addendum loại vì p95 |
| Cộng dồn sổ cái thay cho cột | §2 | Ngầm (AD-4 chọn cột), **không nêu phương án kia đã bị loại và vì sao** |
| Công cụ tìm kiếm riêng | §3 | Ngầm (AD-16), không nêu |

Toàn bộ lý do bị loại hiện chỉ sống trong `.memlog.md`. Người curate baseline, Spec Kit và
reviewer đọc spine, không đọc memlog. Addendum §4 tồn tại đúng để chặn việc phải tranh
luận lại — và cơ chế chặn đó chưa được lắp.

---

### F-7 · [HIGH] · Sai lệch có ý thức khỏi PRD §9.2 (email làm định danh) không được ghi trong spine

**Đầu vào đòi hỏi gì.** PRD §9.2: *"**Mỗi trường dữ liệu cá nhân trong hệ thống phải chỉ
ra được nó phục vụ việc giao hàng như thế nào.**"* PRD §9.1 đặt NĐ 13/2023/NĐ-CP lên trên.
PRD §11.1 Q9 (định danh đăng nhập) là câu hỏi **CHẶN**.

**Spine làm gì.** AD-6 nói *"Email là định danh, không bao giờ là địa chỉ gửi"* — một AD
tốt và cần thiết. Nhưng spine **không ghi ở đâu** rằng:
1. Q9 đã được người quyết định chốt là **email** (spine vẫn để Q9 ngoài danh sách Deferred,
   khiến người đọc không biết nó đã đóng hay còn chặn — Deferred chỉ liệt kê Q3, Q4, Q5);
2. email **không phục vụ việc giao hàng**, nên nó **không qua được phép thử của §9.2** —
   đây là một sai lệch **có ý thức** khỏi một ràng buộc pháp lý, không phải một sơ suất;
3. khuyến nghị của kiến trúc sư là số điện thoại và đã bị bác.

Cả ba điểm nằm đầy đủ trong `.memlog.md`, không điểm nào trong spine. Deferred có nhắc
*"Ẩn danh hoá `account.email`"* — nhưng đó là hệ quả, không phải bản thân sai lệch.

**Hệ quả.** Người curate baseline (bước A6, con người, không uỷ quyền) sẽ đóng băng một
mô hình dữ liệu mang một trường PII vĩnh viễn mà tài liệu họ đọc không nói là có vấn đề.
Q3 (chính sách ẩn danh hoá) đang chặn chính vì lý do đó.

---

### F-8 · [HIGH] · FR-14 đòi "danh sách **cụ thể** dòng hàng nào không đủ" — AD-3 fail-fast + rollback chỉ trả về được dòng đầu tiên

**Đầu vào đòi hỏi gì.**
- FR-14: *"Đơn bị từ chối vì thiếu hàng trả về danh sách **cụ thể** dòng hàng nào không
  đủ; giỏ hàng của khách hàng vẫn còn nguyên."*
- Addendum §5 gọi đây là *"khoảnh khắc UX nặng nhất trong sản phẩm"*: *"Thông báo phải nói
  rõ **dòng nào** không đủ, giữ nguyên phần còn lại của giỏ... Thiết kế màn hình này chính
  là phần lớn giá trị của việc chống bán quá tồn kho."* Addendum gửi mục này cho **cả
  `bmad-architecture`**, không chỉ UX.

**Spine làm gì.** AD-3: *"Bất kỳ dòng nào trừ kho thất bại thì toàn bộ transaction rollback
và không có đơn nào tồn tại."* AD-1: *"số dòng bị ảnh hưởng = 0 nghĩa là không đủ hàng."*
Quy ước *Hình dạng lỗi* chỉ nói có một envelope duy nhất và cross-customer trả 404.

Cơ chế đã chọn xử lý dòng theo `product_id` tăng dần và dừng ở dòng đầu thất bại → biết
được **một** dòng, trong khi FR-14 và addendum §5 đòi **danh sách**. Muốn có danh sách thì
phải hoặc đọc lại tồn kho mọi dòng sau khi rollback (một đường đọc thứ hai, và nó trả về
**số lượng còn bán được** — chạm F-9), hoặc tiếp tục thử mọi dòng trước khi rollback. Đó
là một quyết định kiến trúc, và spine chưa ra.

---

### F-9 · [HIGH] · "Không hiển thị con số tồn kho chính xác cho khách" (FR-5) đấu với AD-10 một-nguồn-DTO, và FR-6 lại đòi đúng con số đó

**Đầu vào đòi hỏi gì.**
- FR-5: *"Trang **không** hiển thị con số tồn kho chính xác cho khách chưa đăng ký và
  khách hàng — chỉ còn/hết."* (`[ASSUMPTION]`: đây là thông tin kinh doanh.)
- FR-6, cùng lúc: *"giỏ **phải đánh dấu đúng những dòng** đang vượt tồn kho, **nêu rõ số
  lượng còn bán được**."*

**Spine làm gì.** AD-10 buộc *"mọi hình dạng đi qua biên HTTP định nghĩa **một lần** trong
`packages/shared`... FE **không được** khai lại interface cho response"* — **một** hình
dạng dùng chung cho cả `storefront` và `admin`. Nếu `Product`/`Stock` DTO mang `quantity`
(admin cần, FR-27), thì storefront nhận luôn. AD-9 tách bundle nhưng không tách **dữ liệu**;
AD-8 đặt cả hai sau **một origin** với **một cookie jar**.

Không AD nào yêu cầu hai hình dạng (public vs admin) hay một projection ở biên. Và
`.memlog.md` lại dùng chính FR-5 (*"đường đọc của storefront không cần con số trên hàng
product"*) làm lý do tách bảng `stock` — tức là kiến trúc **có** nhận ra ràng buộc này, rồi
không mang nó vào spine dưới dạng luật.

**Thêm một việc chưa ai giải:** FR-5 và FR-6 mâu thuẫn với nhau trong chính PRD (giấu con
số ở trang sản phẩm, nhưng nêu "số lượng còn bán được" ở giỏ). Spine không phải nơi gỡ,
nhưng là nơi phải **nêu** — nó thuộc `Deferred`, và không có ở đó.

---

### F-10 · [MEDIUM] · "Danh mục phẳng" (FR-26 + addendum §4) không được chốt ở bất kỳ luật nào

**Đầu vào đòi hỏi gì.** FR-26: *"Danh mục phẳng: **không đặt được danh mục cha**."*
Glossary: *"Không phân cấp nhiều tầng trong v1."* Addendum §4 liệt kê *"Danh mục phân cấp
nhiều tầng"* là phương án **đã bị loại**, kèm điều kiện xem lại (*"ở 20.000 sản phẩm (Y3)
thì đáng xem lại, và đó là một feature Track B"*).

**Spine làm gì.** Sơ đồ ER chỉ có `CATEGORY ||--o{ PRODUCT`. Không AD, không dòng quy ước,
không dòng Deferred nào nói danh mục là phẳng. Không gì ngăn một task thêm
`category.parent_id` "cho tiện" — và khi đó FR-1 (*"Chọn một danh mục trả về **đúng** các
sản phẩm thuộc danh mục đó"*) trở nên nhập nhằng theo cách rất khó bắt ở review.

---

### F-11 · [MEDIUM] · FR-3 đã chốt kích thước trang 24/100; spine đẩy ngược nó về `/speckit-plan`

**Đầu vào đòi hỏi gì.** FR-3 nêu ba hệ quả kiểm chứng được, có số: *"Kích thước trang mặc
định **24 sản phẩm**; trần **100**. Yêu cầu kích thước lớn hơn 100 được xử lý như 100,
không trả lỗi."* PRD ghi rõ vì sao nó đặt số: *"để hệ quả kiểm chứng được bằng số thay vì
bằng tính từ"*.

**Spine làm gì.** Deferred: *"**Chỉ số và ngưỡng cụ thể (kích thước trang**, ngưỡng cảnh
báo, ngưỡng coverage) — thuộc `/speckit-plan` và `docs/baseline/verification.md`, không
thuộc spine."*

Đây là mở lại một con số PRD đã đóng. Spine có quyền không **quyết** kích thước trang, nhưng
không có quyền tuyên bố nó **chưa được quyết** — PRD là nguồn, và `/speckit-plan` đọc cả
hai sẽ thấy hai câu trả lời. Ngoài ra hành vi *"> 100 xử lý như 100, không trả lỗi"* là
một quy ước biên HTTP, đúng chỗ của quy ước *Hình dạng lỗi*, và nó rơi mất.

---

### F-12 · [MEDIUM] · Không có AD nào cho hiệu năng đường đọc đơn hàng ở quy mô Y3 (300.000 đơn)

**Đầu vào đòi hỏi gì.** FR-29: *"Danh sách được phân trang và đạt ngưỡng **p95 ≤ 400 ms** ở
§8 với **300.000 đơn**."* FR-31 (lịch sử đơn của khách) cũng nằm trong bảng p95 đọc ≤ 400 ms
của §8. PRD §8 đặt Y3 = 300.000 đơn.

**Spine làm gì.** AD-11 giải bài toán tương đương cho `catalog` (20.000 sản phẩm, chuẩn hoá
lúc ghi + index) — và làm rất tốt. Không có AD đối xứng cho `ordering`. Dòng map của FR-29
chỉ trỏ AD-9 (tách bundle) và AD-13 (cô lập dữ liệu), cả hai đều là bảo mật. AD-13 thậm chí
còn tạo thêm áp lực: *"repository của `ordering` không phơi ra phương thức nào đọc đơn mà
không nhận `customer_id`"* — tức là hai đường đọc khác nhau, hai bài toán index khác nhau,
và spine không nói gì về chúng.

---

### F-13 · [MEDIUM] · FR-33 "đúng một tài khoản chủ shop, không có đường tạo công khai" không được thực thi

**Đầu vào đòi hỏi gì.** FR-33: *"**Không có API hay màn hình công khai nào tạo được** tài
khoản chủ shop... **Có đúng một** tài khoản chủ shop... Tài khoản chủ shop **không** đặt
đơn được."* §5 xác nhận: ô "Đặt đơn" và ô "Thêm vào giỏ hàng" của Chủ shop đều là `—`.

**Spine làm gì.** Quy ước *Vai trò*: *"Một bảng `account` với `role ∈ {customer, shop_owner}`"*
— đúng, nhưng dừng ở đó. `.memlog.md` ghi *"FR-33 trở thành một seed row"*; spine không.
Không có ràng buộc duy nhất (`unique partial index` trên `role = 'shop_owner'`), không có
luật "đăng ký công khai chỉ sinh `role = customer`", và **không có AD nào nói đặt đơn yêu
cầu `role = customer`**.

**Vì sao không tầm thường.** AD-8 đặt storefront và admin sau **một origin** với **một
cookie**. Một phiên `shop_owner` do đó gửi cookie tới `/api/orders` như mọi phiên khác.
PRD §11.1 Q4 nói thẳng rằng chủ shop đặt đơn hộ khách *"phá vỡ SM-2"* và đang là câu hỏi
**CHẶN**. Ràng buộc đang chặn một quyết định phạm vi lại không có điểm thực thi nào.

---

### F-14 · [MEDIUM] · `stock_ledger` mất bộ cột bắt buộc và mất enum `nguyên nhân` ba giá trị

**Đầu vào đòi hỏi gì.**
- FR-27: *"Mỗi thay đổi tồn kho ghi lại: sản phẩm, **giá trị trước**, **giá trị sau**,
  **nguyên nhân** (`order_placed` | `order_cancelled` | `manual_adjustment`), mã đơn nếu
  có, thời điểm, tài khoản thực hiện."*
- Addendum §2 lặp lại y hệt bộ cột.
- FR-18 dựa vào giá trị `manual_adjustment` bằng tên: *"Hàng bị huỷ ở `shipped` mà thực sự
  quay về kho được đưa lại vào tồn kho bằng điều chỉnh tay (FR-27, **nguyên nhân
  `manual_adjustment`**)."*

**Spine làm gì.** AD-2 chỉ nói *"mỗi lần thay đổi ghi một dòng `stock_ledger` trong cùng
transaction"*. AD-4 nói *"tổng `delta` của sổ cái"*. Không chỗ nào liệt kê cột, và **enum
ba giá trị biến mất**.

**Vì sao là vấn đề nhất quán, không phải chi tiết schema.** Spine **đã** đóng băng đúng hai
tập giá trị đóng khác trong *Consistency Conventions* — `Trạng thái đơn` (5 giá trị) và
`Phương thức thanh toán` (2 giá trị) — với lý do chúng là tập đóng mà nhiều module cùng
đọc. `nguyên nhân` của sổ cái là tập đóng thứ ba, cùng tính chất, được FR-18 tham chiếu
bằng tên, và là thứ duy nhất trong ba cái bị bỏ lại. (Spine tự nói chi tiết schema thuộc
về code — nhưng tập giá trị đóng thì không, theo chính tiền lệ của hai dòng kia.)

---

### F-15 · [MEDIUM] · Hai nghĩa vụ ghi vết bị đánh rơi: thay đổi phí giao hàng (FR-20) và xác nhận thanh toán (FR-24)

**Đầu vào đòi hỏi gì.**
- FR-20: *"**Mỗi lần đổi phí được ghi lại thời điểm và giá trị.**"*
- FR-24: *"**Xác nhận thanh toán ghi lại thời điểm và tài khoản thực hiện.**"*
- PRD §8 (Độ tin cậy): *"Khi con số sai, phải trả lời được 'sai từ lúc nào và do đâu'."*

**Spine làm gì.** Quy ước *Ghi vết* liệt kê **đúng hai** dòng: *"Mọi thay đổi tồn kho →
`stock_ledger`; mọi chuyển trạng thái → `order_status_event`."* Sơ đồ ER cũng chỉ có hai
bảng ghi vết đó.

**Vì sao đáng kể hơn vẻ ngoài.** AD-12 tuyên bố đơn hàng là bất biến **trừ đúng hai đường**:
nhập phí giao hàng (FR-20) và ẩn danh hoá. Phí giao hàng vì thế là ngoại lệ duy nhất
thường xuyên của bất biến §8 #4 — và nó là ngoại lệ duy nhất **không có dấu vết**. Tương tự,
xác nhận thanh toán là hành động **một chiều, không đảo ngược** (FR-24) khoá vĩnh viễn
đường huỷ; PRD §11 Q11 xếp nó vào nhóm rủi ro đã biết. Cả hai đều cần audit, cả hai đều
rơi khỏi quy ước.

---

### F-16 · [MEDIUM] · Non-goal "không bao giờ chạm dữ liệu thẻ" không có điểm thực thi, dù module `payment` tồn tại

**Đầu vào đòi hỏi gì.** PRD §6: *"**Hệ thống không bao giờ chạm vào dữ liệu thẻ.** Thuộc
tính an toàn này có được nhờ **phạm vi** chứ không nhờ biện pháp kỹ thuật — nên nó **mất đi
đúng khoảnh khắc** bất kỳ mục nào ở §7.2 được đưa trở lại phạm vi."* §9.1 nhắc lại:
*"Không có dữ liệu thẻ, không bao giờ — bảo đảm bằng cấu trúc, xem §6."*

**Spine làm gì.** AD-6 làm đúng việc tương ứng cho kênh gửi: *"không có thư viện gửi mail,
không client SMTP, không cổng SMS trong `package.json` của bất kỳ app nào."* **Không có AD
đối xứng cho cổng thanh toán.** AD-16 cấm "dịch vụ mạng" ở tầng runtime, nhưng một SDK
VNPay/MoMo là một thư viện HTTP client, không phải một container trong compose — nó lọt.

Và spine đặt tên một module là `payment`. Đó chính xác là thư mục mà người xây sau sẽ mở
khi được yêu cầu "thêm thanh toán online". PRD tự nói thuộc tính này được bảo đảm *bằng cấu
trúc*; spine là nơi cấu trúc đó phải tồn tại.

---

### F-17 · [MEDIUM] · Uptime 99,5% và RTO 4 h không có nhà; §9.2 "không theo dõi hành vi, không phân tích bên thứ ba" cũng vậy

**Uptime / RTO.** PRD §8: *"Uptime 99,5%/tháng... **RPO 1 giờ / RTO 4 giờ** — quyết định
tần suất sao lưu **và quy trình khôi phục**."* Spine giải RPO rất tốt (AD-15, sao lưu là
**một đơn vị** gồm WAL + volume ảnh) nhưng **không nhắc RTO 4 h lẫn uptime 99,5%**.
`.memlog.md` có: *"RTO 4h = restore thu cong co runbook, khong co failover tu dong"* —
spine không mang sang. Một VPS, một Compose, không staging, không failover, khôi phục thủ
công: đó là một lựa chọn hợp lệ, nhưng nó là lựa chọn **đối với một NFR có số**, và spine
không hề đặt hai thứ cạnh nhau. Runbook khôi phục — thứ RTO thật sự phụ thuộc vào — không
được yêu cầu ở đâu.

**Không phân tích bên thứ ba.** PRD §9.2: *"không theo dõi hành vi, không phân tích bên thứ
ba"*; §6: *"không phải công cụ marketing, không phải công cụ phân tích"*. AD-16 chỉ ràng
buộc **phụ thuộc runtime của server**. Một thẻ `<script>` analytics trong `storefront` không
vi phạm câu chữ của AD-16, và sơ đồ triển khai (*"Không có mũi tên nào rời khỏi khối VPS"*)
vẽ trình duyệt **ngoài** khối VPS. Ràng buộc chịu lực nhất của PRD có một lỗ ở phía client.

---

### F-18 · [LOW] · Các điểm nhỏ hơn, ghi lại để không mất

| # | Đầu vào | Tình trạng trong spine |
|---|---|---|
| a | **FR-19** *"Giao diện yêu cầu xác nhận rõ ràng trước khi chuyển sang `delivered`, có nêu việc này không đảo ngược được"* | AD-14 chặn chuyển tiếp ra khỏi `delivered` nhưng không nói gì về bước xác nhận. Addendum §4 nói rõ bước này thay cho việc cho phép đảo ngược, và *"chặn đúng rủi ro thật sự: nhấp nhầm"*. Cũng đúng với FR-24 (*"Giao diện nói rõ điều này **trước** khi chủ shop xác nhận"*). Có thể thuộc UX — nhưng spine liệt FR-19/FR-24 trong `Binds` của AD-14 mà không chuyển tiếp nghĩa vụ này cho ai. |
| b | **FR-10**: phiên hết hạn 30 ngày không hoạt động / 90 ngày tuyệt đối; giới hạn 10 lần sai/15 phút; mật khẩu ≥ 8 ký tự, thực thi phía máy chủ | AD-8 chọn cookie nhưng không nói vòng đời; AD-7 chỉ nói đặt lại thì huỷ mọi phiên. Rate limit có hệ quả kiến trúc thật: AD-16 cấm Redis → trạng thái đếm phải nằm in-process (mất khi restart) hoặc trong Postgres. Spine không chọn. |
| c | **FR-11 / FR-1**: tường đăng ký trả **401**; mọi màn hình trước tường trả **200, không chuyển hướng đăng nhập** | Quy ước *Hình dạng lỗi* chỉ chốt 404 cho cross-customer. 401-vs-redirect là quyết định biên HTTP, không có nhà. |
| d | **PRD §7.1**: *"một bề mặt duy nhất cho cả mặt tiền cửa hàng và back office"* | AD-9 tách **hai** app/bundle. Ý định của PRD (một web app responsive, không app di động) vẫn được giữ nhờ AD-8 (một origin), nhưng spine không đối chiếu câu chữ này — người curate sẽ phải tự kết luận. |
| e | **Glossary**: `Cart` và `Cart line` là thuật ngữ đã curate | AD-17 xoá giỏ khỏi phía server; hai thuật ngữ giờ không có thực thể nào. Không mâu thuẫn (chúng mô tả khái niệm phía client), nhưng CLAUDE.md §4 trao quyền đặt tên cho glossary và spine nên nêu điều này ở Deferred cùng với xung đột FR-8. |
| f | **Addendum §1**: khoá bi quan bị loại vì *"giữ khoá suốt transaction làm p95 đặt đơn khó đạt ngưỡng 1,0 s"* | Tiêu đề AD-3 — *"Đặt đơn là một transaction duy nhất, **khoá theo thứ tự cố định**"* — dễ bị đọc thành khoá bi quan. Thân AD-3 đúng (thứ tự xử lý dòng theo `product_id`), nhưng người thực thi đọc tiêu đề trước. |
| g | **SM-5** (tỷ lệ khách tự huỷ) | Đo được nhờ `order_status_event` ghi tài khoản thực hiện, nhưng SM-5 không nằm trong `Binds` của AD-14 — mạch truy vết đứt ở chỗ dễ nối. |
| h | **FR-12** điền sẵn địa chỉ từ đơn gần nhất | AD-12 cấm trỏ tới bản ghi hồ sơ (đúng), nhưng không nói nguồn điền sẵn là đơn gần nhất, và không nêu tương tác với ẩn danh hoá §9.3 (sau 12 tháng, nguồn điền sẵn biến mất). |

---

## 2. Những gì addendum §1–§4 đòi và **đã** hạ cánh

Ghi lại để pass sau không kiểm lại:

| Kết luận addendum | AD tương ứng | Nhận xét |
|---|---|---|
| §1 — khuynh hướng: ràng buộc ở tầng dữ liệu (`stock >= 0` + `UPDATE ... WHERE stock >= n`, số dòng ảnh hưởng = 0 nghĩa là thiếu hàng) | **AD-1** | Hạ cánh nguyên văn, kể cả cách phát hiện thiếu hàng |
| §1 — *"tất cả trong một transaction; **thứ tự khoá phải cố định** để tránh deadlock"* | **AD-3** (`product_id` tăng dần, luôn luôn) | Hạ cánh, và AD-3 nêu đúng deadlock trong `Prevents` |
| §1 — hàng đợi tuần tự hoá bị loại (phá "khách thấy mã đơn ngay") | AD-16 | Chặn được, nhưng lý do UJ-1 không được ghi (F-6) |
| §2 — khuynh hướng: cột được duy trì + job đối chiếu; *"chênh lệch là một sự cố, không phải một cảnh báo"* | **AD-4** | Hạ cánh nguyên văn, kể cả câu "sự cố, không phải cảnh báo" |
| §2 — sổ cái append-only | AD-4 + quy ước *Ghi vết* | Hạ cánh (bộ cột thì không — F-14) |
| §2 — phương án cộng dồn bị loại | AD-4 chọn cột | Kết quả đúng, lý do không ghi (F-6) |
| §3 — chuẩn hoá lúc ghi, không lúc đọc; cột `name_normalized` có index; *"chuẩn hoá lúc truy vấn phá index"* | **AD-11** | Hạ cánh nguyên văn, kể cả cái bẫy |
| §3 — không thêm công cụ tìm kiếm riêng | AD-16 | Chặn được, không nêu là đã loại (F-6) |
| §4 — trạng thái `awaiting_customer_approval` bị loại | Quy ước *Trạng thái đơn* (5 giá trị) + AD-14 | Chặn chặt |
| §4 — đảo ngược `delivered` bị loại | AD-14 | Hạ cánh |
| §4 — sổ địa chỉ bị loại | AD-12 | Hạ cánh |
| §4 — giữ chỗ tồn kho trong giỏ bị loại | AD-17 + FR-7 | Hạ cánh (ngầm) |
| §4 — danh mục nhiều tầng bị loại | **— không có —** | **F-10** |

Ngoài ra, spine chủ động **thêm** ba việc mà đầu vào không yêu cầu nhưng rõ ràng thuộc
thẩm quyền kiến trúc, và cả ba đều bảo vệ bất biến §8 #3: AD-6 (email không bao giờ là địa
chỉ gửi), AD-7 (đặt lại mật khẩu không thành mạo danh), AD-8 (một origin, cookie httpOnly,
cấm token trong `localStorage`). Việc spine bắt được lỗ hổng authz do Q10 mở ra — trước khi
Q10 kịp trở thành một FR — là kết quả tốt nhất của pass này và cần được giữ khi curate.

Spine cũng xử lý đúng ba xung đột theo CLAUDE.md §3 (báo cáo, không tự gỡ): AD-17 vs FR-8,
sàn Node của `verification.md`, và dòng thứ 16 của ma trận phân quyền. Đã kiểm: ma trận
PRD §5 hiện có **đúng 15 dòng**, nên con số trong `Deferred` là chính xác.

---

## 3. Tổng hợp theo mức độ

| Mức | # | Phát hiện |
|---|---|---|
| CRITICAL | F-1 | Điều kiện kiểm chứng SM-1 (addendum §7) + nghĩa vụ test của 4 bất biến §8 không có nhà, trong khi quy ước *Kiểm chứng* cấm task tự thêm test |
| CRITICAL | F-2 | FR-25 (xoá cứng có điều kiện) đòi `catalog → ordering`, chiều bị luật phụ thuộc cấm |
| HIGH | F-3 | FR-5 *"tình trạng tồn kho không được cache"* mất; AD-16 còn hợp thức hoá cache |
| HIGH | F-4 | SM-C1 / SM-C2 (phản chỉ số) vắng mặt hoàn toàn |
| HIGH | F-5 | FR-23 thông tin ngân hàng: không có thực thể, và mâu thuẫn quy ước *Cấu hình*; `payment` + `settings` không sở hữu bảng nào trong ER |
| HIGH | F-6 | Không có mục "phương án đã bị loại" — đích đến addendum §4 chỉ đích danh |
| HIGH | F-7 | Sai lệch có ý thức khỏi §9.2 (email làm định danh) chỉ nằm trong memlog |
| HIGH | F-8 | FR-14 đòi danh sách dòng thiếu hàng; AD-3 fail-fast chỉ cho biết dòng đầu |
| HIGH | F-9 | FR-5 giấu con số tồn kho vs AD-10 một-nguồn-DTO; và FR-6 lại đòi con số đó |
| MEDIUM | F-10 | "Danh mục phẳng" không được chốt ở luật nào |
| MEDIUM | F-11 | FR-3 đã chốt 24/100; spine đẩy ngược về `/speckit-plan` |
| MEDIUM | F-12 | Không có AD cho hiệu năng đọc đơn ở 300.000 đơn |
| MEDIUM | F-13 | FR-33 (đúng một chủ shop, không đăng ký công khai, không đặt đơn) không được thực thi |
| MEDIUM | F-14 | `stock_ledger` mất bộ cột FR-27 và enum `nguyên nhân` ba giá trị |
| MEDIUM | F-15 | Không có ghi vết cho thay đổi phí giao hàng (FR-20) và xác nhận thanh toán (FR-24) |
| MEDIUM | F-16 | Non-goal "không bao giờ chạm dữ liệu thẻ" không có điểm thực thi, dù có module `payment` |
| MEDIUM | F-17 | Uptime 99,5% / RTO 4 h không có nhà; "không phân tích bên thứ ba" có lỗ ở phía client |
| LOW | F-18 | Tám điểm nhỏ (a–h) |

---

## 4. Ghi chú cho người curate baseline

Ba nhóm cần hành động khác nhau:

1. **Người quyết định phải chốt** (không phải kiến trúc sư): F-7 (ghi nhận sai lệch §9.2
   vào baseline), F-9 (FR-5 vs FR-6 mâu thuẫn trong chính PRD), cộng ba mục `Deferred`
   spine đã nêu đúng.
2. **Kiến trúc sư phải bổ sung vào spine** (không cần hỏi ai): F-1, F-2, F-3, F-4, F-5,
   F-6, F-8, F-10, F-13, F-14, F-15, F-16.
3. **Chuyển tiếp xuống `/speckit-plan` / `verification.md` với người nhận rõ ràng**:
   F-11 (đính chính hướng: PRD đã chốt), F-12, F-17, và phần a–c của F-18.
