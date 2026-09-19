---
title: "PRD: Shop Online"
status: curated
created: 2026-09-18
updated: 2026-09-19
curated_from: 'planning-artifacts/prds/prd-sdd-framework-demo-2026-09-18/prd.md'
curated_at: '2026-09-19'
curated_by: 'Claude Opus 5, theo chỉ đạo của Tuan Nguyen'
---

# PRD: Shop Online

## 0. Mục đích tài liệu

PRD này dành cho người quyết định (Tuan Nguyen), cho `bmad-architecture`, và cho Spec Kit — nơi nó thành đầu vào của `/speckit-specify`.

**Ba quy ước cần biết trước khi đọc:**

- **FR-1…FR-35 đánh số toàn cục** và giữ nguyên số kể cả khi §4 được sắp xếp lại, để artifact hạ nguồn tham chiếu ổn định. Bảng tra FR theo tính năng ở §7.1. **Các FR trỏ ngược về** hành trình UJ-1…UJ-6 (§2.3) ở những chỗ mạch truy vết có ý nghĩa, không phải ở mọi FR.
- **`[ASSUMPTION]` là suy đoán của tài liệu này**, không phải điều discovery đã chốt. Danh sách đầy đủ ở §12.
- **Đây là bản đã curate (A6).** Bản nháp BMAD nằm ở `planning-artifacts/prds/prd-sdd-framework-demo-2026-09-18/`, cùng `addendum.md`, `review-rubric.md` và `.memlog.md`. Khác biệt so với bản nháp liệt kê ở §0.1. A7 (đóng băng) chưa chạy.

Nguồn đầu vào: `docs/discovery/README.md` (A0, chấp nhận 2026-09-18) và `product-brief.md`. Tài liệu này **xây trên** chúng, không lặp lại. Chiều sâu thuộc về tài liệu hạ nguồn nằm ở `addendum.md`.

### 0.1 Nhật ký curation

Bản nháp BMAD giữ nguyên, trừ những thay đổi dưới đây — tất cả đều là quyết định của
người quyết định phạm vi (Tuan Nguyen) ghi nhận ngày 2026-09-19, hoặc hệ quả trực tiếp của chúng.

| Mục | Thay đổi | Nguồn |
|---|---|---|
| §4.4 FR-9 | Định danh đăng nhập chốt là **email**; gỡ `[ASSUMPTION]` | Q9 |
| §4.4 FR-34 | **FR mới** — chủ shop đặt lại mật khẩu khách hàng | Q10 |
| §4.10 FR-35 | **FR mới** — ẩn danh hoá đơn theo yêu cầu của khách | Q3b |
| §5 | Ma trận quyền 15 → **17 dòng** (FR-34, FR-35) | Q10, Q3b |
| §9.1, §9.3 | `NĐ 13/2023/NĐ-CP` → `Luật 91/2025/QH15` + `NĐ 356/2025/NĐ-CP` | Kiểm chứng 2026-09-19 |
| §9.3 | Gỡ `[ASSUMPTION]`; mốc 12 tháng được chốt; thêm đường xoá theo yêu cầu | Q3a, Q3b |
| §11.1 | Năm câu chặn đã đóng | Q3, Q4, Q5, Q9, Q10 |
| §12 | Gỡ các giả định đã thành quyết định | — |

**Chưa giải quyết, cố ý:** ba xung đột mà `architecture.md` nêu ra vẫn còn — FR-8 so với
quyết định giỏ hàng ở `localStorage`, `verification.md` không chạy tới code sản phẩm, và
`account.email` nằm ngoài phạm vi ẩn danh hoá. Xem mục Deferred của `architecture.md`.

## 1. Tầm nhìn

Shop Online là một cửa hàng trực tuyến cho một shop bán lẻ một chủ, làm đúng một việc: để khách hàng duyệt hàng và đặt đơn hoàn chỉnh mà **không cần ai trả lời**.

**Cam kết thiết kế quan trọng nhất: tồn kho chính xác tại thời điểm đặt đơn.** Không phải "rồi sẽ đúng", không phải sau một lần đồng bộ ban đêm. Hệ thống phải từ chối bán quá tồn kho, vì bán quá tồn kho chính là thất bại đang làm shop mất khách. Nếu chỉ một yêu cầu trong tài liệu này được giữ khi mọi thứ khác phải cắt, đó là **FR-14**.

Cam kết đó xuất phát từ một chỗ nghẽn cụ thể: hôm nay chủ shop nằm trên đường găng của từng đơn hàng. Khách nhắn lúc 10 giờ đêm, không có gì xảy ra cho tới khi chủ shop đọc tin; mỗi đơn được chép tay ít nhất một lần, và mỗi lần chép là một cơ hội làm mất nó. Bỏ con người ra khỏi khâu nhận đơn tạo ra thứ mà bảng tính không bao giờ tạo được: **một hệ thống ghi nhận duy nhất, do chính giao dịch viết ra** thay vì được gõ lại sau đó. Từ đó mới có con số tồn kho đáng tin, và từ tồn kho đáng tin mới hết chuyện bán món hàng đã không còn.

Phiên bản đầu cố ý dừng trước những thứ làm dự án thương mại điện tử trở nên đắt đỏ: không cổng thanh toán, không tích hợp hãng vận chuyển, không khuyến mãi, không đánh giá sản phẩm. Thanh toán là COD hoặc chuyển khoản do chủ shop xác nhận tay — đúng cách shop này đang được trả tiền. Phạm vi nhỏ không phải vì sản phẩm nhỏ; nhỏ vì baseline phải đúng trước khi có bất cứ thứ gì được xây lên trên nó.

## 2. Người dùng mục tiêu

### 2.1 Jobs To Be Done

**Chủ shop**
- Nhận đơn hàng mà không phải có mặt — "một buổi tối mà đơn vẫn về và không có gì cần trả lời".
- Nhìn một con số tồn kho và tin được nó, thay vì kiểm tra lại bằng trí nhớ.
- Có một nơi duy nhất mọi đơn hàng đều nằm ở đó, không phải ba nơi.
- Không phải xin lỗi khách hàng vì bán món hàng đã hết.

**Khách hàng**
- Đặt hàng vào giờ hợp với mình, không phải chờ ai rảnh trả lời.
- Biết món hàng còn hay hết **trước khi** bỏ công đặt, không phải sau.
- Xem lại mình đã đặt gì, khi nào, tình trạng ra sao — không phải cuộn lại lịch sử chat.

**Khách chưa đăng ký**
- Xem hàng và so giá mà không phải khai gì về mình.

### 2.2 Không phải người dùng của v1

- **Nhân viên của shop.** Không có tài khoản phụ, không có phân quyền theo vai trò nội bộ. Một chủ, một shop.
- **Người bán thứ hai.** Không phải sàn thương mại điện tử: không onboarding người bán, không tách giỏ theo shop, không tính hoa hồng, không đối soát nhiều bên.
- **Khách doanh nghiệp (B2B).** Không giá theo hợp đồng, không hạn mức công nợ, không báo giá.
- **Khách không nói tiếng Việt.** Chỉ tiếng Việt trong v1.

### 2.3 Hành trình người dùng

> **UJ-1. Chị Hằng đặt đơn lúc 10 giờ đêm, không nhắn tin cho ai.**
> Chị Hằng, đã mua ở shop này vài lần qua Zalo, thấy một bài đăng và mở link. Chưa đăng nhập. Chị duyệt danh mục, mở trang sản phẩm, thấy giá và dòng "Còn hàng", thêm vào giỏ. Bấm đặt hàng — hệ thống yêu cầu đăng ký. Chị đăng ký bằng số điện thoại, giỏ hàng vẫn còn nguyên. Nhập địa chỉ giao, chọn **COD**, xác nhận. Màn hình hiện mã đơn và trạng thái `placed`. Chị đóng máy đi ngủ; không ai phải trả lời gì. **Giá trị đến ở khoảnh khắc** đơn hàng có mã và trạng thái — nó đã tồn tại trong hệ thống, không phải là một tin nhắn chờ người đọc.
> **Trường hợp biên:** món hàng vừa hết giữa lúc chị đang ở màn hình thanh toán → xem UJ-6.

> **UJ-2. Anh Minh xem hết hàng rồi mới chịu khai tên.**
> Anh Minh chưa từng mua ở đây, đến từ một bài Facebook. Là khách chưa đăng ký. Anh tìm "bình giữ nhiệt", lọc theo danh mục, mở ba sản phẩm, bỏ hai món vào giỏ. Không có màn hình nào chặn anh cho tới lúc này — duyệt hàng không tốn gì thì không đòi gì. Khi bấm đặt hàng, tường đăng ký mới hiện ra. Anh đăng ký; **hai món trong giỏ đi tiếp cùng anh, không mất gì** (FR-8). Anh đặt đơn.
> **Trường hợp biên đã biến mất:** giỏ sống trong trình duyệt chứ không gắn với tài khoản (`architecture.md` AD-17), nên không tồn tại "tài khoản đã có sẵn giỏ". Cái giá: anh mở lại trên điện thoại thì giỏ không theo sang.

> **UJ-3. Chị Lan mở back office lúc 7 giờ sáng và xử lý đêm qua trong mười phút.**
> Chị Lan là chủ shop, làm một mình. Đăng nhập back office trên máy tính, thấy danh sách đơn `placed` từ đêm. Với đơn của chị Hằng, chị **nhập phí giao hàng** cho khu vực đó (FR-20) — đơn vẫn ở `placed`, tổng tiền cập nhật, và chị Hằng vẫn còn quyền huỷ. Chị nhắn cho khách hàng qua Zalo xác nhận phí, rồi mới bấm `confirmed`. Tồn kho đã bị trừ từ lúc đơn được đặt, nên không có gì phải đối chiếu.
> **Giá trị đến khi** chị đóng danh sách và không còn đơn nào ở `placed` — buổi sáng kết thúc, không có bảng tính nào được mở.

> **UJ-4. Chị Lan đối chiếu một khoản chuyển khoản.**
> Một đơn chọn **chuyển khoản**. Đơn ở `placed`, và nút chuyển sang `confirmed` **bị khoá** (FR-24). Chị mở app ngân hàng, thấy tiền về đúng số và đúng nội dung, quay lại back office và đánh dấu **đã nhận thanh toán**. Chỉ khi đó nút `confirmed` mới mở. Hệ thống không biết gì về ngân hàng — nó chỉ ghi lại việc chị đã xác nhận, và ai đã xác nhận.
> **Trường hợp biên:** tiền không bao giờ về. Đơn nằm ở `placed` cho tới khi chị huỷ nó; huỷ thì tồn kho được hoàn lại (FR-18).

> **UJ-5. Chị Hằng đổi ý trước khi đơn được xác nhận.**
> Sáng hôm sau chị Hằng mở lịch sử đơn, thấy đơn vẫn ở `placed` và phí giao hàng cao hơn chị nghĩ. Chị bấm **huỷ đơn** (FR-17). Đơn chuyển sang `cancelled`, **tồn kho hoàn lại ngay** (FR-18), và chị không phải nhắn cho ai. Nếu đơn đã ở `confirmed`, nút huỷ không còn — chị phải liên hệ chủ shop, và đó là điều màn hình nói rõ chứ không phải điều chị phải đoán.

> **UJ-6. Hai khách hàng cùng nhắm món cuối cùng — hành trình mà cả sản phẩm này tồn tại vì nó.**
> Còn đúng 1 cái trên kệ. Chị Hằng và anh Minh cùng ở màn hình thanh toán, cùng có món đó trong giỏ — giỏ hàng **không giữ chỗ** tồn kho (FR-7), nên tới đây chưa có gì sai. Cả hai bấm đặt đơn cách nhau chưa tới một giây. Một người nhận mã đơn. Người kia nhận một thông báo cụ thể: món này vừa hết, dòng hàng nào trong giỏ bị ảnh hưởng, giỏ còn lại gì. **Không có đơn thứ hai nào được tạo ra.**
> Đây là FR-14, và nó là lý do "tồn kho chính xác tại thời điểm đặt đơn" là cam kết chứ không phải nguyện vọng.

## 3. Thuật ngữ

> Các thuật ngữ quy trình SDD (Track A/B/C, baseline, handoff contract…) đã có trong
> `docs/baseline/glossary.md`. Mục này bổ sung **thuật ngữ nghiệp vụ**. Ở bước đóng băng
> baseline, chúng phải được chép xuống dưới dòng `<!-- Add project-specific domain terms -->`
> trong file đó. Mọi FR, UJ, SM dùng đúng các từ này; đưa từ đồng nghĩa vào bất cứ đâu
> trong PRD là vi phạm kỷ luật tài liệu.

| Thuật ngữ | English | Định nghĩa |
|---|---|---|
| **Sản phẩm** | Product | Một món hàng bán được. Có đúng **một** giá và **một** con số tồn kho. Không có biến thể. Thuộc 0..1 danh mục. |
| **Danh mục** | Category | Nhóm phẳng dùng để duyệt sản phẩm. Không phân cấp nhiều tầng trong v1. Chứa 0..n sản phẩm. |
| **Tồn kho** | Stock | Số nguyên ≥ 0 gắn với một sản phẩm: số lượng có thể bán được ngay. Chỉ thay đổi qua đặt đơn, huỷ đơn, hoặc điều chỉnh của chủ shop. |
| **Giỏ hàng** | Cart | Tập các dòng giỏ hàng thuộc về một phiên (khách chưa đăng ký) hoặc một khách hàng. Không giữ chỗ tồn kho. |
| **Dòng giỏ hàng** | Cart line | Một cặp (sản phẩm, số lượng) trong giỏ hàng. |
| **Đơn hàng** | Order | Bản ghi bất biến của một lần mua: các dòng đơn hàng, địa chỉ giao, phương thức thanh toán, phí giao hàng, tổng tiền, trạng thái. Thuộc về đúng một khách hàng. |
| **Dòng đơn hàng** | Order line | Một cặp (sản phẩm, số lượng, **giá tại thời điểm đặt**) trong đơn hàng. Giá được sao chép, không tham chiếu — đổi giá sản phẩm không đổi đơn cũ. |
| **Trạng thái đơn hàng** | Order status | Một trong: `placed`, `confirmed`, `shipped`, `delivered`, `cancelled`. Xem §4.6. |
| **Ngừng bán** | Discontinued | Trạng thái của một sản phẩm không còn được bán nhưng vẫn tồn tại để các đơn hàng cũ đọc được. Không hiện khi duyệt hay tìm kiếm, không thêm vào giỏ được. Không phải xoá. |
| **Phí giao hàng** | Shipping fee | Số tiền do chủ shop nhập tay cho từng đơn. Mặc định 0. Cộng vào tổng tiền đơn. |
| **Tổng tiền hàng** | Line subtotal | Tổng của (giá × số lượng) trên mọi dòng đơn hàng, hoặc trên mọi dòng giỏ hàng. Chưa gồm phí giao hàng. |
| **Tổng tiền đơn** | Order total | Tổng tiền hàng + phí giao hàng. VND, đã gồm VAT. |
| **Phương thức thanh toán** | Payment method | `cod` hoặc `bank_transfer`. Không có giá trị thứ ba trong v1. |
| **Xác nhận thanh toán** | Payment confirmation | Hành động chủ shop đánh dấu đã nhận tiền chuyển khoản. Chỉ áp dụng cho `bank_transfer`. |
| **Khách chưa đăng ký** | Guest | Người dùng không có phiên đăng nhập. Duyệt và thêm vào giỏ được; đặt đơn thì không. |
| **Khách hàng** | Customer | Người dùng đã đăng ký và đăng nhập. Đặt đơn và xem lịch sử đơn của **chính mình**. |
| **Chủ shop** | Shop owner | Tài khoản quản trị duy nhất. Quản lý sản phẩm, tồn kho, đơn hàng. **Không đặt đơn được.** |
| **Địa chỉ giao hàng** | Delivery address | Tên người nhận, số điện thoại, địa chỉ. Nhập cho từng đơn, sao chép vào đơn. Là dữ liệu cá nhân theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15. |
| **Ẩn danh hoá** | Anonymisation | Xoá không hồi phục tên, số điện thoại, địa chỉ khỏi một đơn hàng, giữ lại phần còn lại. Xem §9.3. |

## 4. Tính năng

### 4.1 Danh mục và tìm kiếm

**Mô tả.** Mặt tiền cửa hàng công khai. Bất kỳ ai — kể cả khách chưa đăng ký — đều duyệt danh mục và tìm sản phẩm được, không có màn hình nào chặn. Danh mục phẳng: một cấp, không cây nhiều tầng. Tìm kiếm chạy trên tên sản phẩm. Thực hiện UJ-1, UJ-2.

**Yêu cầu chức năng:**

#### FR-1: Duyệt sản phẩm theo danh mục

Khách chưa đăng ký, khách hàng và chủ shop đều xem được danh sách sản phẩm của một danh mục, không cần đăng nhập. Thực hiện UJ-1, UJ-2.

**Hệ quả kiểm chứng được:**
- Danh sách danh mục hiển thị mọi danh mục hiện có. Danh mục không có trạng thái bật/tắt — nó tồn tại hoặc bị xoá (FR-26).
- Chọn một danh mục trả về đúng các sản phẩm thuộc danh mục đó, không gồm sản phẩm của danh mục khác.
- Sản phẩm không thuộc danh mục nào vẫn tìm kiếm được, và vẫn xuất hiện ở danh sách "tất cả sản phẩm".
- Truy cập không có phiên đăng nhập trả về HTTP 200, không phải chuyển hướng đăng nhập.

#### FR-2: Tìm kiếm sản phẩm theo tên

Bất kỳ người dùng nào cũng tìm sản phẩm bằng một chuỗi ký tự khớp với tên sản phẩm.

**Hệ quả kiểm chứng được:**
- Tìm "bình giữ nhiệt" trả về đúng và chỉ các sản phẩm có tên chứa cụm đó.
- Tìm **không dấu** trả về kết quả có dấu: "binh giu nhiet" khớp "Bình giữ nhiệt". `[ASSUMPTION: discovery không nêu yêu cầu bỏ dấu; đây là kỳ vọng mặc định của người dùng Việt Nam.]`
- Chữ hoa/thường không ảnh hưởng kết quả.
- Không có kết quả → trả về danh sách rỗng kèm thông báo, không phải lỗi.

**Ngoài phạm vi FR này:** tìm theo mô tả, tìm mờ (fuzzy), gợi ý khi gõ, xếp hạng theo độ liên quan.

#### FR-3: Phân trang danh sách sản phẩm

Danh sách sản phẩm được phân trang để đạt ngưỡng hiệu năng ở §8 tại quy mô 20.000 sản phẩm.

**Hệ quả kiểm chứng được:**
- Không có phản hồi API danh sách nào trả về toàn bộ danh mục sản phẩm trong một lần.
- Kích thước trang mặc định **24 sản phẩm**; trần **100**. Yêu cầu kích thước lớn hơn 100 được xử lý như 100, không trả lỗi. `[ASSUMPTION: hai con số này do PRD đặt ra để hệ quả kiểm chứng được bằng số thay vì bằng tính từ; discovery không nêu.]`
- Với 20.000 sản phẩm, mọi trang đều đạt ngưỡng p95 ≤ 400 ms ở §8.

---

### 4.2 Trang sản phẩm và hiển thị tồn kho

**Mô tả.** Trang sản phẩm phải trả lời được hai câu trước khi khách bỏ công: giá bao nhiêu, và **còn hàng không**. Sản phẩm hết hàng không bị ẩn — ẩn đi thì khách tưởng shop không bán món đó; hiện ra và nói rõ đã hết thì khách biết quay lại. Thực hiện UJ-1, UJ-2.

**Yêu cầu chức năng:**

#### FR-4: Xem chi tiết sản phẩm

Bất kỳ người dùng nào cũng mở được trang chi tiết một sản phẩm và thấy tên, mô tả, giá, ảnh và tình trạng tồn kho.

**Hệ quả kiểm chứng được:**
- Giá hiển thị bằng VND, đã gồm VAT, không có dòng thuế tách riêng.
- Trang hiển thị ít nhất một ảnh (FR-28 bảo đảm luôn có ít nhất một).
- Sản phẩm không tồn tại trả về HTTP 404.

#### FR-5: Hiển thị tình trạng tồn kho

Trang sản phẩm cho biết sản phẩm còn bán được hay không tại thời điểm dựng trang.

**Hệ quả kiểm chứng được:**
- Tồn kho > 0 → hiện "Còn hàng" và cho phép thêm vào giỏ.
- Tồn kho = 0 → hiện "Hết hàng"; nút thêm vào giỏ bị vô hiệu hoá và API thêm vào giỏ từ chối. `[ASSUMPTION: discovery không nói sản phẩm hết hàng được xử lý thế nào; đây là quyết định của PRD này.]`
- Tình trạng được đọc trực tiếp từ con số tồn kho hiện tại tại thời điểm dựng trang. Tình trạng tồn kho **không được cache**; nếu tầng nào đó cache trang sản phẩm, phần tình trạng tồn kho phải nằm ngoài phần được cache.
- Trang **không** hiển thị con số tồn kho chính xác cho khách chưa đăng ký và khách hàng — chỉ còn/hết. `[ASSUMPTION: số lượng tồn chính xác là thông tin kinh doanh; discovery không yêu cầu công khai.]`

---

### 4.3 Giỏ hàng

**Mô tả.** Giỏ hàng là bản nháp, không phải lời hứa. Nó **không giữ chỗ** tồn kho — đó là lựa chọn có chủ ý: giữ chỗ trong giỏ sẽ khoá hàng cho những giỏ bị bỏ quên, và đẩy bài toán sang việc phải hết hạn giữ chỗ. Cam kết của sản phẩm là tồn kho đúng **tại thời điểm đặt đơn** (FR-14), không phải tại thời điểm thêm vào giỏ. Thực hiện UJ-2, UJ-6.

**Yêu cầu chức năng:**

#### FR-6: Quản lý dòng giỏ hàng

Khách chưa đăng ký và khách hàng thêm sản phẩm vào giỏ, đổi số lượng, và xoá dòng giỏ hàng.

**Hệ quả kiểm chứng được:**
- Thêm một sản phẩm đã có trong giỏ làm tăng số lượng dòng đó, không tạo dòng thứ hai.
- Đặt số lượng về 0 tương đương xoá dòng.
- Số lượng âm hoặc không phải số nguyên bị từ chối.
- **Số lượng vượt tồn kho hiện tại được phép** — giỏ hàng không giữ chỗ (FR-7) nên nó cũng không phán xét; việc kiểm tra thuộc về FR-14. Nhưng giỏ **phải đánh dấu đúng những dòng** đang vượt tồn kho, nêu rõ số lượng còn bán được.
- Giỏ hiển thị tổng tiền hàng; **chưa** gồm phí giao hàng (phí chỉ tồn tại sau khi đơn được đặt — FR-20).

**Sản phẩm thay đổi khi đang nằm trong giỏ:**
- Giá sản phẩm đổi → dòng giỏ hàng dùng **giá hiện tại**, không phải giá lúc thêm vào. Giỏ hàng không chốt giá; chỉ đơn hàng mới chốt (FR-14).
- Sản phẩm bị **ngừng bán** (FR-25) → dòng giỏ hàng vẫn hiển thị nhưng được đánh dấu không mua được, và FR-14 từ chối đơn có dòng đó. Dòng không tự biến mất — im lặng xoá đồ khỏi giỏ của khách còn tệ hơn.
- Sản phẩm về tồn kho 0 → như trên: hiển thị, đánh dấu, FR-14 từ chối.

#### FR-7: Giỏ hàng không giữ chỗ tồn kho

Thêm sản phẩm vào giỏ không làm thay đổi tồn kho của sản phẩm đó. Thực hiện UJ-6.

**Hệ quả kiểm chứng được:**
- Sau khi thêm vào giỏ, tồn kho của sản phẩm bằng đúng giá trị trước đó.
- Hai giỏ hàng khác nhau chứa cùng một sản phẩm khi tồn kho chỉ còn 1 — cả hai thao tác thêm vào giỏ đều thành công.
- Giỏ hàng không có thời hạn hết hạn liên quan tới tồn kho.

#### FR-8: Giỏ của khách chưa đăng ký sống sót qua lần đăng nhập

Giỏ hàng sống trong trình duyệt và tồn tại qua các lần tải trang. Khi khách chưa đăng ký đăng ký hoặc đăng nhập, giỏ đang có **đi tiếp cùng họ** — không bị xoá, không bị thay bằng giỏ khác. Thực hiện UJ-2.

**Hệ quả kiểm chứng được:**
- Giỏ còn nguyên sau khi tải lại trang.
- Đăng ký với một giỏ đang có hàng → sau khi đăng ký, giỏ vẫn chứa đúng các dòng đó, đúng số lượng.
- Đăng nhập với một giỏ đang có hàng → sau khi đăng nhập, giỏ vẫn chứa đúng các dòng đó.
- Đăng xuất **không** xoá giỏ.

> **NOTE FOR PM.** Bản nháp đặt tên FR này là "được **gộp** khi đăng nhập" và mô tả việc hợp nhất hai giỏ. Kiến trúc chốt giỏ sống hoàn toàn ở `localStorage` (`architecture.md` AD-17), nên **không tồn tại giỏ thứ hai phía máy chủ để gộp vào** — "hai giỏ được gộp" là một tiêu chí nghiệm thu không bao giờ chạy được, và một AC rỗng nằm trong baseline đã đóng băng còn tệ hơn một AC bị xoá.
>
> **Hai hệ quả đã được chấp nhận có ý thức:** khách hàng **mất giỏ khi đổi thiết bị hoặc xoá dữ liệu trình duyệt**, và tình huống "đăng nhập vào tài khoản đã có sẵn giỏ" **không còn tồn tại**. Đổi lại: không bảng giỏ hàng nào phía máy chủ, và không dòng dữ liệu nào được tạo cho khách chưa đăng ký — đúng tinh thần §9.2.

---

### 4.4 Tài khoản

**Mô tả.** Tường đăng ký nằm giữa giỏ hàng và đặt đơn, cố ý đặt muộn: duyệt hàng không tốn gì nên không đòi hỏi gì. Chỉ thu thập những gì việc giao hàng thực sự cần — đây là ràng buộc của Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, không phải lựa chọn thẩm mỹ. Tài khoản chủ shop cũng nằm ở đây (FR-33) vì nó là một quyết định về tài khoản, dù thuộc về phía back office. Thực hiện UJ-1, UJ-2.

**Yêu cầu chức năng:**

#### FR-9: Đăng ký khách hàng

Khách chưa đăng ký tự tạo được tài khoản khách hàng, không cần chủ shop can thiệp.

**Hệ quả kiểm chứng được:**
- Đăng ký chỉ yêu cầu **email** và mật khẩu. Email là định danh đăng nhập — quyết định của người quyết định phạm vi (§11.1 Q9).
- **Email không bao giờ được dùng làm kênh gửi.** §7.2 loại email/SMS khỏi phạm vi, và `architecture.md` AD-6 biến điều đó thành ràng buộc thi hành được. Thu thập email mà không dùng nó để gửi là **sai lệch có ý thức so với §9.2** — xem §9.2.
- Định danh đã tồn tại → bị từ chối kèm thông báo rõ ràng.
- Đăng ký không yêu cầu địa chỉ giao hàng — địa chỉ nhập ở bước đặt đơn.
- Đăng ký thành công tạo phiên đăng nhập ngay; khách hàng không phải đăng nhập lại.

#### FR-10: Đăng nhập và đăng xuất

Khách hàng đăng nhập và đăng xuất được.

**Hệ quả kiểm chứng được:**
- Sai thông tin → từ chối, và thông báo lỗi không tiết lộ định danh đó có tồn tại hay không.
- Đăng xuất làm phiên hiện tại không còn dùng được.
- Mật khẩu không bao giờ được lưu ở dạng có thể đọc lại được.
- **Phiên đăng nhập hết hạn sau 30 ngày không hoạt động**, và hết hạn tuyệt đối sau 90 ngày. `[ASSUMPTION: discovery không nêu vòng đời phiên; hai con số này do PRD đặt để yêu cầu kiểm chứng được.]`
- **Giới hạn số lần đăng nhập sai: 10 lần trên mỗi định danh trong 15 phút**, sau đó từ chối thêm trong 15 phút. Không khoá tài khoản vĩnh viễn — không có kênh email/SMS nào để mở khoá (§7.2), nên khoá vĩnh viễn là khoá thật. `[ASSUMPTION: discovery không nêu.]`
- Mật khẩu tối thiểu 8 ký tự, thực thi ở phía máy chủ. `[ASSUMPTION: discovery không nêu chính sách mật khẩu.]`

#### FR-11: Tường đăng ký giữa giỏ hàng và đặt đơn

Khách chưa đăng ký không đặt được đơn; hệ thống đưa họ qua đăng ký hoặc đăng nhập, rồi trả họ về đúng luồng đặt đơn. Thực hiện UJ-2.

**Hệ quả kiểm chứng được:**
- Gọi API đặt đơn không có phiên đăng nhập → HTTP 401, không tạo đơn hàng nào.
- Sau khi đăng ký/đăng nhập từ tường này, người dùng quay lại bước đặt đơn với giỏ hàng nguyên vẹn (FR-8).
- Mọi màn hình trước tường này đều truy cập được mà không cần đăng nhập.

#### FR-33: Tài khoản chủ shop được tạo sẵn

Tài khoản chủ shop tồn tại từ lúc triển khai; không có luồng đăng ký quản trị nào.

**Hệ quả kiểm chứng được:**
- Không có API hay màn hình công khai nào tạo được tài khoản chủ shop. `[ASSUMPTION: discovery chỉ nói "một chủ shop" mà không nêu cách tài khoản đó ra đời.]`
- Có đúng một tài khoản chủ shop.
- Chủ shop đổi được mật khẩu của mình.
- Tài khoản chủ shop **không** đặt đơn được (§5, FR-14 yêu cầu vai trò khách hàng).

#### FR-34: Chủ shop đặt lại mật khẩu cho khách hàng

Khách hàng mất mật khẩu thì chủ shop đặt lại được từ Trang quản trị. Đây là đường khôi phục **duy nhất**: §7.2 loại email và SMS khỏi phạm vi, nên không tồn tại kênh tự phục vụ nào.

**Hệ quả kiểm chứng được:**
- Đặt lại sinh một **mật khẩu tạm ngẫu nhiên**, hiện đúng một lần cho chủ shop để đọc cho khách qua kênh ngoài.
- Mật khẩu tạm **bắt buộc phải đổi ở lần đăng nhập kế tiếp**, và trước khi đổi thì không dùng được cho việc gì khác.
- Chủ shop **không bao giờ** đọc được mật khẩu hiện tại của khách hàng.
- Đặt lại **huỷ mọi phiên đang mở** của tài khoản đó.
- Mỗi lần đặt lại để lại dấu vết: thời điểm và tài khoản thực hiện.

> **NOTE FOR PM.** Quyền này khiến chủ shop **đăng nhập được vào mọi tài khoản khách hàng**, tức là vòng qua bất biến "không khách hàng nào đọc được dữ liệu của khách khác" (§8) bằng chính cửa quản trị. Bốn hệ quả trên là thứ giới hạn thiệt hại; `architecture.md` AD-7 biến chúng thành ràng buộc thi hành được. Cái giá này đã được nêu rõ trước khi Q10 được chốt.

---

### 4.5 Đặt đơn

**Mô tả.** Đây là trung tâm của sản phẩm. Khách hàng nhập địa chỉ giao, chọn phương thức thanh toán, và đặt đơn. Tại thời điểm đó — và **chỉ** tại thời điểm đó — hệ thống kiểm tra tồn kho và trừ kho trong cùng một thao tác không thể chen ngang. Nếu bất kỳ dòng nào không đủ hàng, **toàn bộ** đơn bị từ chối; không có đơn nào được tạo một phần. Thực hiện UJ-1, UJ-6.

**Yêu cầu chức năng:**

#### FR-12: Nhập địa chỉ giao hàng

Khách hàng nhập tên người nhận, số điện thoại và địa chỉ cho đơn đang đặt.

**Hệ quả kiểm chứng được:**
- Cả ba trường đều bắt buộc; thiếu bất kỳ trường nào → đơn bị từ chối.
- Nếu khách hàng đã có đơn trước đó, biểu mẫu được điền sẵn từ địa chỉ của đơn gần nhất và **sửa được**. `[ASSUMPTION: discovery không nêu sổ địa chỉ; điền sẵn là mức tối thiểu tránh gõ lại, mà không phải lưu thêm thực thể mới.]`
- Địa chỉ được **sao chép** vào đơn hàng; sửa địa chỉ ở đơn sau không làm thay đổi đơn cũ.
- Hệ thống không lưu sổ địa chỉ tách rời — chỉ lưu trên từng đơn. Đây là quyết định tối thiểu hoá dữ liệu (§9.2).

#### FR-13: Chọn phương thức thanh toán

Khách hàng chọn `cod` hoặc `bank_transfer`.

**Hệ quả kiểm chứng được:**
- Đúng hai lựa chọn hiển thị. Giá trị khác bị API từ chối.
- Chọn `bank_transfer` → sau khi đặt đơn, hiển thị thông tin chuyển khoản của shop và mã đơn dùng làm nội dung chuyển khoản (FR-23).
- Phương thức thanh toán được ghi vào đơn và không đổi được sau khi đặt. `[ASSUMPTION: discovery không bàn tới việc đổi phương thức thanh toán sau khi đặt; cấm đổi là cách bảo toàn ràng buộc ở FR-24.]`

#### FR-14: Đặt đơn với kiểm tra tồn kho nguyên tử

Khách hàng đặt đơn từ giỏ hàng của mình. Hệ thống kiểm tra đủ tồn kho cho **mọi** dòng và trừ kho trong một thao tác nguyên tử. Nếu bất kỳ dòng nào không đủ, không có đơn hàng nào được tạo và không có tồn kho nào bị thay đổi. Thực hiện UJ-1, UJ-6.

**Hệ quả kiểm chứng được:**
- Với tồn kho = 1 và hai yêu cầu đặt đơn đồng thời cho cùng sản phẩm đó: **đúng một** đơn được tạo, đơn còn lại bị từ chối, và tồn kho kết thúc ở 0 — không bao giờ ở -1.
- Đơn bị từ chối vì thiếu hàng trả về danh sách **cụ thể** dòng hàng nào không đủ; giỏ hàng của khách hàng vẫn còn nguyên.
- Giỏ rỗng → không đặt được đơn.
- Đặt đơn thành công → giỏ hàng của khách hàng đó được làm rỗng.
- Đơn được tạo ở trạng thái `placed`, không phụ thuộc phương thức thanh toán.
- Giá của mỗi dòng đơn hàng được sao chép từ giá sản phẩm tại thời điểm đặt; đổi giá sản phẩm sau đó không làm đổi đơn.
- Đạt ngưỡng p95 ≤ 1,0 s ở §8, bao gồm cả phần kiểm tra tồn kho, ở mức 5 đơn/phút.

**Ngoài phạm vi FR này:** giữ chỗ tồn kho, đặt trước hàng chưa về, danh sách chờ.

#### FR-15: Trừ tồn kho khi đặt đơn thành công

Đặt đơn thành công làm giảm tồn kho của từng sản phẩm đúng bằng số lượng đã đặt.

**Hệ quả kiểm chứng được:**
- Sau khi đặt đơn, tồn kho mỗi sản phẩm = giá trị cũ − số lượng đặt.
- Tồn kho không bao giờ xuống dưới 0 qua bất kỳ đường nào.
- Thay đổi tồn kho được ghi vết cùng với mã đơn gây ra nó (FR-27).

---

### 4.6 Vòng đời đơn hàng

**Mô tả.** Đơn hàng đi qua năm trạng thái. Chủ shop đẩy đơn tiến về phía trước; khách hàng can thiệp được đúng một chỗ (FR-17). Thực hiện UJ-3, UJ-4, UJ-5.

```
placed ──▶ confirmed ──▶ shipped ──▶ delivered   (điểm cuối)
  │            │            │
  └────────────┴────────────┴──▶ cancelled       (điểm cuối)
```

Hai ràng buộc cắt ngang sơ đồ: huỷ từ `shipped` không hoàn kho (FR-18), và đơn chuyển khoản đã xác nhận nhận tiền thì không huỷ được nữa (FR-24).

**Yêu cầu chức năng:**

#### FR-16: Chuyển trạng thái đơn hàng

Chủ shop chuyển một đơn hàng sang trạng thái kế tiếp hợp lệ. Thực hiện UJ-3.

**Hệ quả kiểm chứng được:**
- Chỉ các chuyển tiếp trong sơ đồ trên được chấp nhận. Mọi chuyển tiếp khác — kể cả lùi trạng thái — bị từ chối bằng HTTP 409, và đơn không đổi.
- `delivered` và `cancelled` là điểm cuối: không có chuyển tiếp nào ra khỏi chúng.
- Đơn `bank_transfer` đã xác nhận nhận thanh toán không chuyển sang `cancelled` được từ bất kỳ trạng thái nào → HTTP 409 (FR-24).
- Mọi lần đổi trạng thái đều ghi lại thời điểm và tài khoản thực hiện.
- Khách hàng gọi API chuyển trạng thái của chủ shop trên **đơn của chính mình** → HTTP 403 (từ chối theo vai trò), trừ trường hợp FR-17.
- Trên **đơn của người khác** → HTTP 404, nhất quán với FR-17 và FR-32: mã lỗi không bao giờ được tiết lộ một đơn không thuộc về người gọi có tồn tại hay không.

#### FR-17: Khách hàng huỷ đơn của chính mình khi đơn ở `placed`

Khách hàng huỷ được đơn hàng của **chính mình** khi và chỉ khi đơn đang ở `placed`. Thực hiện UJ-5.

**Hệ quả kiểm chứng được:**
- Huỷ đơn ở `placed` thành công, đơn chuyển sang `cancelled`.
- Huỷ đơn ở `confirmed`, `shipped`, `delivered` hoặc `cancelled` → HTTP 409; giao diện không hiển thị nút huỷ ở các trạng thái này và nói rõ khách hàng cần liên hệ chủ shop.
- Đơn `bank_transfer` ở `placed` mà chủ shop **đã xác nhận nhận thanh toán** → HTTP 409, và giao diện ẩn nút huỷ kèm lời giải thích (FR-24).
- Huỷ đơn của người khác → **HTTP 404**, không phải 403 — 403 đã tiết lộ đơn đó tồn tại. Nhất quán với FR-32.

> `[NOTE FOR PM]` Quyền này **không** có trong ma trận phân quyền của discovery — nó được thêm ở phiên này và thuộc mô hình phân quyền bị đóng băng → §11 Q5.

#### FR-18: Huỷ đơn hoàn lại tồn kho — chỉ khi hàng chưa rời kho

Đơn hàng chuyển sang `cancelled` **từ `placed` hoặc `confirmed`** làm hoàn lại tồn kho của mọi dòng đơn hàng. Huỷ từ `shipped` **không** hoàn kho. Thực hiện UJ-4, UJ-5.

**Hệ quả kiểm chứng được:**
- Huỷ từ `placed` hoặc `confirmed`: tồn kho mỗi sản phẩm = giá trị trước khi huỷ + số lượng trong dòng đơn hàng.
- Huỷ từ `shipped`: tồn kho **không đổi**. Hàng đã rời kho; đếm nó lại thành hàng bán được chính là bán quá tồn kho, và đó là thứ §1 cam kết không bao giờ xảy ra.
- Hàng bị huỷ ở `shipped` mà thực sự quay về kho được đưa lại vào tồn kho bằng điều chỉnh tay (FR-27, nguyên nhân `manual_adjustment`). Đây là đường nối tới quy trình trả hàng — vốn nằm ngoài phạm vi — và nó đi qua một hành động có chủ ý của con người, không qua một quy tắc tự động.
- Áp dụng bất kể ai huỷ (chủ shop hay khách hàng).
- Huỷ hai lần cùng một đơn không hoàn kho hai lần (FR-16 đã chặn, kiểm chứng riêng ở đây).
- Việc hoàn kho được ghi vết cùng mã đơn (FR-27).

#### FR-19: Chuyển sang `delivered` cần bước xác nhận và không đảo ngược được

Chuyển đơn sang `delivered` yêu cầu một bước xác nhận riêng, và sau đó đơn không đổi trạng thái được nữa.

**Hệ quả kiểm chứng được:**
- Giao diện yêu cầu xác nhận rõ ràng trước khi chuyển sang `delivered`, có nêu việc này không đảo ngược được.
- Mọi chuyển tiếp ra khỏi `delivered` → HTTP 409.
- Không có đường nào trong hệ thống — kể cả back office — đưa đơn ra khỏi `delivered`.

---

### 4.7 Phí giao hàng

**Mô tả.** Giao hàng được sắp xếp thủ công, nên phí giao hàng cũng do chủ shop nhập tay cho từng đơn. Điểm tinh tế: phí được nhập **sau khi** khách đã đặt, nên nó làm tổng tiền thay đổi sau lưng khách. Cách giải quyết ở đây không thêm trạng thái nào — chủ shop nhập phí khi đơn **vẫn còn ở `placed`**, nên khách thấy tổng mới và vẫn giữ nguyên quyền huỷ (FR-17). Chủ shop chỉ bấm `confirmed` sau khi đã thống nhất với khách, đúng như shop đang làm qua tin nhắn hôm nay. Thực hiện UJ-3, UJ-5.

**Yêu cầu chức năng:**

#### FR-20: Chủ shop nhập phí giao hàng cho một đơn

Chủ shop đặt phí giao hàng cho một đơn hàng đang ở `placed`. Thực hiện UJ-3.

**Hệ quả kiểm chứng được:**
- Phí mặc định của đơn mới là 0.
- Đặt phí **không** làm đổi trạng thái đơn.
- Đặt phí cho đơn không ở `placed` → HTTP 409. `[ASSUMPTION: giới hạn này là cách giữ cho khách hàng luôn còn quyền huỷ khi tổng tiền thay đổi; discovery không bàn tới phí giao hàng.]`
- Phí âm bị từ chối. Phí bằng 0 hợp lệ.
- Tổng tiền đơn được tính lại ngay = tổng tiền hàng + phí giao hàng.
- Mỗi lần đổi phí được ghi lại thời điểm và giá trị.

#### FR-21: Khách hàng thấy tổng tiền đã cập nhật trước khi đơn được xác nhận

Khách hàng thấy phí giao hàng và tổng tiền mới trong lịch sử đơn của mình ngay khi chủ shop nhập phí. Thực hiện UJ-5.

**Hệ quả kiểm chứng được:**
- Lịch sử đơn hiển thị tách bạch: tổng tiền hàng, phí giao hàng, tổng tiền đơn.
- Đơn ở `placed` có phí > 0 vẫn hiển thị nút huỷ (FR-17).
- Không có thông báo đẩy nào được gửi — trạng thái chỉ nhìn thấy trong ứng dụng (đây là ràng buộc phạm vi §6, không phải thiếu sót).

> `[NOTE FOR PM]` Không có email/SMS nghĩa là khách hàng chỉ biết phí giao hàng nếu tự mở lại ứng dụng → §11 Q8.

---

### 4.8 Thanh toán

**Mô tả.** Hai phương thức, không cổng thanh toán nào. Hệ thống không nói chuyện với ngân hàng — nó chỉ ghi lại phán quyết của con người, và ghi lại ai đã phán quyết. Thực hiện UJ-1, UJ-4.

**Yêu cầu chức năng:**

#### FR-22: Đơn COD

Đơn có phương thức `cod` không yêu cầu bước xác nhận thanh toán nào trong hệ thống.

**Hệ quả kiểm chứng được:**
- Đơn `cod` ở `placed` chuyển sang `confirmed` được ngay bằng thao tác của chủ shop.
- Hệ thống không ghi nhận việc thu tiền COD — tiền được thu khi giao hàng, ngoài hệ thống.

#### FR-23: Hướng dẫn chuyển khoản

Đơn có phương thức `bank_transfer` hiển thị thông tin tài khoản của shop và nội dung chuyển khoản cho khách hàng.

**Hệ quả kiểm chứng được:**
- Sau khi đặt đơn thành công, khách hàng thấy: tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền, và nội dung chuyển khoản.
- Nội dung chuyển khoản chứa mã đơn hàng, để chủ shop đối chiếu được.
- Thông tin này cũng xem lại được trong lịch sử đơn khi đơn còn ở `placed`.
- Thông tin ngân hàng do chủ shop cấu hình, không hardcode. `[ASSUMPTION: discovery không nêu nơi cấu hình thông tin ngân hàng.]`

#### FR-24: Xác nhận thanh toán gác trạng thái `confirmed`

Đơn `bank_transfer` không chuyển sang `confirmed` được cho tới khi chủ shop đánh dấu đã nhận thanh toán. Thực hiện UJ-4.

**Hệ quả kiểm chứng được:**
- Đơn `bank_transfer` chưa xác nhận thanh toán, chuyển sang `confirmed` → HTTP 409.
- Sau khi đánh dấu đã nhận thanh toán, chuyển sang `confirmed` thành công.
- Xác nhận thanh toán ghi lại thời điểm và tài khoản thực hiện.
- Xác nhận thanh toán tự nó **không** đổi trạng thái đơn — đó là hai hành động riêng.
- Đánh dấu đã nhận thanh toán cho đơn `cod` → HTTP 409 (không áp dụng).
- **Sau khi đã xác nhận nhận thanh toán, đơn không huỷ được nữa:** mọi yêu cầu chuyển sang `cancelled` → HTTP 409, dù từ chủ shop hay khách hàng, dù đơn đang ở trạng thái nào. Xác nhận thanh toán không đảo ngược được.
- Giao diện nói rõ điều này **trước** khi chủ shop xác nhận thanh toán, vì đó là hành động một chiều.

**Vì sao chặn thay vì xử lý.** Huỷ một đơn đã nhận tiền tạo ra một khoản phải trả lại khách hàng — tức là một quy trình hoàn tiền, thứ nằm ngoài phạm vi (§7.2). Cho phép chuyển tiếp đó mà không có quy trình đằng sau sẽ đẩy tiền ra khỏi sổ sách một cách im lặng. Chặn nó giữ cho hệ thống chỉ chứa những trạng thái nó biết cách xử lý.

> `[NOTE FOR PM]` Ràng buộc này có cái giá thật của nó: khách hàng chuyển khoản xong rồi đổi ý thì **đơn kẹt vĩnh viễn** — không huỷ được, và đường duy nhất còn lại là đi tiếp tới `delivered`. Chủ shop sẽ phải xử lý ngoài hệ thống. Đây là lựa chọn có ý thức của người quyết định ở phiên này, không phải sơ suất. Xem §11 Q11.

---

### 4.9 Back office — sản phẩm, danh mục, tồn kho

**Mô tả.** Nửa còn lại của sản phẩm. Chủ shop quản lý những gì được bán và còn bao nhiêu. Điều chỉnh tồn kho phải để lại dấu vết — không phải vì tuân thủ, mà vì khi con số tồn kho sai thì phải trả lời được câu "nó sai từ lúc nào". Thực hiện UJ-3.

**Yêu cầu chức năng:**

#### FR-25: Quản lý sản phẩm

Chủ shop tạo, sửa, và ngừng bán sản phẩm.

**Hệ quả kiểm chứng được:**
- Tạo sản phẩm yêu cầu tên, giá, và ít nhất một ảnh (FR-28).
- Giá âm hoặc bằng 0 bị từ chối. `[ASSUMPTION: discovery không nêu quy tắc giá; hàng tặng nằm ngoài phạm vi.]`
- Sản phẩm đã xuất hiện trong bất kỳ đơn hàng nào **không xoá cứng được** — nó chỉ được đánh dấu ngừng bán, để đơn cũ vẫn đọc được. Sản phẩm chưa từng xuất hiện trong đơn nào thì xoá cứng được.
- Sản phẩm ngừng bán không xuất hiện khi duyệt hay tìm kiếm, và không thêm được vào giỏ.
- Sửa giá **không** làm đổi giá trên các dòng đơn hàng đã tạo (FR-14).

#### FR-26: Quản lý danh mục

Chủ shop tạo, đổi tên và xoá danh mục, cũng như gán sản phẩm vào danh mục.

**Hệ quả kiểm chứng được:**
- Một sản phẩm thuộc nhiều nhất một danh mục.
- Xoá danh mục đang có sản phẩm → các sản phẩm đó trở thành không có danh mục, không bị xoá theo.
- Danh mục phẳng: không đặt được danh mục cha.

#### FR-27: Điều chỉnh tồn kho có ghi vết

Chủ shop đặt lại con số tồn kho của một sản phẩm, và mọi thay đổi tồn kho từ bất kỳ nguồn nào đều được ghi vết.

**Hệ quả kiểm chứng được:**
- Đặt tồn kho về một số nguyên ≥ 0 thành công; số âm bị từ chối.
- Mỗi thay đổi tồn kho ghi lại: sản phẩm, giá trị trước, giá trị sau, nguyên nhân (`order_placed` | `order_cancelled` | `manual_adjustment`), mã đơn nếu có, thời điểm, tài khoản thực hiện.
- Cộng dồn toàn bộ lịch sử thay đổi của một sản phẩm cho ra đúng con số tồn kho hiện tại.
- Điều chỉnh tay xuống một giá trị thấp hơn số lượng đã bán trong kỳ vẫn được phép, miễn là kết quả ≥ 0.

#### FR-28: Ảnh sản phẩm

Chủ shop tải lên và sắp xếp ảnh cho một sản phẩm.

**Hệ quả kiểm chứng được:**
- Mỗi sản phẩm có ít nhất một ảnh; sản phẩm không ảnh không lưu được. `[ASSUMPTION: discovery không nêu yêu cầu ảnh.]`
- Nhiều ảnh được phép; ảnh đầu tiên là ảnh đại diện trong danh sách.
- Chỉ nhận JPEG, PNG, WebP; tối đa 5 MB mỗi ảnh, thực thi ở phía máy chủ. `[ASSUMPTION: discovery không nêu giới hạn ảnh.]`

---

### 4.10 Back office — đơn hàng

**Mô tả.** Nơi chủ shop thấy toàn bộ đơn hàng và đẩy chúng tiến lên. Đây là thứ thay thế bảng tính, nên tiêu chí thành công đơn giản: không còn lý do nào để mở bảng tính. Thực hiện UJ-3, UJ-4.

**Yêu cầu chức năng:**

#### FR-29: Danh sách và lọc đơn hàng

Chủ shop xem mọi đơn hàng, lọc theo trạng thái, và sắp xếp theo thời gian đặt. Thực hiện UJ-3.

**Hệ quả kiểm chứng được:**
- Danh sách mặc định hiển thị đơn mới nhất trước.
- Lọc theo trạng thái trả về đúng các đơn ở trạng thái đó.
- Danh sách được phân trang và đạt ngưỡng p95 ≤ 400 ms ở §8 với 300.000 đơn.
- Mỗi dòng hiển thị: mã đơn, thời điểm đặt, tên người nhận, tổng tiền đơn, phương thức thanh toán, trạng thái, và với `bank_transfer` là tình trạng xác nhận thanh toán.

#### FR-30: Chi tiết đơn hàng

Chủ shop mở một đơn và thấy toàn bộ nội dung cùng lịch sử của nó.

**Hệ quả kiểm chứng được:**
- Hiển thị mọi dòng đơn hàng với giá tại thời điểm đặt, địa chỉ giao hàng, phương thức thanh toán, phí giao hàng, tổng tiền đơn.
- Hiển thị lịch sử trạng thái: mỗi lần chuyển, thời điểm, tài khoản thực hiện.
- Các hành động khả dụng đúng theo trạng thái hiện tại và các ràng buộc ở FR-16, FR-19, FR-20, FR-24.

---

#### FR-35: Ẩn danh hoá đơn hàng theo yêu cầu của khách hàng

Khách hàng yêu cầu xoá dữ liệu cá nhân của mình thì chủ shop thực hiện được ngay từ Trang quản trị, không phải chờ mốc tự động ở §9.3.

**Hệ quả kiểm chứng được:**
- Thao tác này **giống hệt** ẩn danh hoá tự động ở §9.3 — cùng một hành vi, chỉ khác đường kích hoạt. Không có cài đặt thứ hai.
- Không hồi phục được: tên người nhận, số điện thoại và địa chỉ bị xoá; dòng đơn, giá, tổng tiền, trạng thái và mốc thời gian giữ nguyên.
- Đơn đã ẩn danh hoá vẫn **hiển thị được bình thường** ở FR-30 và FR-31, không lỗi.
- Để lại dấu vết: thời điểm, tài khoản thực hiện, và đường kích hoạt nào (tự động hay theo yêu cầu).

> **NOTE FOR PM.** FR này tồn tại vì `Luật 91/2025/QH15` cho chủ thể dữ liệu quyền yêu cầu xoá với **thời hạn đáp ứng 20 ngày**. Một job chạy theo lịch 12 tháng (§9.3) không đáp ứng được nghĩa vụ đó. Khách yêu cầu qua kênh ngoài (Zalo) — kênh vốn đã tồn tại, vì §7.2 không cho phép kênh nào khác.
>
> **Giới hạn đã biết:** FR này chỉ chạm dữ liệu **trên đơn**. Email của khách hàng — định danh đăng nhập từ FR-9 — **không** bị xoá, nên một yêu cầu "xoá dữ liệu của tôi" chỉ được đáp ứng một nửa. Chưa có quyết định; xem mục Deferred của `architecture.md`.

---

### 4.11 Lịch sử đơn hàng của khách hàng

**Mô tả.** Khách hàng xem lại mình đã đặt gì, khi nào, và đơn đang ở đâu — thay cho việc cuộn lại lịch sử chat. Vì không có email/SMS, đây là **kênh duy nhất** khách biết trạng thái đơn. Thực hiện UJ-1, UJ-5.

**Yêu cầu chức năng:**

#### FR-31: Xem lịch sử đơn hàng của chính mình

Khách hàng xem danh sách đơn của chính mình và mở chi tiết từng đơn. Thực hiện UJ-1, UJ-5.

**Hệ quả kiểm chứng được:**
- Danh sách hiển thị đơn mới nhất trước, gồm mã đơn, ngày đặt, tổng tiền đơn, trạng thái.
- Chi tiết đơn hiển thị các dòng đơn hàng với giá tại thời điểm đặt, địa chỉ giao, phương thức thanh toán, phí giao hàng, tổng tiền đơn.
- Đơn ở `placed` hiển thị nút huỷ (FR-17); các trạng thái khác thì không.
- Đơn `bank_transfer` ở `placed` hiển thị lại hướng dẫn chuyển khoản (FR-23).

#### FR-32: Cô lập dữ liệu giữa các khách hàng

Khách hàng không truy cập được đơn hàng của khách hàng khác qua bất kỳ đường nào.

**Hệ quả kiểm chứng được:**
- Yêu cầu chi tiết một đơn không thuộc về mình → HTTP 404 (không phải 403 — không tiết lộ đơn có tồn tại).
- Không có API nào trả về đơn hàng của khách khác cho một phiên khách hàng.
- Đây là bất biến phải có test bảo vệ, không phải một hành vi ngầm hiểu.

## 5. Ma trận phân quyền

> Đây là mô hình phân quyền bị đóng băng. Ba vai trò, hết. Nhỏ tới mức không cần
> bất kỳ policy engine nào — và phải giữ được như vậy.

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
| **Đặt lại mật khẩu khách hàng (FR-34)** | — | — | **✓** |
| **Ẩn danh hoá đơn theo yêu cầu (FR-35)** | — | — | **✓** |

**Ba khác biệt so với ma trận trong discovery**, cả ba đã được người quyết định xác nhận ở §11.1:

1. **Huỷ đơn của chính mình** — dòng mới, discovery không bàn tới. → §11.1 Q5: **xác nhận có**
2. **Chủ shop không thêm được vào giỏ hàng** — discovery cho ✓, nhưng chủ shop không đặt đơn được nên giỏ đó không có lối ra. → §11.1 Q4 trả lời "không", nên Q12 đóng theo: ô này giữ `—`
3. **Chủ shop không đặt đơn được** — giữ nguyên như discovery. → §11.1 Q4: **xác nhận không**

Hai dòng cuối bảng (FR-34, FR-35) là **mới so với cả discovery lẫn bản nháp**, sinh ra từ Q10 và Q3b.

## 6. Không làm (Non-goals)

§7.2 liệt kê từng thứ bị loại kèm lý do và lộ trình. Mục này nói thứ khác: sản phẩm này **là cái gì và không là cái gì** — bốn câu định danh mà không dòng nào trong bảng đó nói thay được.

- **Đây không phải sàn thương mại điện tử, không phải hệ thống B2B.** Một chủ, một shop, một người mua trả tiền ngay. Mọi thứ theo sau — onboarding người bán, tách giỏ, hoa hồng, đối soát, công nợ, báo giá — không nằm ngoài phạm vi vì hết thời gian, mà vì mô hình kinh doanh không có chúng.
- **Hệ thống không nói chuyện với bất cứ thứ gì bên ngoài.** Mục hợp đồng tích hợp trong tài liệu kiến trúc sẽ **rỗng, một cách có chủ ý**. Đó là một yêu cầu, không phải một khoảng trống.
- **Hệ thống không bao giờ chạm vào dữ liệu thẻ.** Thuộc tính an toàn này có được nhờ phạm vi chứ không nhờ biện pháp kỹ thuật — nên nó mất đi đúng khoảnh khắc bất kỳ mục nào ở §7.2 được đưa trở lại phạm vi.
- **Đây là hệ thống ghi nhận đơn hàng, không phải công cụ marketing, không phải hệ thống quản lý kho, không phải công cụ phân tích.** Nhiệm vụ của nó là làm cho dữ liệu tồn tại và đúng. Khai thác dữ liệu đó là chuyện của phiên bản sau.

## 7. Phạm vi MVP

### 7.1 Trong phạm vi — bảng tra FR

Bảng này vừa liệt kê phạm vi, vừa là bản đồ FR của tài liệu: mỗi dòng là một mục ở §4.

| § | Năng lực | FR |
|---|---|---|
| 4.1 | Danh mục phẳng, duyệt, tìm kiếm có bỏ dấu, phân trang | FR-1 – FR-3 |
| 4.2 | Trang sản phẩm: giá, ảnh, tình trạng còn/hết | FR-4, FR-5 |
| 4.3 | Giỏ hàng ở trình duyệt, không giữ chỗ tồn kho; sống sót qua lần đăng nhập | FR-6 – FR-8 |
| 4.4 | Đăng ký, đăng nhập, tường đăng ký; tài khoản chủ shop tạo sẵn; **đặt lại mật khẩu khách** | FR-9 – FR-11, FR-33, **FR-34** |
| 4.5 | Đặt đơn: địa chỉ giao, phương thức thanh toán, **kiểm tra tồn kho nguyên tử** | FR-12 – FR-15 |
| 4.6 | Vòng đời `placed → confirmed → shipped → delivered` + `cancelled`; khách hàng huỷ ở `placed`; hoàn kho có điều kiện | FR-16 – FR-19 |
| 4.7 | Phí giao hàng nhập tay khi đơn còn ở `placed` | FR-20, FR-21 |
| 4.8 | COD và chuyển khoản có xác nhận tay; xác nhận gác `confirmed` | FR-22 – FR-24 |
| 4.9 | Back office: CRUD sản phẩm và danh mục, ảnh, điều chỉnh tồn kho có ghi vết | FR-25 – FR-28 |
| 4.10 | Back office: danh sách và chi tiết đơn; **ẩn danh hoá theo yêu cầu** | FR-29, FR-30, **FR-35** |
| 4.11 | Lịch sử đơn của khách hàng; cô lập dữ liệu giữa các khách hàng | FR-31, FR-32 |

Nền tảng: web responsive, ưu tiên desktop, một bề mặt duy nhất cho cả mặt tiền cửa hàng và back office.

### 7.2 Ngoài phạm vi MVP

| Loại trừ | Lý do |
|---|---|
| Cổng thanh toán (VNPay, MoMo, ZaloPay) | Kéo theo webhook, idempotency, giao dịch treo, đối soát, hoàn tiền, rà soát PCI. Không có thứ nào tồn tại trong quy trình hiện tại của shop. → **v2**, khi khối lượng chuyển khoản làm việc xác nhận tay thành nút thắt mới. |
| Tích hợp hãng vận chuyển, theo dõi vận đơn | Giao hàng đang được sắp xếp tay. → **v2**, khi điều phối giao hàng thành việc thủ công lớn nhất còn lại. |
| Email và SMS thông báo | Trạng thái chỉ nhìn thấy trong ứng dụng. Mục nặng nề nhất trong danh sách này — nó chạm cả phí giao hàng (§11 Q8) lẫn khôi phục mật khẩu (§11 Q10). |
| Khuyến mãi, voucher, mã giảm giá, tích điểm | Công cụ marketing, không phải năng lực đặt hàng. |
| Đánh giá và xếp hạng sản phẩm | Cần lượng khách mà shop chưa có. |
| Gợi ý, cá nhân hoá | Cần dữ liệu mà hệ thống chưa sinh ra. |
| Nhiều người bán, tính năng sàn | Mô hình kinh doanh khác. |
| B2B: giá hợp đồng, công nợ, báo giá | Mô hình kinh doanh khác. |
| Nhiều kho, nhiều loại tiền tệ | Một shop, một kho, VND. |
| Quy trình trả hàng và hoàn tiền | → **v2 hoặc muộn hơn**. Là lý do `delivered` không đảo ngược (FR-19), lý do huỷ từ `shipped` không hoàn kho (FR-18), và lý do đơn chuyển khoản đã nhận tiền không huỷ được (FR-24). Ba ràng buộc đó không phải sự trùng hợp — chúng là cùng một quyết định phạm vi, chặn ở ba chỗ hệ thống có thể tạo ra một trạng thái mà nó không biết xử lý. |
| Ứng dụng di động | Web responsive phục vụ cả hai bề mặt. |
| Dashboard phân tích, báo cáo | Dữ liệu phải đúng trước, phân tích sau. |
| Ngôn ngữ ngoài tiếng Việt | Khách hàng là người Việt. |
| Biến thể sản phẩm | Quyết định ở phiên này. → **Track B**, nếu shop bán mặt hàng có size/màu. |
| Tài khoản nhân viên, phân quyền nội bộ | Một chủ, một shop. |

## 8. Yêu cầu phi chức năng xuyên suốt

**Mục này là nơi ở chính thức của các NFR.** Bảng trong product brief addendum §2 tự ghi "Destination: PRD" — nó đã tới đích, và bản ở đây là bản được tham chiếu từ nay. Toàn bộ con số là **mục tiêu đặt ra**, không phải số đã đo; nguồn gốc: `docs/discovery/README.md`.

**Hiệu năng**

| Chỉ tiêu | Mục tiêu | Ràng buộc FR |
|---|---|---|
| p95 tải trang — duyệt danh mục | ≤ 1,5 s | FR-1, FR-3 |
| p95 API — đường đọc | ≤ 400 ms | FR-1…FR-5, FR-29, FR-31 |
| p95 API — đặt đơn | ≤ 1,0 s (đã gồm kiểm tra tồn kho) | FR-14 |

**Quy mô**

| Chỉ tiêu | Y1 | Y3 |
|---|---|---|
| Người dùng hoạt động đồng thời | 200 | — |
| Đỉnh tốc độ đặt đơn | 5 đơn/phút | — |
| Số sản phẩm | 2.000 | 20.000 |
| Số đơn hàng | 30.000 | 300.000 |

Mức 5 đơn/phút là con số **quyết định thiết kế chống bán quá tồn kho** (FR-14): nó phải đúng dưới tải đồng thời, và tăng gấp 10 lần quy mô ở Y3 phải không phá được nó.

**Độ tin cậy và vận hành**

- Uptime 99,5%/tháng (≈ 3 giờ 39 phút gián đoạn cho phép mỗi tháng).
- RPO 1 giờ / RTO 4 giờ — quyết định tần suất sao lưu và quy trình khôi phục.
- Mọi thay đổi tồn kho và mọi chuyển trạng thái đơn hàng đều để lại dấu vết (FR-16, FR-27). Khi con số sai, phải trả lời được "sai từ lúc nào và do đâu".

**Bất biến xuyên suốt** (áp dụng cho mọi FR, phải có test bảo vệ)

- Tồn kho không bao giờ âm, qua bất kỳ đường nào.
- Không có đơn hàng nào được tạo mà không đủ tồn kho cho **mọi** dòng của nó.
- Không khách hàng nào đọc được dữ liệu của khách hàng khác (FR-32).
- Giá và địa chỉ trên đơn hàng đã tạo là bất biến.

## 9. Ràng buộc, quyền riêng tư và quản trị dữ liệu

### 9.1 Ràng buộc pháp lý và thương mại

- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** và **Nghị định 356/2025/NĐ-CP**, cả hai hiệu lực 01/01/2026. Tên, số điện thoại, địa chỉ giao hàng là dữ liệu cá nhân. Chỉ thu thập những gì việc giao hàng cần.
  > Bản nháp trích dẫn `Nghị định 13/2023/NĐ-CP`. Văn bản đó **hết hiệu lực 01/01/2026** và đã được thay thế; kiểm chứng ngày 2026-09-19. Hai điểm của luật mới chạm thẳng vào sản phẩm: **yêu cầu xoá dữ liệu phải được đáp ứng trong 20 ngày** (sinh ra FR-35), và doanh nghiệp nhỏ được chọn không áp dụng một số điều trong 5 năm **trừ** đơn vị xử lý dữ liệu của *"số lượng lớn chủ thể"* — với 300.000 đơn ở Y3 (§8) thì vế trừ này không hiển nhiên là không áp. **Vẫn cần tư vấn pháp lý.**
- **Không có dữ liệu thẻ, không bao giờ** — bảo đảm bằng cấu trúc, xem §6.
- **Giá hiển thị bằng VND, đã bao gồm VAT.** Không tách dòng thuế.
- **Không có ràng buộc công nghệ nào.** Phase kiến trúc chọn stack tự do; không có chuẩn CI/CD nội bộ phải tuân theo.

### 9.2 Tối thiểu hoá dữ liệu

Hệ thống thu thập: định danh đăng nhập, mật khẩu (băm), và trên từng đơn hàng là tên người nhận, số điện thoại, địa chỉ. Hết.

Không có sổ địa chỉ tách rời (FR-12), không hồ sơ cá nhân, không ngày sinh, không giới tính, không theo dõi hành vi, không phân tích bên thứ ba. Mỗi trường dữ liệu cá nhân trong hệ thống phải chỉ ra được nó phục vụ việc giao hàng như thế nào.

> **Một sai lệch có ý thức so với quy tắc trên.** §11.1 Q9 chốt định danh đăng nhập là **email**, và email **không** phục vụ việc giao hàng theo bất kỳ nghĩa nào — §7.2 còn cấm dùng nó làm kênh gửi. Người quyết định đã chọn email sau khi được nêu rõ cái giá này; phương án thay thế là số điện thoại, vốn đã phải thu thập cho việc giao hàng. Ghi ở đây để không ai đọc §9.2 mà tưởng quy tắc được thoả trọn vẹn.

### 9.3 Lưu trữ và ẩn danh hoá

Đây là điểm căng giữa hai ràng buộc cùng áp lên một bản ghi: đơn hàng phải lưu 5 năm, còn dữ liệu cá nhân gắn trên đó thì phải tối thiểu hoá.

**Chính sách đề xuất:** giữ đơn hàng 5 năm. **12 tháng** sau khi một đơn đạt `delivered` hoặc `cancelled`, ẩn danh hoá dữ liệu cá nhân của đơn đó — xoá không hồi phục tên người nhận, số điện thoại và địa chỉ, giữ lại dòng đơn hàng, giá, tổng tiền, trạng thái và mốc thời gian. Đơn hàng còn cho mục đích kế toán; con người thì không còn.

**Chính sách này đã được chốt** (§11.1 Q3a): mốc 12 tháng giữ nguyên.

**Hai đường kích hoạt, một hành vi.** Ngoài mốc tự động 12 tháng ở trên, chủ shop ẩn danh hoá được một đơn **ngay khi khách yêu cầu** (FR-35) — `Luật 91/2025/QH15` cho chủ thể dữ liệu quyền yêu cầu xoá với thời hạn đáp ứng 20 ngày, thứ mà một job chạy theo lịch 12 tháng không đáp ứng được. Hai đường phải dùng **chung một cài đặt**, không phải hai.

> **Vẫn cần tư vấn pháp lý.** Mốc 12 tháng là lựa chọn của người quyết định, không phải kết luận pháp lý — discovery không chốt nó và chưa ai đối chiếu với `Luật 91/2025` hay `NĐ 356/2025`.

**Giới hạn của việc ẩn danh hoá — đã quyết định, không phải sơ suất.** Ẩn danh hoá (tự động lẫn theo yêu cầu) chỉ chạm dữ liệu cá nhân **trên đơn hàng**. Email của khách hàng — định danh đăng nhập ở FR-9 — **không** bị xoá và **không có cơ chế nào xoá nó ở v1**. Nghĩa là một yêu cầu "xoá dữ liệu của tôi" chỉ được đáp ứng phần trên đơn; tài khoản vẫn còn.

Người quyết định đã chọn giữ nguyên như vậy sau khi được nêu rõ cái giá. Phương án "xoá luôn tài khoản" **bất khả về mặt kỹ thuật**: `architecture.md` AD-24 đặt `ON DELETE RESTRICT` giữa đơn hàng và tài khoản, mà đơn phải giữ 5 năm. Phương án còn lại — ẩn danh hoá cả bản ghi tài khoản — bị loại vì chi phí, không vì không làm được.

> ⚠️ **Đây là một khoảng hở tuân thủ đã biết và được chấp nhận**, không phải một thứ bị bỏ sót. Nếu một khách hàng thực sự yêu cầu xoá toàn bộ, chủ shop phải xử lý ngoài hệ thống. Cần xem lại cùng tư vấn pháp lý về `Luật 91/2025`, và trước khi số lượng chủ thể dữ liệu tăng tới ngưỡng "số lượng lớn" ở §9.1.

## 10. Chỉ số thành công

Mọi chỉ số đều đo được từ chính hệ thống, không cần khảo sát.

**Chính**

- **SM-1 — Không bán quá tồn kho.** Số đơn hàng được chấp nhận cho tồn kho không có thật = **0**. Đo bằng: bất biến "tồn kho không bao giờ âm" cộng kiểm tra đối chiếu lịch sử thay đổi tồn kho (FR-27) so với tồn kho hiện tại. Xác nhận FR-14, FR-15, FR-18, FR-27.
- **SM-2 — Bảng tính bị bỏ.** Đo **ngoài hệ thống**, bằng cách hỏi chủ shop mỗi tháng: tháng này có đơn nào được ghi ở nơi khác ngoài hệ thống không, và bao nhiêu? Mục tiêu: **0** sau tháng thứ hai. Đây là chỉ số duy nhất phải hỏi người, và bắt buộc phải như vậy: một đơn không vào hệ thống thì theo định nghĩa hệ thống không thấy được. Xác nhận FR-14, FR-29, FR-33.
- **SM-3 — Đơn đi hết vòng đời mà chủ shop chỉ làm đúng việc của mình.** Mẫu số: mọi đơn đạt `delivered` trong kỳ. Tử số: số đơn trong đó mà toàn bộ hành động của chủ shop chỉ gồm chuyển trạng thái (FR-16), nhập phí giao hàng (FR-20) và xác nhận thanh toán (FR-24) — không có điều chỉnh tồn kho tay (FR-27) nào tham chiếu đơn đó, và không có lần chuyển trạng thái nào bị từ chối. Mục tiêu ≥ **95%**. Đo hoàn toàn từ lịch sử đơn hàng và sổ cái tồn kho. Xác nhận FR-14, FR-16, FR-20, FR-24, FR-27.

**Phụ**

- **SM-4 — Thời gian đơn nằm chờ.** Thời gian trung vị từ `placed` tới `confirmed`. Không có mục tiêu ở v1 — thu thập để làm mốc, vì nó chính là phần thời gian chủ shop vẫn còn nằm trên đường găng. Xác nhận FR-16, FR-20, FR-24.
- **SM-5 — Tỷ lệ khách hàng tự huỷ đơn.** Tỷ lệ đơn `cancelled` do khách hàng huỷ so với do chủ shop huỷ. Xác nhận FR-17.

**Phản chỉ số (không được tối ưu)**

- **SM-C1 — Độ trễ đặt đơn.** Đối trọng của SM-1. Ngưỡng p95 ≤ 1,0 s (§8) là **trần**, không phải mục tiêu để đua. Bất kỳ tối ưu nào làm giảm độ trễ bằng cách nới lỏng tính nguyên tử của kiểm tra tồn kho đều là làm hỏng sản phẩm. Nếu phải chọn, chọn chậm hơn.
- **SM-C2 — Tỷ lệ chuyển đổi.** Đối trọng của SM-3. Tường đăng ký (FR-11) và việc từ chối đơn thiếu hàng (FR-14) **đều làm giảm** tỷ lệ chuyển đổi, và cả hai đều đúng. Đơn bị từ chối vì hết hàng là hệ thống làm đúng việc của nó, không phải một thất bại cần tối ưu.

> `[ASSUMPTION]` Discovery không cung cấp mục tiêu kinh doanh nào — số đơn/tháng,
> doanh thu, hay số giờ chủ shop tiết kiệm được. SM-1…SM-5 đo **năng lực**, không đo
> **kết quả kinh doanh**. Cần gắn ít nhất một con số kinh doanh trước khi ai đó
> tuyên bố dự án này thành công hay thất bại. Xem §11 Q2.

## 11. Câu hỏi mở

Người trả lời: **Tuan Nguyen** (tuan.nguyen@finviet.com.vn) — người quyết định phạm vi và là người duy nhất được đóng băng baseline (`docs/discovery/README.md` §Decision-maker).

Số Q **không được đánh lại** khi tách thành hai nhóm dưới đây — nên số thứ tự trong mỗi nhóm không liên tục. §5, §9.3, §10, §12 và các ghi chú trong §4 đều trỏ vào chúng.

### 11.1 Đã đóng — trả lời ngày 2026-09-19

Năm câu này quyết định mô hình dữ liệu hoặc ma trận phân quyền. Người quyết định
(**Tuan Nguyen**) đã trả lời cả năm trước bước đóng băng, đúng thứ tự Track A yêu cầu.
Số Q giữ nguyên để artifact hạ nguồn tham chiếu ổn định.

| Q | Câu hỏi | Quyết định | Áp vào đâu |
|---|---|---|---|
| **Q3** | Chính sách ẩn danh hoá | Giữ mốc **12 tháng**. Căn cứ chuyển sang `Luật 91/2025` + `NĐ 356/2025`. Quyền yêu cầu xoá: chủ shop ẩn danh hoá tay | §9.1, §9.3, **FR-35** |
| **Q4** | Chủ shop đặt đơn hộ khách | **Không** — giữ nguyên discovery. Q12 đóng theo: ô "thêm vào giỏ" giữ `—` | §5 (không đổi) |
| **Q5** | Khách tự huỷ đơn khi ở `placed` | **Có** — xác nhận FR-17 | §5, FR-17 (không đổi) |
| **Q9** | Định danh đăng nhập | **Email** | **FR-9**, và sai lệch có ý thức ghi ở §9.2 |
| **Q10** | Khôi phục mật khẩu | Chủ shop đặt lại qua Trang quản trị | **FR-34** |

**Cái giá đã được nêu rõ trước khi chốt, ghi lại để không ai đọc bảng này như một chiến thắng sạch:**

- **Q9** đánh đổi §9.2 — email là dữ liệu cá nhân mà hệ thống không bao giờ dùng tới. Khuyến nghị của phase kiến trúc là số điện thoại; bị bác.
- **Q10** cho chủ shop khả năng đăng nhập vào mọi tài khoản khách hàng (xem NOTE FOR PM ở FR-34).
- **Q3b** chỉ ẩn danh hoá dữ liệu **trên đơn**; email của khách vẫn còn, nên yêu cầu xoá chỉ được đáp ứng một nửa.

**Ba xung đột KHÔNG thuộc nhóm này và vẫn còn mở** — chúng nằm ở mục Deferred của
`architecture.md`, không phải ở đây: FR-8 so với quyết định giỏ hàng ở `localStorage`;
`verification.md` không chạy tới một dòng code sản phẩm nào; và `account.email` nằm
ngoài phạm vi ẩn danh hoá.

### 11.2 Spec Kit hoặc phase kiến trúc mang tiếp được

1. **Build vs buy.** Vì sao shop nên tự xây thay vì dùng nền tảng có sẵn (Shopify, Haravan, Sapo, KiotViet)? Chưa chạy nghiên cứu thị trường — cố ý bỏ qua cho bản demo này. PRD không đưa ra tuyên bố cạnh tranh nào. Nếu cần: chạy `bmad-deep-recon` loại market hoặc competitive. *(Carry-over: addendum §1 Q1.)*

2. **Chỉ số kinh doanh.** Con số nào nói lên dự án này đã thành công? §10 đo năng lực, không đo kết quả. *(Carry-over: addendum §1 Q2, Q3.)*

6. **Tầm nhìn sau v1.** Chuỗi "thanh toán online → tích hợp vận chuyển → thông báo" là lộ trình thật hay là suy đoán của brief? *(Carry-over: addendum §1 Q4.)*

7. **Desktop-first so với thực tế khách hàng.** Brief nói khách đến từ Facebook/Zalo — gần như chắc chắn là điện thoại. Phiên này chọn desktop-first. Phase UX nên xem lại độ vênh này.

8. **Không có thông báo, nhưng có phí giao hàng thay đổi.** Khách hàng chỉ biết phí nếu tự mở lại ứng dụng (§4.7, FR-21). Trên thực tế chủ shop sẽ vẫn nhắn Zalo — tức là vẫn còn một mảnh của quy trình cũ sống ngoài hệ thống. Chấp nhận được ở v1?

11. **Đơn chuyển khoản đã trả tiền thì kẹt vĩnh viễn.** FR-24 cấm huỷ đơn đã xác nhận nhận thanh toán — lựa chọn có ý thức ở phiên này, để tiền không rời sổ sách qua một quy trình hoàn tiền không tồn tại. Cái giá: khách chuyển khoản rồi đổi ý thì đơn chỉ còn một đường là đi tới `delivered`, và chủ shop xử lý ngoài hệ thống. Chấp nhận được ở v1, hay v1 cần một quy trình hoàn tiền tối thiểu?

12. **Chủ shop có cần giỏ hàng không?** §5 đặt ô "thêm vào giỏ" của chủ shop về `—`, khác với discovery, vì chủ shop không đặt đơn được nên giỏ đó không dùng để làm gì. Nếu Q4 được trả lời là "có, chủ shop đặt đơn hộ khách" thì ô này quay lại `✓` — hai câu này đi cùng nhau.

## 12. Chỉ mục giả định

Mọi `[ASSUMPTION]` trong tài liệu, gom lại để xác nhận. Dòng gạch ngang là giả định **đã thành quyết định** ở §11.1 — giữ lại để thấy được cái gì đã đổi so với bản nháp:

| Nguồn | Giả định |
|---|---|
| §4.1 FR-2 | Tìm kiếm phải khớp khi bỏ dấu tiếng Việt. |
| §4.1 FR-3 | Kích thước trang 24, trần 100 — do PRD đặt để thay tính từ bằng số. |
| §4.2 FR-5 | Sản phẩm hết hàng vẫn hiển thị nhưng không thêm vào giỏ được. |
| §4.2 FR-5 | Con số tồn kho chính xác không công khai cho khách hàng; chỉ hiện còn/hết. |
| §4.4 FR-9 | ~~Định danh đăng ký là số điện thoại (hoặc email)~~ — **đã quyết định: email** (§11.1 Q9). Không còn là giả định. |
| §4.4 FR-10 | Phiên hết hạn 30 ngày không hoạt động / 90 ngày tuyệt đối. |
| §4.4 FR-10 | Giới hạn 10 lần đăng nhập sai / 15 phút, không khoá vĩnh viễn. |
| §4.4 FR-10 | Mật khẩu tối thiểu 8 ký tự. |
| §4.5 FR-12 | Địa chỉ được điền sẵn từ đơn gần nhất; không có sổ địa chỉ riêng. |
| §4.5 FR-13 | Phương thức thanh toán không đổi được sau khi đặt đơn. |
| §4.7 FR-20 | Phí giao hàng chỉ nhập được khi đơn ở `placed`, để khách hàng giữ quyền huỷ. |
| §4.8 FR-23 | Thông tin ngân hàng do chủ shop cấu hình được. |
| §4.9 FR-25 | Giá sản phẩm phải > 0; không có hàng tặng. |
| §4.9 FR-28 | Sản phẩm bắt buộc có ít nhất một ảnh. |
| §4.9 FR-28 | Chỉ nhận JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh. |
| §4.4 FR-33 | Tài khoản chủ shop được tạo sẵn khi triển khai; không có đăng ký admin. |
| §9.3 | Ẩn danh hoá dữ liệu cá nhân 12 tháng sau `delivered`/`cancelled`. **[CHẶN]** |
| §10 | Không có mục tiêu kinh doanh định lượng nào được cung cấp. |
| §1, §11 Q6 | Lộ trình sau v1 là suy đoán của brief, không phải ý định đã nêu. |

**Kế thừa từ product brief, chưa đổi trạng thái:** chi phí hiện trạng, lý do build-vs-buy, nghiên cứu thị trường — cả ba vẫn để trống thay vì bị lấp bằng phỏng đoán. → §11.2 Q1, Q2.
