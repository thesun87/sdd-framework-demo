# Feature Specification: Walking Skeleton

**Feature Branch**: `feature/000-walking-skeleton`

**Created**: 2026-09-19

**Status**: Draft

**Baseline**: `baseline-0001-ecommerce` (frozen 2026-09-19, `docs/baseline/baseline-freeze.yaml`)

**Input**: Hàng `000-walking-skeleton` của `docs/baseline/feature-map.md` — *"Khách mở được trang chủ, thấy một sản phẩm thật lấy từ database, tình trạng còn/hết của nó đúng dưới tải đồng thời, và trang phát đủ header an toàn."*

> **Artifact dẫn xuất.** Mọi yêu cầu dưới đây truy về một `FR-xxx` của `docs/baseline/prd.md`
> hoặc một `AD-xx` của `docs/baseline/architecture.md`. Spec này **không phát minh yêu cầu mới**
> (Constitution §I). FR-4 và FR-5 chỉ được hiện thực **một phần** ở đây; chúng hoàn chỉnh ở
> feature `001-catalog-browse`. Trùng lặp này là có chủ ý và đã ghi trong `feature-map.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Khách chưa đăng ký mở trang chủ và thấy một sản phẩm thật (Priority: P1)

Chị Hằng mở liên kết tới trang chủ từ một bài đăng, chưa đăng nhập. Trang trả về và chị thấy
ít nhất một Sản phẩm có thật: tên, giá bằng VND, ảnh, và nhãn tình trạng tồn kho. Con số chị
thấy đến từ dữ liệu được lưu trữ, không phải từ dữ liệu cứng trong giao diện.

**Why this priority**: đây là lát cắt dọc duy nhất của feature. Nếu nó chưa chạy thì không có
gì để chứng minh — mọi story còn lại đều đứng trên nó.

**Independent Test**: dựng hệ thống từ trạng thái sạch, nạp đúng một Sản phẩm qua đường dữ liệu
chính thức, mở trang chủ rồi mở trang chi tiết, đối chiếu từng trường hiển thị với dữ liệu đã nạp. Đổi dữ liệu ở
nguồn → tải lại trang → giá trị hiển thị đổi theo.

**Acceptance Scenarios**:

1. **Given** hệ thống vừa dựng sạch và có đúng một Sản phẩm với tồn kho > 0, **When** Khách chưa đăng ký mở trang chủ, **Then** trang trả HTTP 200 và hiển thị tên, giá và nhãn tình trạng tồn kho của Sản phẩm đó.
2. **Given** một Sản phẩm đang hiển thị, **When** giá của nó được đổi ở nguồn dữ liệu và trang được tải lại, **Then** giá hiển thị là giá mới — chứng minh dữ liệu không nằm trong mã giao diện.
3. **Given** trang chủ đang hiển thị, **When** đọc giá, **Then** giá là số nguyên VND đã gồm VAT, không có dòng thuế tách riêng và không có phần thập phân *(FR-4)*.
4. **Given** một Sản phẩm đang hiển thị trên trang chủ, **When** Khách bấm vào thẻ của nó, **Then** trang chi tiết mở ra với tên, mô tả, giá, ít nhất một ảnh và nhãn tình trạng tồn kho — không nút thêm vào giỏ *(FR-4, UX §457)*.
5. **Given** một Sản phẩm không tồn tại, **When** Khách mở đường dẫn chi tiết của nó, **Then** hệ thống trả HTTP 404 *(FR-4)*.
6. **Given** Sản phẩm có ít nhất một ảnh, **When** trang chủ hiển thị thẻ sản phẩm, **Then** ảnh đại diện là ảnh đầu tiên của Sản phẩm *(FR-4, UX §571)*.

---

### User Story 2 — Tình trạng còn/hết đúng, kể cả dưới tải đồng thời (Priority: P1)

Chị Hằng thấy nhãn **"Còn hàng"** hay **"Hết hàng"** phản ánh đúng con số tồn kho tại thời điểm
dựng trang. Khi nhiều người cùng lúc rút cùng một Sản phẩm, số lần rút thành công không bao giờ
vượt lượng tồn kho có thật, và tồn kho không bao giờ âm.

**Why this priority**: đây là **lý do feature 000 tồn tại**. Cam kết trung tâm của sản phẩm là
tồn kho đúng dưới tải đồng thời (`prd.md` §8, `architecture.md` AD-1). Một trang chủ chạy được
mà không chứng minh được điều này thì chưa chứng minh gì.

**Independent Test**: với Sản phẩm tồn kho M, chạy N tiến trình độc lập (N > M) cùng yêu cầu
giảm tồn kho 1 đơn vị; đếm số lần thành công. Không cần giao diện: đây là test ở tầng dữ liệu.

**Acceptance Scenarios**:

1. **Given** Sản phẩm có tồn kho > 0, **When** trang được dựng, **Then** nhãn là **"Còn hàng"** dưới dạng **chữ**, không chỉ bằng màu *(FR-5, UX §706)*.
2. **Given** Sản phẩm có tồn kho = 0, **When** trang được dựng, **Then** nhãn là **"Hết hàng"**, và Sản phẩm **vẫn hiển thị** chứ không bị ẩn khỏi lưới *(FR-5, UX §608)*.
3. **Given** bất kỳ vai trò nào trong `Khách chưa đăng ký` hoặc `Khách hàng`, **When** xem trang, **Then** trang **không** để lộ con số tồn kho chính xác ở bất kỳ đâu — kể cả trong dữ liệu thô mà trình duyệt nhận được *(FR-5)*.
4. **Given** tồn kho vừa đổi ở nguồn, **When** trang được tải lại, **Then** nhãn phản ánh giá trị mới ngay — phần tình trạng tồn kho **không được cache**, kể cả khi phần còn lại của trang có cache *(FR-5, AD-20)*.
5. **Given** Sản phẩm có tồn kho M và N tiến trình độc lập cùng yêu cầu rút 1 đơn vị (N > M), **When** cả N chạy đồng thời, **Then** **đúng M** lần thành công, **N − M** lần bị từ chối, tồn kho cuối bằng 0, và không thời điểm nào tồn kho âm *(AD-1, AD-21)*.
6. **Given** kịch bản ở (5), **When** chạy lại nhiều lần liên tiếp trên cùng một kho dữ liệu mà không dựng lại nó, **Then** kết quả giống hệt mỗi lần *(AD-28)*.
7. **Given** một yêu cầu rút tồn kho vượt lượng đang có, **When** hệ thống xử lý, **Then** "không có gì bị thay đổi" là kết quả **hợp lệ và được xử lý tường minh**, không phải một lỗi không lường trước *(AD-1)*.

---

### User Story 3 — Trang phát đủ header an toàn ngay từ ngày đầu (Priority: P1)

Mọi phản hồi trang mà trình duyệt nhận được đều mang chính sách bảo mật nội dung và các header
an toàn kèm theo, ngay từ feature đầu tiên.

**Why this priority**: quyết định giữ **một origin** (AD-8) đã chấp nhận có ý thức rằng một lỗ
XSS trên trang bán hàng phát được request mang cookie quản trị. Khi rủi ro đó được chấp nhận,
chính sách bảo mật nội dung là **thứ duy nhất còn lại** giữa lỗ hổng và toàn quyền Chủ shop.
AD-29 buộc nó hạ cánh **trong** feature 000, không phải sau: *"một bề mặt tồn tại trước lớp
phòng thủ của nó là một cửa sổ không ai đóng lại."*

**Independent Test**: gọi **cả đường dẫn bán hàng lẫn đường dẫn quản trị**, đọc header phản hồi,
đối chiếu từng directive với AD-29. Không phụ thuộc vào US1 hay US2.

**Acceptance Scenarios**:

1. **Given** bất kỳ phản hồi trang nào — **từ đường dẫn bán hàng hoặc đường dẫn quản trị** — **When** đọc header, **Then** có `Content-Security-Policy` chứa tối thiểu `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src 'self'` *(AD-29)*.
2. **Given** chính sách ở (1), **When** kiểm `script-src`, **Then** **không** có `'unsafe-inline'`, **không** có `'unsafe-eval'`, và **không** có nguồn CDN nào *(AD-29)*.
3. **Given** bất kỳ phản hồi trang nào, **When** đọc header, **Then** có `Referrer-Policy: same-origin` và `X-Content-Type-Options: nosniff` *(AD-29)*.
4. **Given** `style-src`, **When** kiểm, **Then** `'unsafe-inline'` được phép **chỉ ở đây** và không ở directive nào khác *(AD-29, nhượng bộ đã ghi trong baseline)*.
5. **Given** ứng dụng quản trị chưa được dựng ở feature này, **When** gọi đường dẫn quản trị, **Then** phản hồi — dù là gì — **vẫn mang đủ header an toàn**; lớp phòng thủ có trước bề mặt, không phải sau.

---

### Edge Cases

- **Sản phẩm hết hàng**: vẫn hiển thị trong lưới và vẫn mở được — ẩn đi thì người xem tưởng shop không bán món đó *(UX §608)*.
- **Chưa có Sản phẩm nào**: lưới rỗng hiển thị *"Danh mục này chưa có sản phẩm nào."* — đây là **danh sách rỗng, không phải lỗi** *(UX §604)*.
- **Đường dẫn chi tiết của Sản phẩm không tồn tại** → HTTP 404, không phải trang trắng hay lỗi hệ thống *(FR-4)*.
- **Đường dẫn sâu và nút back**: mọi đường dẫn không khớp tệp tĩnh phải trả về đúng ứng dụng tương ứng; đường dẫn API **không bao giờ** rơi vào fallback đó *(architecture.md — hợp đồng reverse proxy)*.
- **Rút tồn kho khi số đã đổi dưới tay**: "0 dòng bị ảnh hưởng" là kết quả hợp lệ, phải được xử lý *(AD-1)*.
- **Kho dữ liệu chưa sẵn sàng khi ứng dụng khởi động**: migration là bước **trước** khi ứng dụng chạy, không phải việc ứng dụng tự làm lúc boot *(AD-25)*.

## Requirements *(mandatory)*

### Functional Requirements

Mỗi FR dưới đây mang cột truy vết về PRD. **Không FR nào ở đây không có nguồn.**

- **FR-001** *(← PRD FR-4)*: Hệ thống PHẢI hiển thị cho mọi vai trò ít nhất một Sản phẩm có thật lấy từ kho dữ liệu, gồm tên, giá và ảnh đại diện.
- **FR-002** *(← PRD FR-4)*: Giá PHẢI hiển thị bằng số nguyên VND đã gồm VAT, không dòng thuế tách riêng, không phần thập phân.
- **FR-003** *(← PRD FR-4)*: Hệ thống PHẢI có **trang chi tiết Sản phẩm** hiển thị tên, mô tả, giá, ít nhất một ảnh và nhãn tình trạng tồn kho. Trang này tối giản: không nút thêm vào giỏ (FR-6 thuộc `003`), không sản phẩm liên quan, không đánh giá.
- **FR-004** *(← PRD FR-4)*: Yêu cầu tới một Sản phẩm không tồn tại PHẢI trả HTTP 404.
- **FR-005** *(← PRD FR-5)*: Hệ thống PHẢI hiển thị tình trạng tồn kho bằng đúng hai giá trị chữ — **"Còn hàng"** khi tồn kho > 0, **"Hết hàng"** khi tồn kho = 0 — và không bao giờ chỉ bằng màu.
- **FR-006** *(← PRD FR-5)*: Hệ thống PHẢI đọc tình trạng tồn kho trực tiếp từ con số tồn kho tại thời điểm dựng trang. Giá trị này KHÔNG ĐƯỢC cache ở bất kỳ tầng nào, kể cả khi phần còn lại của trang được cache.
- **FR-007** *(← PRD FR-5)*: Hệ thống KHÔNG ĐƯỢC để lộ con số tồn kho chính xác cho `Khách chưa đăng ký` và `Khách hàng` — chỉ còn/hết.
- **FR-008** *(← PRD FR-5, UX §608)*: Sản phẩm hết hàng PHẢI vẫn hiển thị trong lưới và vẫn mở được, không bị ẩn.

### Ràng buộc bắt buộc từ baseline *(không phải FR mới — đây là AD được phát biểu thành tiêu chí nghiệm thu)*

- **AC-AD1**: Tồn kho KHÔNG BAO GIỜ âm, qua bất kỳ đường nào. Mọi thay đổi tồn kho biểu diễn thành một delta áp có điều kiện trên giá trị đang có; **không đường nào đọc-rồi-ghi theo giá trị vừa đọc**. "0 dòng bị ảnh hưởng" là kết quả hợp lệ phải xử lý tường minh.
- **AC-AD21**: Feature này CHƯA XONG cho tới khi có **test tải đồng thời thật** mang tên nó: N tiến trình cùng rút từ một Sản phẩm tồn kho M → đúng M lần thành công. Test phải chạy được bằng lệnh trong `docs/baseline/verification.md`; nếu lệnh hiện tại không chạy tới nó thì **sửa `verification.md` trước**, không bỏ test.
- **AC-AD27**: Mọi test chạm tồn kho chạy trên kho dữ liệu thật cùng dòng phiên bản với môi trường chạy thật. **Không** kho dữ liệu trong bộ nhớ, **không** repository giả cho các đường này.
- **AC-AD28**: Test tranh chấp chạy trên **trạng thái đã commit**, dùng nhiều kết nối độc lập, dọn bằng `TRUNCATE` — **không bao giờ** bằng transaction rollback. Mọi test phải chạy lại được nhiều lần trên cùng một kho dữ liệu mà không dựng lại nó, và tự tạo dữ liệu nó cần.
- **AC-AD25**: Lược đồ dữ liệu dựng bằng migration tuần tự, **chỉ tiến**, áp từ **một nơi duy nhất**, là bước **trước khi** ứng dụng khởi động. Lược đồ của môi trường test dựng bằng đúng lệnh áp cho môi trường thật.
- **AC-AD29**: Header an toàn như mô tả ở User Story 3, hạ cánh **trong** feature này. Ứng dụng quản trị **không** được dựng ở `000` (hoãn tới `006`, theo cảnh báo trần 15 task của `feature-map.md`), nhưng reverse proxy PHẢI phát đủ header cho **cả hai đường dẫn** — đường dẫn bán hàng và đường dẫn quản trị — ngay từ bây giờ, bất kể đường dẫn quản trị hiện trả về gì. Bundle quản trị cắm vào sau không được phép mang theo nghĩa vụ đặt lại lớp phòng thủ.

### Key Entities

- **Product** (Sản phẩm): một món bán được. Có **đúng một** giá và **đúng một** con số tồn kho. Không có biến thể. Thuộc 0..1 Category. Có 0..n ảnh.
- **Stock** (Tồn kho): số nguyên ≥ 0 gắn với một Product — lượng bán được **ngay lúc này**. Ở feature này nó chỉ đổi qua đường rút tồn kho dùng để chứng minh AC-AD1/AC-AD21; đặt đơn (`004`) và điều chỉnh của Chủ shop (`010`) là feature khác.
- **Category** (Danh mục): nhóm phẳng để duyệt. Có mặt ở đây chỉ ở mức một Product thuộc về 0..1 Category; việc duyệt theo danh mục là của `001`.

> Dùng đúng cột *Canonical term (EN)* của `docs/baseline/glossary.md`. Module tồn kho tên
> **`stock`**, không phải `inventory` — từ đó nằm trong cột *Do NOT use*.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Từ một bản cài đặt sạch, một người mở trang chủ, bấm vào sản phẩm, và thấy tên, mô tả, giá, ảnh và tình trạng tồn kho của một Sản phẩm thật ở cả hai trang. Đổi dữ liệu ở nguồn rồi tải lại → giá trị hiển thị đổi theo, chứng minh không có dữ liệu cứng trong giao diện.
- **SC-002**: Với Sản phẩm tồn kho M và N tiến trình đồng thời cùng rút 1 đơn vị (N > M, N ≥ 20, M ≥ 5): **đúng M** lần thành công, tồn kho cuối bằng 0, không lần chạy nào cho tồn kho âm. Lặp lại ≥ 10 lần liên tiếp trên cùng kho dữ liệu: kết quả giống hệt.
- **SC-003**: Trang chủ hiển thị xong trong **≤ 1,5 giây ở p95**; đường đọc dữ liệu trả lời trong **≤ 400 ms ở p95** *(PRD §8)*.
- **SC-004**: 100% phản hồi trang mang đủ header an toàn của AD-29 — **đo trên cả đường dẫn bán hàng lẫn đường dẫn quản trị**, kể cả khi đường dẫn quản trị chưa có ứng dụng phía sau; không tài nguyên script nào từ ngoài origin tải được.
- **SC-005**: Con số tồn kho chính xác **không xuất hiện** trong bất cứ thứ gì trình duyệt của `Khách chưa đăng ký` hoặc `Khách hàng` nhận được — kiểm bằng cách đọc toàn bộ nội dung phản hồi, không chỉ nhìn màn hình.
- **SC-006**: Cả bốn lệnh của `docs/baseline/verification.md` (`test`, `lint`, `regression`, `build`) exit 0, và output cho thấy **nửa sản phẩm đã CHẠY**, không phải bị "skipped" — đây là lần đầu tiên điều đó đúng trong lịch sử repo *(verification.md §Definition of done #1)*.
- **SC-007**: Dựng lại toàn bộ hệ thống từ kho mã nguồn sạch bằng các bước đã ghi, không thao tác tay ngoài tài liệu, và đạt lại SC-001 tới SC-006.

## Assumptions

- **Đường rút tồn kho dùng để chứng minh AC-AD21 không phải đặt đơn.** Đặt đơn là `FR-14`, thuộc feature `004`. Ở `000`, tính nguyên tử của AD-1 được chứng minh **trực tiếp trên thao tác rút tồn kho ở tầng dữ liệu**, không qua luồng người dùng. `AD-28` nói thẳng E2E không phải nơi chứng minh bất biến.
- **Giỏ hàng nằm ngoài phạm vi.** `FR-5` có vế *"nút thêm vào giỏ bị vô hiệu hoá và API thêm vào giỏ từ chối"*, nhưng Giỏ hàng là `FR-6`–`FR-8`, thuộc feature `003`. Ở đây chỉ hiện thực phần **nhãn tình trạng**; vế giỏ hàng để lại cho `003`. Đây là lý do `feature-map.md` ghi FR-4, FR-5 *(một phần)*.
- **Duyệt danh mục, tìm kiếm, phân trang nằm ngoài phạm vi** — `FR-1`, `FR-2`, `FR-3`, thuộc `001`.
- **Trang chủ ở `000` không cần phân trang 24/trang** (UX §454): với một Sản phẩm, phân trang chưa quan sát được. Nó tới cùng `FR-3` ở `001`.
- **Trang chi tiết Sản phẩm CÓ trong phạm vi** *(quyết định 2026-09-19, Tuan Nguyen)*: bản tối giản theo UX §457 — tên, mô tả, giá, một ảnh, nhãn tồn kho. Không nút thêm vào giỏ, không sản phẩm liên quan. Đây là lựa chọn dày hơn mức `feature-map.md` hứa, đổi lấy việc FR-4 không còn nợ sang `001`.
- **Ứng dụng quản trị KHÔNG được dựng ở `000`** *(quyết định 2026-09-19, Tuan Nguyen)*: hoãn tới `006` theo cảnh báo trần 15 task. Đổi lại, cấu hình reverse proxy phát header an toàn cho **cả hai đường dẫn** ngay từ `000`, nên AD-29 vẫn được giữ nguyên chữ và nghĩa. **Hệ quả cho `006`:** feature đó chỉ cắm bundle vào một đường dẫn đã được bảo vệ sẵn — nó không được phép, và không cần, đặt lại chính sách bảo mật nội dung.
- **Dữ liệu Sản phẩm được nạp qua đường dữ liệu chính thức** (migration hoặc seed chạy bằng lệnh đã ghi), không phải chèn tay — nếu không thì SC-007 không lặp lại được.
- **Môi trường**: Docker + Docker Compose và kho dữ liệu thật là **điều kiện tiên quyết** của feature này (`verification.md` §Prerequisites). `docs/tooling-versions.md` ghi nhận Docker **chưa dùng được** trong distro WSL hiện tại — đây là chặn phải gỡ trước khi cổng nghiệm thu của `000` đi qua được.
- **Trần 15 task.** Nếu `/speckit-tasks` vượt trần, thứ được cắt là **ứng dụng quản trị** (hoãn tới `006`) — **không phải** test tải đồng thời của AD-21, **không phải** chính sách bảo mật nội dung của AD-29. Cảnh báo này đã ghi sẵn trong `feature-map.md`.

## Dependencies

- Không phụ thuộc feature nào (`feature-map.md`: `Depends on: —`). Đây là feature đầu tiên.
- `001` tới `012` đều phụ thuộc trực tiếp hoặc gián tiếp vào nó.
