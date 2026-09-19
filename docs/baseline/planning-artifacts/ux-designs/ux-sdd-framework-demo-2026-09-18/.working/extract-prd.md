---
title: "Trích xuất PRD cho phiên UX — Shop Online"
status: working
created: 2026-09-18
source_prd: ../../../prds/prd-sdd-framework-demo-2026-09-18/prd.md
source_addendum: ../../../prds/prd-sdd-framework-demo-2026-09-18/addendum.md
source_glossary: ../../../../glossary.md
---

# Trích xuất PRD cho phiên UX — Shop Online

Quy tắc của tài liệu này: **chỉ trích, không suy diễn**. Mọi câu đều truy được về một
heading trong PRD hoặc addendum. Chỗ nào PRD im lặng thì ghi rõ **"PRD không nêu"** —
không lấp bằng phỏng đoán thiết kế.

Ký hiệu nguồn:
- `PRD §x` → `prd.md`
- `ADD §x` → `addendum.md`
- `GLO` → `docs/baseline/glossary.md`

---

## 1. Sản phẩm là gì + mục tiêu kinh doanh cốt lõi

**Nguồn: PRD §1 Tầm nhìn, PRD §6 Non-goals, PRD §10 Chỉ số thành công.**

Shop Online là một cửa hàng trực tuyến cho **một shop bán lẻ một chủ**, làm đúng một việc:
để khách hàng duyệt hàng và đặt đơn hoàn chỉnh **mà không cần ai trả lời** (PRD §1).

Cam kết thiết kế quan trọng nhất: **tồn kho chính xác tại thời điểm đặt đơn** — hệ thống
phải từ chối bán quá tồn kho (PRD §1). "Nếu chỉ một yêu cầu trong tài liệu này được giữ khi
mọi thứ khác phải cắt, đó là **FR-14**" (PRD §1).

Vấn đề đang giải: hôm nay chủ shop nằm trên đường găng của từng đơn hàng; mỗi đơn được chép
tay ít nhất một lần. Mục tiêu là tạo ra **một hệ thống ghi nhận duy nhất, do chính giao dịch
viết ra** thay vì được gõ lại sau đó (PRD §1).

Chỉ số thành công (PRD §10):
- **SM-1** — Số đơn được chấp nhận cho tồn kho không có thật = **0**.
- **SM-2** — "Bảng tính bị bỏ": 0 đơn ghi ngoài hệ thống sau tháng thứ hai.
- **SM-3** — ≥ **95%** đơn đi hết vòng đời mà chủ shop chỉ chuyển trạng thái, nhập phí giao
  hàng và xác nhận thanh toán (không có điều chỉnh tồn kho tay, không có chuyển trạng thái
  bị từ chối).
- **SM-4** (phụ) — Thời gian trung vị `placed` → `confirmed`, chưa có mục tiêu ở v1.
- **SM-5** (phụ) — Tỷ lệ khách hàng tự huỷ đơn so với chủ shop huỷ.

**Phản chỉ số — UX phải biết (PRD §10):**
- **SM-C2 — Tỷ lệ chuyển đổi không được tối ưu.** "Tường đăng ký (FR-11) và việc từ chối đơn
  thiếu hàng (FR-14) **đều làm giảm** tỷ lệ chuyển đổi, và cả hai đều đúng." Đây là ràng buộc
  trực tiếp lên thiết kế: **không được đề xuất guest checkout hay nới lỏng FR-14 để tăng
  conversion**.
- **SM-C1 — Độ trễ đặt đơn** là trần, không phải mục tiêu đua. "Nếu phải chọn, chọn chậm hơn."

**Mục tiêu kinh doanh định lượng: PRD không nêu.** PRD §10 ghi rõ `[ASSUMPTION]` "Discovery
không cung cấp mục tiêu kinh doanh nào — số đơn/tháng, doanh thu, hay số giờ chủ shop tiết
kiệm được." → PRD §11.2 Q2 để ngỏ.

---

## 2. Người dùng / vai trò

**Nguồn: PRD §2.1 Jobs To Be Done, PRD §2.2 Không phải người dùng của v1, PRD §5 Ma trận
phân quyền, PRD §3 Thuật ngữ, GLO Domain terms.**

### 2.1 Ba vai trò (mô hình phân quyền **bị đóng băng** — PRD §5)

> PRD §5: "Đây là mô hình phân quyền bị đóng băng. Ba vai trò, hết. Nhỏ tới mức không cần
> bất kỳ policy engine nào — và phải giữ được như vậy."

| Vai trò | Định nghĩa (GLO / PRD §3) | Bối cảnh sử dụng PRD nêu | Mức thành thạo |
|---|---|---|---|
| **Khách chưa đăng ký** (Guest) | Người dùng không có phiên đăng nhập. Duyệt và thêm vào giỏ được; đặt đơn thì không | UJ-2: đến từ **một bài Facebook**, chưa từng mua ở đây | PRD không nêu |
| **Khách hàng** (Customer) | Người dùng đã đăng ký và đăng nhập. Đặt đơn và xem lịch sử đơn của **chính mình**; huỷ đơn của chính mình khi ở `placed` | UJ-1: đã mua vài lần **qua Zalo**, mở link từ một bài đăng, đặt đơn **lúc 10 giờ đêm**. UJ-5: mở lại lịch sử đơn sáng hôm sau | PRD không nêu trực tiếp; hàm ý người dùng phổ thông Việt Nam quen Zalo/Facebook |
| **Chủ shop** (Shop owner) | Tài khoản quản trị **duy nhất**. Quản lý sản phẩm, tồn kho, đơn hàng. **Không đặt đơn được** | UJ-3: mở back office **lúc 7 giờ sáng, trên máy tính**, xử lý đêm qua **trong mười phút**. UJ-4: mở app ngân hàng đối chiếu rồi quay lại back office. Làm **một mình** | PRD không nêu; hiện đang dùng bảng tính + Zalo |

### 2.2 Jobs To Be Done (PRD §2.1 — nguyên văn rút gọn)

**Chủ shop:** nhận đơn mà không phải có mặt ("một buổi tối mà đơn vẫn về và không có gì cần
trả lời") · nhìn một con số tồn kho và tin được nó · có **một nơi duy nhất** mọi đơn hàng đều
nằm ở đó, không phải ba nơi · không phải xin lỗi khách vì bán món đã hết.

**Khách hàng:** đặt hàng vào giờ hợp với mình · biết món hàng còn hay hết **trước khi** bỏ
công đặt · xem lại mình đã đặt gì, khi nào, tình trạng ra sao — **không phải cuộn lại lịch sử
chat**.

**Khách chưa đăng ký:** xem hàng và so giá **mà không phải khai gì về mình**.

### 2.3 KHÔNG phải người dùng của v1 (PRD §2.2) — UX không được thiết kế cho

- **Nhân viên của shop** — không tài khoản phụ, không phân quyền nội bộ.
- **Người bán thứ hai** — không phải sàn TMĐT.
- **Khách doanh nghiệp (B2B)**.
- **Khách không nói tiếng Việt** — chỉ tiếng Việt trong v1.

### 2.4 Ma trận phân quyền đầy đủ (PRD §5 — trích nguyên)

| Năng lực | Khách chưa đăng ký | Khách hàng | Chủ shop |
|---|:--:|:--:|:--:|
| Duyệt danh mục, tìm kiếm (FR-1, FR-2) | ✓ | ✓ | ✓ |
| Xem chi tiết sản phẩm và tình trạng tồn kho (FR-4, FR-5) | ✓ | ✓ | ✓ |
| Thêm vào giỏ hàng (FR-6, FR-7) | ✓ | ✓ | **—** |
| Tự đăng ký tài khoản (FR-9) | ✓ | — | — |
| Đăng nhập, đăng xuất (FR-10) | — | ✓ | ✓ |
| Đặt đơn (FR-12, FR-13, FR-14) | — | ✓ | **—** |
| Xem hướng dẫn chuyển khoản của đơn mình (FR-23) | — | ✓ | ✓ |
| Xem lịch sử và chi tiết đơn của chính mình (FR-21, FR-31) | — | ✓ | — |
| **Huỷ đơn của chính mình khi ở `placed` (FR-17)** | — | **✓** | — |
| Xem mọi đơn hàng (FR-29, FR-30) | — | — | ✓ |
| Chuyển trạng thái đơn hàng (FR-16, FR-19) | — | — | ✓ |
| Nhập phí giao hàng (FR-20) | — | — | ✓ |
| Xác nhận thanh toán chuyển khoản (FR-24) | — | — | ✓ |
| Quản lý sản phẩm và danh mục (FR-25, FR-26, FR-28) | — | — | ✓ |
| Điều chỉnh tồn kho (FR-27) | — | — | ✓ |

Ba ô đang **chờ xác nhận** (PRD §5): huỷ đơn của chính mình (→ Q5), chủ shop không thêm được
vào giỏ (→ Q12), chủ shop không đặt đơn được (→ Q4).

---

## 3. Các bề mặt (surfaces)

**Nguồn chính: ADD §5 "Bề mặt và điều hướng — đầu vào cho phase UX"** (mục này đích danh gửi
cho `bmad-ux`). Bổ sung từ PRD §4.1–§4.11 và §7.1.

### 3.1 Storefront (công khai)

| Surface | Ai dùng | Mục đích | Nguồn |
|---|---|---|---|
| Trang chủ / danh sách sản phẩm | Guest, Khách hàng, Chủ shop | Duyệt "tất cả sản phẩm", phân trang 24/trang (trần 100) | ADD §5 · PRD §4.1 FR-1, FR-3 |
| Danh sách theo danh mục | Guest, Khách hàng, Chủ shop | Duyệt sản phẩm của một danh mục **phẳng** (một cấp) | ADD §5 · PRD §4.1 FR-1 |
| Tìm kiếm | Guest, Khách hàng, Chủ shop | Tìm theo **tên sản phẩm**, khớp cả khi bỏ dấu, không phân biệt hoa/thường; 0 kết quả → danh sách rỗng + thông báo, không phải lỗi | PRD §4.1 FR-2 |
| Chi tiết sản phẩm | Guest, Khách hàng, Chủ shop | Tên, mô tả, giá (VND đã gồm VAT), ảnh, **tình trạng còn/hết** | ADD §5 · PRD §4.2 FR-4, FR-5 |
| Giỏ hàng | Guest, Khách hàng | Thêm/sửa số lượng/xoá dòng giỏ hàng; hiện **tổng tiền hàng**; đánh dấu dòng vượt tồn kho / ngừng bán | ADD §5 · PRD §4.3 FR-6 |
| Đăng ký / đăng nhập (tường đăng ký) | Guest | Tường nằm **giữa giỏ hàng và đặt đơn**; sau khi qua tường thì trả về đúng luồng đặt đơn, giỏ nguyên vẹn | ADD §5 · PRD §4.4 FR-9, FR-10, FR-11 |
| Đặt đơn (checkout) | Khách hàng | Nhập địa chỉ giao (tên, SĐT, địa chỉ), chọn `cod`/`bank_transfer`, bấm đặt | ADD §5 · PRD §4.5 FR-12, FR-13, FR-14 |
| Xác nhận đơn | Khách hàng | Hiện **mã đơn + trạng thái `placed`**; nếu `bank_transfer` thì hiện hướng dẫn chuyển khoản | ADD §5 · PRD §2.3 UJ-1 · §4.8 FR-23 |
| **Màn hình đơn bị từ chối vì hết hàng** | Khách hàng | Nêu **cụ thể dòng nào không đủ**, số lượng còn bán được, giữ nguyên giỏ | ADD §5 ("khoảnh khắc UX nặng nhất") · PRD §4.5 FR-14 |
| Lịch sử đơn của tôi | Khách hàng | Danh sách đơn của chính mình, mới nhất trước: mã đơn, ngày đặt, tổng tiền đơn, trạng thái | ADD §5 · PRD §4.11 FR-31 |
| Chi tiết đơn của tôi | Khách hàng | Dòng đơn hàng + giá tại thời điểm đặt, địa chỉ, phương thức thanh toán, **phí giao hàng**, tổng tiền đơn; nút huỷ chỉ khi `placed`; hiện lại hướng dẫn chuyển khoản khi `bank_transfer` + `placed` | ADD §5 · PRD §4.7 FR-21 · §4.11 FR-31 |

### 3.2 Back office (chủ shop)

| Surface | Ai dùng | Mục đích | Nguồn |
|---|---|---|---|
| Đăng nhập back office | Chủ shop | Không có luồng đăng ký quản trị nào | ADD §5 · PRD §4.4 FR-33 |
| Danh sách đơn hàng (lọc theo trạng thái) | Chủ shop | Mới nhất trước, phân trang, lọc theo trạng thái. Mỗi dòng: mã đơn, thời điểm đặt, tên người nhận, tổng tiền đơn, phương thức thanh toán, trạng thái, và với `bank_transfer` là **tình trạng xác nhận thanh toán** | ADD §5 · PRD §4.10 FR-29 |
| Chi tiết đơn hàng | Chủ shop | Toàn bộ nội dung + **lịch sử trạng thái** (mỗi lần chuyển, thời điểm, tài khoản thực hiện); các hành động khả dụng đúng theo trạng thái và ràng buộc FR-16/19/20/24 | ADD §5 · PRD §4.10 FR-30 |
| Danh sách sản phẩm | Chủ shop | Quản lý những gì được bán | ADD §5 · PRD §4.9 |
| Tạo / sửa sản phẩm | Chủ shop | Tên, giá (> 0), mô tả, ảnh (≥ 1, JPEG/PNG/WebP, ≤ 5 MB), gán danh mục, **ngừng bán** | ADD §5 · PRD §4.9 FR-25, FR-28 |
| Danh mục | Chủ shop | Tạo, đổi tên, xoá danh mục; gán sản phẩm (0..1 danh mục); **không đặt được danh mục cha** | ADD §5 · PRD §4.9 FR-26 |
| Điều chỉnh tồn kho | Chủ shop | Đặt lại con số tồn kho (≥ 0); mọi thay đổi có ghi vết | ADD §5 · PRD §4.9 FR-27 |

### 3.3 Surface PRD **hàm ý** nhưng không đặt tên riêng

- **Cấu hình thông tin ngân hàng của shop** — FR-23 yêu cầu "thông tin ngân hàng do chủ shop
  **cấu hình**, không hardcode" (`[ASSUMPTION]`: "discovery không nêu nơi cấu hình"). ADD §5
  không liệt kê surface này → **UX phải chốt nó ở đâu**. Xem §10 Khoảng trống.
- **Đổi mật khẩu chủ shop** — FR-33: "Chủ shop đổi được mật khẩu của mình." Không có surface
  tương ứng trong ADD §5.
- **Xem lịch sử ghi vết tồn kho** — FR-27 yêu cầu ghi vết đầy đủ; PRD không nêu có màn hình
  đọc sổ cái đó hay không.
- **Ẩn danh hoá đơn hàng (PRD §9.3)** — chính sách 12 tháng; PRD không nêu có giao diện nào
  cho việc này.

---

## 4. Luồng nghiệp vụ chính (User Journeys)

**Nguồn: PRD §2.3 Hành trình người dùng (UJ-1 … UJ-6).**

### UJ-1 — Chị Hằng đặt đơn lúc 10 giờ đêm, không nhắn tin cho ai
1. Đến từ một bài đăng, mở link. **Chưa đăng nhập.**
2. Duyệt danh mục → mở trang sản phẩm → thấy giá và dòng **"Còn hàng"**.
3. Thêm vào giỏ → bấm đặt hàng → **hệ thống yêu cầu đăng ký**.
4. Đăng ký bằng số điện thoại — **giỏ hàng vẫn còn nguyên**.
5. Nhập địa chỉ giao → chọn **COD** → xác nhận.
6. Màn hình hiện **mã đơn** và trạng thái **`placed`**.
> "**Giá trị đến ở khoảnh khắc** đơn hàng có mã và trạng thái — nó đã tồn tại trong hệ thống,
> không phải là một tin nhắn chờ người đọc."
> Trường hợp biên: món vừa hết giữa lúc ở màn hình thanh toán → UJ-6.

### UJ-2 — Anh Minh xem hết hàng rồi mới chịu khai tên
1. Khách chưa đăng ký, đến từ một bài Facebook.
2. Tìm "bình giữ nhiệt" → lọc theo danh mục → mở ba sản phẩm → bỏ hai món vào giỏ.
3. **Không có màn hình nào chặn** cho tới lúc này — "duyệt hàng không tốn gì thì không đòi gì".
4. Bấm đặt hàng → **tường đăng ký** mới hiện ra.
5. Đăng ký → **hai món trong giỏ được gộp nguyên vẹn vào tài khoản mới** (FR-8) → đặt đơn.
> Biên: đăng nhập vào tài khoản đã có hàng trong giỏ → **hai giỏ được gộp**, không cái nào bị xoá.

### UJ-3 — Chị Lan mở back office lúc 7 giờ sáng, xử lý đêm qua trong mười phút
1. Đăng nhập back office **trên máy tính**.
2. Thấy danh sách đơn **`placed`** từ đêm.
3. **Nhập phí giao hàng** cho khu vực đó (FR-20) — đơn **vẫn ở `placed`**, tổng tiền cập nhật,
   khách **vẫn còn quyền huỷ**.
4. Nhắn khách **qua Zalo** xác nhận phí (ngoài hệ thống), rồi mới bấm **`confirmed`**.
5. Tồn kho đã bị trừ từ lúc đơn được đặt → không có gì phải đối chiếu.
> "**Giá trị đến khi** chị đóng danh sách và không còn đơn nào ở `placed`."

### UJ-4 — Chị Lan đối chiếu một khoản chuyển khoản
1. Một đơn chọn **chuyển khoản**. Đơn ở `placed`, nút chuyển sang `confirmed` **bị khoá** (FR-24).
2. Mở app ngân hàng (ngoài hệ thống), thấy tiền về đúng số và đúng nội dung.
3. Quay lại back office → đánh dấu **đã nhận thanh toán**.
4. **Chỉ khi đó** nút `confirmed` mới mở.
> Hệ thống không biết gì về ngân hàng — nó chỉ ghi lại việc chị đã xác nhận, và **ai** đã xác nhận.
> Biên: tiền không bao giờ về → đơn nằm ở `placed` cho tới khi chị huỷ; huỷ thì hoàn kho (FR-18).

### UJ-5 — Chị Hằng đổi ý trước khi đơn được xác nhận
1. Sáng hôm sau mở **lịch sử đơn**, thấy đơn vẫn ở `placed` và **phí giao hàng cao hơn chị nghĩ**.
2. Bấm **huỷ đơn** (FR-17) → đơn sang `cancelled`, **tồn kho hoàn lại ngay** (FR-18).
3. Không phải nhắn cho ai.
> Nếu đơn đã ở `confirmed`, **nút huỷ không còn** — "chị phải liên hệ chủ shop, và đó là điều
> **màn hình nói rõ** chứ không phải điều chị phải đoán."

### UJ-6 — Hai khách cùng nhắm món cuối cùng ("hành trình mà cả sản phẩm này tồn tại vì nó")
1. Còn đúng 1 cái. Hai người cùng ở màn hình thanh toán, cùng có món đó trong giỏ.
2. Giỏ hàng **không giữ chỗ** tồn kho (FR-7) → tới đây chưa có gì sai.
3. Cả hai bấm đặt đơn cách nhau **chưa tới một giây**.
4. **Một người nhận mã đơn.**
5. Người kia nhận **một thông báo cụ thể**: món này vừa hết, **dòng hàng nào trong giỏ bị ảnh
   hưởng**, **giỏ còn lại gì**.
6. **Không có đơn thứ hai nào được tạo ra.**

### UJ bổ sung — Sơ đồ vòng đời đơn hàng (PRD §4.6)
```
placed ──▶ confirmed ──▶ shipped ──▶ delivered   (điểm cuối)
  │            │            │
  └────────────┴────────────┴──▶ cancelled       (điểm cuối)
```

---

## 5. Form-factor / nền tảng

**Nguồn: PRD §7.1 (dòng cuối), PRD §7.2, ADD §5, PRD §11.2 Q7.**

- **Một web app responsive, desktop-first, phục vụ cả hai vai trò** (ADD §5).
- PRD §7.1: "Nền tảng: **web responsive, ưu tiên desktop, một bề mặt duy nhất** cho cả mặt tiền
  cửa hàng và back office."
- **Ứng dụng di động: ngoài phạm vi** — PRD §7.2, lý do "Web responsive phục vụ cả hai bề mặt".
- **Độ vênh đã được nêu rõ và giao lại cho UX** (ADD §5 + PRD §11.2 Q7):
  > "Back office **rõ ràng là desktop**; storefront thì **đáng cân nhắc lại**. Phase UX quyết
  > định; tài liệu này không tự sửa." (ADD §5)
  > "Brief nói khách đến từ Facebook/Zalo — **gần như chắc chắn là điện thoại**. Phiên này chọn
  > desktop-first. **Phase UX nên xem lại độ vênh này.**" (PRD §11.2 Q7)
- UJ-3 xác nhận bối cảnh back office: chủ shop "Đăng nhập back office **trên máy tính**".

**Trình duyệt cụ thể: PRD không nêu.**
**Kích thước màn hình / breakpoint cụ thể: PRD không nêu.**
**Thiết bị cụ thể: PRD không nêu** (chỉ có suy luận "gần như chắc chắn là điện thoại" ở Q7, và
PRD tự đánh dấu đó là câu hỏi mở, không phải kết luận).

---

## 6. Hệ UI / thư viện / design system / ràng buộc kỹ thuật FE

**Nguồn: PRD §9.1 Ràng buộc pháp lý và thương mại.**

- **Design system / thư viện UI: PRD không nêu.** Không có shadcn, MUI, Ant, Tailwind, hay hệ
  nội bộ nào được nhắc tới ở bất kỳ đâu trong PRD hoặc addendum.
- **Ràng buộc kỹ thuật FE: PRD không nêu.** Ngược lại, PRD §9.1 nói rõ:
  > "**Không có ràng buộc công nghệ nào.** Phase kiến trúc chọn stack tự do; không có chuẩn
  > CI/CD nội bộ phải tuân theo."
- Ràng buộc gián tiếp duy nhất chạm tới FE (PRD §6):
  > "**Hệ thống không nói chuyện với bất cứ thứ gì bên ngoài.** Mục hợp đồng tích hợp trong tài
  > liệu kiến trúc sẽ **rỗng, một cách có chủ ý**. Đó là một yêu cầu, không phải một khoảng trống."
  → Đọc theo nghĩa hẹp, đây là ràng buộc về tích hợp hệ thống, **không** phải tuyên bố về CDN
  hay thư viện FE. PRD không nói rõ điều đó áp dụng ra sao cho tài nguyên front-end → xem §10.
- **Không có dữ liệu thẻ, không bao giờ** (PRD §6, §9.1) — không có form thẻ nào trong UX.

---

## 7. NFR ảnh hưởng UX

**Nguồn: PRD §8 Yêu cầu phi chức năng xuyên suốt, PRD §9 Quyền riêng tư, PRD §7.2.**

### 7.1 Hiệu năng (PRD §8 — toàn bộ là **mục tiêu đặt ra**, không phải số đã đo)

| Chỉ tiêu | Mục tiêu | FR liên quan |
|---|---|---|
| p95 tải trang — duyệt danh mục | **≤ 1,5 s** | FR-1, FR-3 |
| p95 API — đường đọc | **≤ 400 ms** | FR-1…FR-5, FR-29, FR-31 |
| p95 API — đặt đơn | **≤ 1,0 s** (đã gồm kiểm tra tồn kho) | FR-14 |

### 7.2 Quy mô / mật độ dữ liệu (PRD §8)

| Chỉ tiêu | Y1 | Y3 |
|---|---|---|
| Người dùng hoạt động đồng thời | 200 | — |
| Đỉnh tốc độ đặt đơn | 5 đơn/phút | — |
| **Số sản phẩm** | **2.000** | **20.000** |
| **Số đơn hàng** | **30.000** | **300.000** |

Hệ quả trực tiếp lên UX:
- **Phân trang bắt buộc** (FR-3): kích thước trang mặc định **24 sản phẩm**, trần **100**. Yêu
  cầu > 100 được xử lý như 100, **không trả lỗi**. "Không có phản hồi API danh sách nào trả về
  toàn bộ danh mục sản phẩm trong một lần."
- **Danh sách đơn back office phân trang** và đạt p95 ≤ 400 ms **với 300.000 đơn** (FR-29).

### 7.3 i18n / ngôn ngữ

- **Chỉ tiếng Việt trong v1.** "Khách không nói tiếng Việt" là non-user (PRD §2.2); "Ngôn ngữ
  ngoài tiếng Việt" nằm ngoài phạm vi (PRD §7.2, lý do "Khách hàng là người Việt").
- **Tìm kiếm phải khớp khi bỏ dấu tiếng Việt** (FR-2): "binh giu nhiet" khớp "Bình giữ nhiệt";
  hoa/thường không ảnh hưởng. `[ASSUMPTION]` của PRD.
- **Tiền tệ: VND, một loại tiền duy nhất** (PRD §7.2 "Nhiều kho, nhiều loại tiền tệ" — ngoài
  phạm vi). **Giá hiển thị đã gồm VAT, không tách dòng thuế** (PRD §9.1, FR-4).

### 7.4 Thông báo — ràng buộc nặng nhất lên UX

- **Email và SMS thông báo: ngoài phạm vi** (PRD §7.2). PRD tự gọi đây là "**Mục nặng nề nhất
  trong danh sách này**".
- FR-21: "**Không có thông báo đẩy nào được gửi** — trạng thái chỉ nhìn thấy trong ứng dụng
  (đây là ràng buộc phạm vi §6, không phải thiếu sót)."
- PRD §4.11: lịch sử đơn của khách hàng là **kênh duy nhất** khách biết trạng thái đơn.
- `[NOTE FOR PM]` PRD §4.7: "Không có email/SMS nghĩa là khách hàng **chỉ biết phí giao hàng nếu
  tự mở lại ứng dụng**" → §11.2 Q8.

### 7.5 Accessibility

- **PRD không nêu.** Không có yêu cầu WCAG, contrast, keyboard navigation, screen reader nào
  trong PRD §8 hay bất kỳ mục nào khác.

### 7.6 Offline

- **PRD không nêu.** Không có yêu cầu offline, PWA, hay cache phía client. Ngược lại, FR-5 ràng
  buộc: "**Tình trạng tồn kho không được cache**; nếu tầng nào đó cache trang sản phẩm, phần
  tình trạng tồn kho phải nằm ngoài phần được cache."

### 7.7 In ấn / xuất Excel / báo cáo

- **Ngoài phạm vi.** PRD §7.2: "Dashboard phân tích, báo cáo" — lý do "Dữ liệu phải đúng trước,
  phân tích sau". PRD §6: "Đây là hệ thống ghi nhận đơn hàng, **không phải công cụ marketing,
  không phải hệ thống quản lý kho, không phải công cụ phân tích**."
- **In đơn / xuất Excel: PRD không nêu.** Lưu ý SM-2 đo "bảng tính bị bỏ" — mục tiêu là **bỏ**
  bảng tính, nên tính năng xuất Excel đi ngược tinh thần đó, nhưng PRD không cấm minh thị.

### 7.8 Độ tin cậy, vận hành, quyền riêng tư (PRD §8, §9)

- Uptime **99,5%/tháng**; RPO 1 giờ / RTO 4 giờ.
- **Ảnh sản phẩm:** chỉ JPEG, PNG, WebP; **tối đa 5 MB mỗi ảnh**, thực thi ở phía máy chủ
  (FR-28). Mỗi sản phẩm **bắt buộc ≥ 1 ảnh**; ảnh đầu tiên là ảnh đại diện trong danh sách.
- **Phiên đăng nhập:** hết hạn sau **30 ngày không hoạt động**, tuyệt đối **90 ngày** (FR-10).
- **Giới hạn đăng nhập sai:** **10 lần / định danh / 15 phút**, sau đó từ chối thêm 15 phút.
  **Không khoá tài khoản vĩnh viễn** — vì không có kênh email/SMS để mở khoá (FR-10).
- **Mật khẩu tối thiểu 8 ký tự**, thực thi phía máy chủ (FR-10).
- Thông báo lỗi đăng nhập **không được tiết lộ định danh có tồn tại hay không** (FR-10).
- **NĐ 13/2023/NĐ-CP:** tên, SĐT, địa chỉ giao hàng là dữ liệu cá nhân; chỉ thu thập những gì
  việc giao hàng cần (PRD §9.1, §9.2). **Không hồ sơ cá nhân, không ngày sinh, không giới tính,
  không theo dõi hành vi, không phân tích bên thứ ba** (PRD §9.2) → **không analytics FE**.

---

## 8. Trạng thái & quy tắc nghiệp vụ buộc UI phải thể hiện

**Nguồn: PRD §4.2, §4.3, §4.5, §4.6, §4.7, §4.8, §4.9, §4.10, §4.11.**

### 8.1 Trạng thái đơn hàng và quy tắc chuyển tiếp

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| Năm trạng thái: `placed`, `confirmed`, `shipped`, `delivered`, `cancelled` | UI chỉ dùng đúng 5 nhãn này | PRD §3, §4.6 |
| Chỉ chuyển tiếp trong sơ đồ được chấp nhận; lùi trạng thái → HTTP 409 | Nút hành động phải bám đúng trạng thái hiện tại, không hiện hành động không hợp lệ | FR-16 |
| `delivered` và `cancelled` là **điểm cuối** | Không có hành động nào ra khỏi hai trạng thái này, **kể cả trong back office** | FR-16, FR-19 |
| Chuyển sang `delivered` cần **bước xác nhận riêng** và **không đảo ngược được** | "Giao diện yêu cầu xác nhận rõ ràng trước khi chuyển sang `delivered`, **có nêu việc này không đảo ngược được**" | FR-19 |
| Khách hàng huỷ đơn của chính mình **chỉ khi `placed`** | Nút huỷ chỉ hiện ở `placed`; các trạng thái khác "giao diện **nói rõ khách hàng cần liên hệ chủ shop**" | FR-17, FR-31 |
| Đơn `bank_transfer` **đã xác nhận nhận thanh toán** thì **không huỷ được nữa**, ở bất kỳ trạng thái nào, bởi bất kỳ ai | "Giao diện **ẩn nút huỷ kèm lời giải thích**" | FR-17, FR-24 |
| Xác nhận thanh toán **gác** `confirmed` cho `bank_transfer` | Nút `confirmed` **bị khoá** cho tới khi đánh dấu đã nhận thanh toán | FR-24, UJ-4 |
| Xác nhận thanh toán **tự nó không đổi trạng thái đơn** — hai hành động riêng | Hai control riêng biệt trong back office | FR-24 |
| Xác nhận thanh toán **không đảo ngược được** | "Giao diện **nói rõ điều này TRƯỚC khi** chủ shop xác nhận thanh toán, vì đó là hành động một chiều" | FR-24 |
| Đánh dấu đã nhận thanh toán cho đơn `cod` → HTTP 409 (không áp dụng) | Control này không tồn tại/bị vô hiệu với đơn `cod` | FR-24 |
| Huỷ từ `placed`/`confirmed` → hoàn kho; huỷ từ `shipped` → **không** hoàn kho | Ảnh hưởng nội dung xác nhận khi chủ shop huỷ đơn `shipped` | FR-18 |
| Mọi lần đổi trạng thái ghi lại **thời điểm và tài khoản thực hiện** | Chi tiết đơn back office hiển thị **lịch sử trạng thái** | FR-16, FR-30 |

### 8.2 Tồn kho

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| Tồn kho > 0 → **"Còn hàng"**, cho thêm vào giỏ | Hai nhãn duy nhất PRD đặt tên | FR-5 |
| Tồn kho = 0 → **"Hết hàng"**; **nút thêm vào giỏ bị vô hiệu hoá** và API từ chối | Sản phẩm hết hàng **vẫn hiển thị**, không bị ẩn (PRD §4.2: "ẩn đi thì khách tưởng shop không bán món đó") | FR-5 |
| **Không hiển thị con số tồn kho chính xác** cho Guest và Khách hàng — chỉ còn/hết | Back office thì thấy số (FR-27) | FR-5 |
| Tình trạng tồn kho **không được cache** | Ràng buộc render/caching | FR-5 |
| Giỏ hàng **không giữ chỗ** tồn kho | Không có đồng hồ đếm ngược / "giữ chỗ trong N phút" | FR-7, ADD §4 |
| **Số lượng vượt tồn kho được phép trong giỏ**, nhưng giỏ **phải đánh dấu đúng những dòng đang vượt**, **nêu rõ số lượng còn bán được** | Trạng thái cảnh báo cấp dòng trong giỏ | FR-6 |
| Sản phẩm **ngừng bán** khi đang trong giỏ → dòng **vẫn hiển thị**, đánh dấu không mua được. "Dòng **không tự biến mất** — im lặng xoá đồ khỏi giỏ của khách còn tệ hơn" | Trạng thái dòng giỏ thứ hai | FR-6 |
| Giá sản phẩm đổi → **dòng giỏ dùng giá hiện tại**; chỉ đơn hàng mới chốt giá | Giỏ không cam kết giá | FR-6, FR-14 |
| Sản phẩm **ngừng bán** không hiện khi duyệt/tìm kiếm, không thêm được vào giỏ, **không phải xoá** | Back office cần trạng thái ngừng bán, không phải nút xoá | FR-25, GLO |

### 8.3 Tiền và tổng tiền

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| **Giỏ hiển thị tổng tiền hàng; CHƯA gồm phí giao hàng** (phí chỉ tồn tại sau khi đơn được đặt) | Không có dòng phí giao hàng trong giỏ và checkout | FR-6, FR-20 |
| **Phí giao hàng mặc định 0**, do chủ shop **nhập tay** cho từng đơn, **chỉ khi đơn ở `placed`** | Đặt phí cho đơn không ở `placed` → 409 | FR-20 |
| Đặt phí **không đổi trạng thái đơn**; tổng tiền tính lại ngay | Đơn ở `placed` có phí > 0 **vẫn hiển thị nút huỷ** | FR-20, FR-21 |
| Lịch sử đơn hiển thị **tách bạch: tổng tiền hàng · phí giao hàng · tổng tiền đơn** | Ba dòng riêng, dùng đúng thuật ngữ glossary | FR-21 |
| **Giá hiển thị VND, đã gồm VAT, không có dòng thuế tách riêng** | | FR-4, PRD §9.1 |
| Giá dòng đơn hàng **sao chép tại thời điểm đặt**; đổi giá sản phẩm không đổi đơn cũ | Chi tiết đơn hiển thị "giá tại thời điểm đặt" | FR-14, FR-25, FR-30, FR-31 |
| Giá sản phẩm **âm hoặc bằng 0 bị từ chối** | Validation form back office | FR-25 |
| Phí giao hàng **âm bị từ chối**; bằng 0 hợp lệ | Validation | FR-20 |

### 8.4 Phân quyền và cô lập dữ liệu

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| Khách hàng truy cập đơn của người khác → **HTTP 404, không phải 403** ("403 đã tiết lộ đơn đó tồn tại") | Trang lỗi phải là "không tìm thấy", không được gợi ý đơn tồn tại | FR-17, FR-32, FR-16 |
| Khách hàng gọi API chuyển trạng thái trên đơn **của chính mình** → 403 (trừ FR-17) | | FR-16 |
| **Chủ shop không thêm được vào giỏ, không đặt đơn được** | Storefront không hiện control giỏ/checkout cho phiên chủ shop | PRD §5, FR-33 |
| **Không có API hay màn hình công khai nào tạo được tài khoản chủ shop**; có **đúng một** tài khoản chủ shop | Không có màn hình đăng ký admin | FR-33 |
| Mọi màn hình **trước** tường đăng ký đều truy cập được **không cần đăng nhập**; truy cập không phiên trả HTTP **200, không phải redirect đăng nhập** | Không được chặn/redirect ở storefront | FR-1, FR-11 |

### 8.5 Đặt đơn và tường đăng ký

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| Ba trường địa chỉ (**tên người nhận, số điện thoại, địa chỉ**) đều **bắt buộc** | | FR-12 |
| Nếu khách đã có đơn trước → biểu mẫu **điền sẵn từ địa chỉ của đơn gần nhất** và **sửa được** | **Không có sổ địa chỉ** — quyết định tối thiểu hoá dữ liệu | FR-12, PRD §9.2, ADD §4 |
| **Đúng hai** lựa chọn thanh toán: `cod`, `bank_transfer`. Giá trị khác bị từ chối | | FR-13 |
| Phương thức thanh toán **không đổi được sau khi đặt** | | FR-13 |
| Giỏ rỗng → không đặt được đơn | | FR-14 |
| Đặt đơn thành công → **giỏ hàng được làm rỗng**; đơn tạo ở `placed` bất kể phương thức thanh toán | | FR-14 |
| Đơn bị từ chối vì thiếu hàng → trả về **danh sách cụ thể dòng nào không đủ**; **giỏ hàng vẫn còn nguyên** | Màn hình UX nặng nhất — ADD §5 | FR-14 |
| `bank_transfer` → sau khi đặt hiển thị: **tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền, nội dung chuyển khoản** (chứa **mã đơn**) | Xem lại được trong lịch sử đơn khi đơn còn `placed` | FR-23, FR-31 |
| Tường đăng ký: sau khi đăng ký/đăng nhập, **quay lại đúng bước đặt đơn với giỏ nguyên vẹn** | | FR-11, FR-8 |
| Đăng ký chỉ yêu cầu **định danh + mật khẩu**; **không yêu cầu địa chỉ giao hàng** | Địa chỉ nhập ở bước đặt đơn | FR-9 |
| Đăng ký thành công **tạo phiên đăng nhập ngay** — không phải đăng nhập lại | | FR-9 |
| Định danh đã tồn tại → từ chối **kèm thông báo rõ ràng** | | FR-9 |
| Gộp giỏ khi đăng nhập: sản phẩm trùng **cộng dồn số lượng**, **không dòng nào bị mất** | | FR-8 |

### 8.6 Back office — sản phẩm, danh mục

| Quy tắc | Hệ quả UI | Nguồn |
|---|---|---|
| Tạo sản phẩm yêu cầu **tên, giá, ít nhất một ảnh** | | FR-25, FR-28 |
| Sản phẩm **đã xuất hiện trong đơn** → **không xoá cứng được**, chỉ ngừng bán. Chưa từng xuất hiện → xoá cứng được | Hai hành vi khác nhau trên cùng một nút → UI phải phân biệt | FR-25 |
| Nhiều ảnh được phép; **ảnh đầu tiên là ảnh đại diện** trong danh sách → cần sắp xếp ảnh | | FR-28 |
| Một sản phẩm thuộc **nhiều nhất một danh mục** | Chọn đơn, không phải multi-select | FR-26 |
| **Xoá danh mục đang có sản phẩm** → các sản phẩm đó **trở thành không có danh mục**, không bị xoá theo | Cần cảnh báo nêu rõ hệ quả này | FR-26 |
| **Danh mục phẳng: không đặt được danh mục cha** | Không có cây trong UI | FR-26, GLO |
| Sản phẩm **không thuộc danh mục nào** vẫn tìm kiếm được và vẫn xuất hiện ở "tất cả sản phẩm" | | FR-1 |
| Điều chỉnh tồn kho: số nguyên **≥ 0**; số âm bị từ chối. Điều chỉnh xuống thấp hơn số đã bán vẫn được, miễn kết quả ≥ 0 | | FR-27 |
| Mỗi thay đổi tồn kho ghi: sản phẩm, giá trị trước, giá trị sau, **nguyên nhân** (`order_placed` \| `order_cancelled` \| `manual_adjustment`), mã đơn nếu có, thời điểm, tài khoản | Nguồn dữ liệu nếu UX quyết định có màn hình sổ cái | FR-27 |
| Sản phẩm không tồn tại → **HTTP 404** | | FR-4 |

---

## 9. Thuật ngữ chuẩn phải dùng nguyên văn

**Nguồn: `docs/baseline/glossary.md` (mục "Domain terms — Shop Online"), đối chiếu PRD §3.**

> PRD §3: "Mọi FR, UJ, SM dùng đúng các từ này; **đưa từ đồng nghĩa vào bất cứ đâu trong PRD
> là vi phạm kỷ luật tài liệu**." CLAUDE.md §4 áp cùng quy tắc cho tài liệu UX.

| Dùng (VI) | English | **KHÔNG được dùng** |
|---|---|---|
| **Sản phẩm** | Product | "item", "SKU", "mặt hàng", "hàng hoá" |
| **Danh mục** | Category | "tag", "collection", "nhóm hàng", "ngành hàng" |
| **Tồn kho** | Stock | "inventory", "quantity on hand", "số lượng", "hàng tồn" |
| **Giỏ hàng** | Cart | "basket", "giỏ" |
| **Dòng giỏ hàng** | Cart line | "cart item", "món trong giỏ" |
| **Đơn hàng** | Order | "purchase", "transaction", "đơn" |
| **Dòng đơn hàng** | Order line | "order item", "line item", "dòng hàng" |
| **Trạng thái đơn hàng** | Order status | "order state", "tình trạng đơn", **bất kỳ tên trạng thái nào ngoài** `placed`/`confirmed`/`shipped`/`delivered`/`cancelled` |
| **Ngừng bán** | Discontinued | "deleted", "archived", "inactive", "xoá sản phẩm", "ẩn sản phẩm" |
| **Phí giao hàng** | Shipping fee | "delivery charge", **"phí ship"**, "phí vận chuyển", "cước" |
| **Tổng tiền hàng** | Line subtotal | "subtotal", **"tạm tính"**, "tiền hàng" |
| **Tổng tiền đơn** | Order total | "grand total", **"tổng cộng"**, "thành tiền" |
| **Phương thức thanh toán** | Payment method | "payment type", "hình thức thanh toán", bất kỳ phương thức thứ ba nào |
| **Xác nhận thanh toán** | Payment confirmation | "payment received", "payment verification", "xác nhận chuyển khoản" |
| **Khách chưa đăng ký** | Guest | "anonymous user", "visitor", "khách vãng lai", **"khách" trần** |
| **Khách hàng** | Customer | "user", "buyer", "member", **"khách" trần** |
| **Chủ shop** | Shop owner | "admin", "seller", "merchant", "quản trị viên", "nhân viên" |
| **Địa chỉ giao hàng** | Delivery address | "shipping address", "địa chỉ nhận hàng", "thông tin giao hàng" |
| **Ẩn danh hoá** | Anonymisation | "PII scrubbing", "data deletion", "xoá dữ liệu", "ẩn dữ liệu" |

**Cảnh báo từ glossary:** ba dòng *Chủ shop* (Q4), *Khách hàng* (Q5), *Ẩn danh hoá* (Q3) "encode
a decision that is still blocking at §11.1… **Do not treat a glossary row as ratification.**"

**Nhãn UI được PRD đặt tên trực tiếp (dùng nguyên văn):** "Còn hàng", "Hết hàng" (FR-5).

**Thuật ngữ UX cần mà glossary chưa có** (CLAUDE.md §4: phải hỏi, không được tự đặt):
storefront / mặt tiền cửa hàng · back office · tường đăng ký · đặt đơn (checkout) · xác nhận đơn.
PRD dùng "mặt tiền cửa hàng" (§7.1), "back office" (§4.9, §4.10), "tường đăng ký" (§4.4) nhưng
**không có dòng nào trong glossary**.

---

## 10. Khoảng trống UX — câu hỏi PRD để ngỏ mà UX buộc phải chốt

**Nguồn: PRD §11 Câu hỏi mở, PRD §12 Chỉ mục giả định, ADD §5, ADD §6.**

### 10.1 PRD giao đích danh cho phase UX

| # | Khoảng trống | Nguồn |
|---|---|---|
| G1 | **Desktop-first so với thực tế khách hàng.** "Brief nói khách đến từ Facebook/Zalo — gần như chắc chắn là điện thoại. Phiên này chọn desktop-first. **Phase UX nên xem lại độ vênh này.**" ADD §5: "Back office rõ ràng là desktop; storefront thì đáng cân nhắc lại. **Phase UX quyết định.**" | PRD §11.2 **Q7** · ADD §5 |
| G2 | **Màn hình đơn bị từ chối vì hết hàng (FR-14)** — ADD §5 gọi đây là "**khoảnh khắc UX nặng nhất trong sản phẩm**". Yêu cầu: nói rõ dòng nào không đủ, giữ nguyên phần còn lại của giỏ, "không làm khách cảm thấy mình vừa mất công vô ích". "Thiết kế màn hình này chính là **phần lớn giá trị** của việc chống bán quá tồn kho." PRD **không** mô tả bố cục, hành động tiếp theo, hay copy. | ADD §5 · FR-14 |
| G3 | **Các phương án đã bị loại — UX không được đề xuất lại** (ADD §4 gửi đích danh cho "kiến trúc **và UX spec** — để không ai đề xuất lại chúng ở review"): giữ chỗ tồn kho trong giỏ · trạng thái `awaiting_customer_approval` cho việc duyệt phí giao hàng · đảo ngược `delivered` · sổ địa chỉ của khách hàng · danh mục phân cấp nhiều tầng. | ADD §4 |

### 10.2 Câu hỏi §11.1 **chặn** baseline, ảnh hưởng trực tiếp tới UX

| # | Khoảng trống | Nguồn |
|---|---|---|
| G4 | **Định danh đăng nhập: số điện thoại hay email?** FR-9 giả định số điện thoại. Quyết định trực tiếp form đăng ký/đăng nhập. `[CHẶN]` | PRD §11.1 **Q9** · §12 |
| G5 | **Khôi phục mật khẩu — chưa có FR nào.** Ba phương án ở ADD §6, "không cái nào hiển nhiên": (a) chủ shop đặt lại qua back office — thêm quyền vào ma trận đã đóng băng; (b) không có khôi phục ở v1 — mất mật khẩu thì tạo tài khoản mới và **mất lịch sử đơn**; (c) đưa một kênh gửi vào phạm vi — phá ràng buộc PRD §6. Quyết định này tạo ra hoặc xoá bỏ cả một surface. | PRD §11.1 **Q10** · ADD §6 |
| G6 | **Quyền khách hàng tự huỷ đơn (FR-17)** — dòng mới, không có trong discovery, chờ xác nhận. Nếu bị bác, nút huỷ biến mất khỏi lịch sử đơn và UJ-5 sụp. | PRD §11.1 **Q5** · §4.6 `[NOTE FOR PM]` |
| G7 | **Chủ shop đặt đơn hộ khách (Q4) + chủ shop có cần giỏ hàng không (Q12)** — hai câu đi cùng nhau. Nếu Q4 = "có", ô "thêm vào giỏ" của chủ shop quay lại ✓ và back office cần **một luồng đặt đơn hoàn toàn mới**. | PRD §11.1 **Q4** · §11.2 **Q12** · §5 |
| G8 | **Chính sách ẩn danh hoá 12 tháng** — chưa có tư vấn pháp lý. Ảnh hưởng hiển thị đơn cũ trong lịch sử đơn và back office sau khi bị ẩn danh hoá: **PRD không nêu UI trình bày đơn đã ẩn danh hoá ra sao.** `[CHẶN]` | PRD §11.1 **Q3** · §9.3 |

### 10.3 Khoảng trống PRD nêu nhưng để ngỏ hệ quả UX

| # | Khoảng trống | Nguồn |
|---|---|---|
| G9 | **Không có thông báo, nhưng phí giao hàng thay đổi sau khi đặt.** "Khách hàng chỉ biết phí nếu **tự mở lại ứng dụng**… Trên thực tế chủ shop sẽ vẫn nhắn Zalo — tức là **vẫn còn một mảnh của quy trình cũ sống ngoài hệ thống**. Chấp nhận được ở v1?" UX phải thiết kế cho một khách hàng **không được báo** khi tổng tiền đổi. | PRD §11.2 **Q8** · FR-21 |
| G10 | **Đơn chuyển khoản đã trả tiền thì kẹt vĩnh viễn** (FR-24). "Khách chuyển khoản rồi đổi ý thì đơn **chỉ còn một đường là đi tới `delivered`**, và chủ shop xử lý ngoài hệ thống." FR-24 yêu cầu "giao diện nói rõ điều này **trước** khi chủ shop xác nhận thanh toán" nhưng **không nêu nói gì với khách hàng** trong tình huống đó. | PRD §11.2 **Q11** · FR-24 |
| G11 | **Cấu hình thông tin ngân hàng của shop** (FR-23 `[ASSUMPTION]`: "discovery không nêu **nơi cấu hình**"). ADD §5 **không liệt kê surface này** → UX phải chốt nó nằm ở đâu trong back office. | FR-23 · ADD §5 |
| G12 | **Đổi mật khẩu chủ shop** (FR-33) — có yêu cầu, **không có surface** trong ADD §5. | FR-33 · ADD §5 |
| G13 | **Có màn hình đọc sổ cái tồn kho không?** FR-27 yêu cầu ghi vết đầy đủ và FR-30 yêu cầu hiển thị lịch sử trạng thái đơn, nhưng **PRD không nêu** chủ shop xem lịch sử thay đổi tồn kho của một sản phẩm ở đâu — dù JTBD "nhìn một con số tồn kho và tin được nó" và NFR "khi con số sai, phải trả lời được *sai từ lúc nào và do đâu*" (PRD §8) đều hàm ý cần. | FR-27 · PRD §8 |

### 10.4 Khoảng trống PRD hoàn toàn im lặng

| # | Khoảng trống | Ghi chú |
|---|---|---|
| G14 | **Accessibility** — PRD không nêu bất kỳ yêu cầu nào (WCAG, contrast, keyboard, screen reader). |
| G15 | **Design system / thư viện UI / token** — PRD không nêu. PRD §9.1: "Không có ràng buộc công nghệ nào." |
| G16 | **Breakpoint, kích thước màn hình, trình duyệt hỗ trợ** — PRD không nêu. |
| G17 | **Thương hiệu, logo, bảng màu, typography, tên shop** — PRD không nêu ở bất kỳ đâu. |
| G18 | **Trang lỗi, trạng thái rỗng (ngoài "0 kết quả tìm kiếm" ở FR-2), trạng thái tải** — PRD chỉ nêu FR-2 (danh sách rỗng + thông báo) và FR-4/FR-32 (HTTP 404). Phần còn lại không nêu. |
| G19 | **Điều hướng toàn cục / header / footer của storefront và back office** — ADD §5 liệt kê bề mặt nhưng **không nêu cấu trúc điều hướng giữa chúng**. |
| G20 | **In đơn hàng, xuất dữ liệu** — PRD không nêu; "Dashboard phân tích, báo cáo" thì ngoài phạm vi (§7.2). |

---

## Phụ lục — những gì UX **không** được thiết kế (PRD §7.2 Ngoài phạm vi MVP)

Cổng thanh toán (VNPay/MoMo/ZaloPay) · tích hợp hãng vận chuyển, theo dõi vận đơn · **email và
SMS thông báo** · khuyến mãi, voucher, mã giảm giá, tích điểm · đánh giá và xếp hạng sản phẩm ·
gợi ý, cá nhân hoá · nhiều người bán / tính năng sàn · B2B (giá hợp đồng, công nợ, báo giá) ·
nhiều kho, nhiều loại tiền tệ · quy trình trả hàng và hoàn tiền · **ứng dụng di động** ·
dashboard phân tích, báo cáo · **ngôn ngữ ngoài tiếng Việt** · **biến thể sản phẩm** (size/màu) ·
tài khoản nhân viên, phân quyền nội bộ.

Ngoài phạm vi của riêng FR-2: tìm theo mô tả, tìm mờ (fuzzy), **gợi ý khi gõ**, xếp hạng theo độ
liên quan. Ngoài phạm vi của riêng FR-14: giữ chỗ tồn kho, đặt trước hàng chưa về, danh sách chờ.
