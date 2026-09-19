---
title: "Addendum — PRD Shop Online"
status: final
created: 2026-09-18
updated: 2026-09-18
---

# Addendum — PRD Shop Online

Tài liệu này gom những vấn đề nảy sinh trong lúc viết PRD nhưng thuộc về tài liệu hạ nguồn, không thuộc mạch chính của nó. Đây là phụ lục để tra cứu, không phải để đọc tuần tự — mỗi mục có một người nhận cụ thể:

| Người nhận | Đọc mục |
|---|---|
| `bmad-architecture` | §1 chống bán quá tồn kho · §2 sổ cái thay đổi tồn kho · §3 tìm kiếm ở Y3 |
| `bmad-architecture` + `bmad-ux` | §4 các phương án đã bị loại |
| `bmad-ux` | §5 bề mặt và điều hướng |
| `/speckit-clarify` | §6 khôi phục mật khẩu |
| `/speckit-plan` | §7 điều kiện kiểm chứng SM-1 |

Bảng NFR đầy đủ, lý do loại cổng thanh toán, và tám câu hỏi mở gốc nằm ở `../../briefs/brief-sdd-framework-demo-2026-09-18/addendum.md` và **không** được chép lại ở đây. Thông tin kiểm toán và override cũng không nằm ở đây — chúng nằm ở `.memlog.md`.

---

## 1. Chống bán quá tồn kho — các cơ chế đã cân nhắc

Đích đến: tài liệu kiến trúc. FR-14 nêu **cái gì** phải đúng; mục này ghi lại những lựa chọn **cách làm** đã được cân nhắc, để phase kiến trúc không phải suy diễn lại từ đầu.

**Khuynh hướng, không phải quyết định:** cách thứ nhất trong bảng — ràng buộc ở tầng dữ liệu — là rẻ nhất mà vẫn đúng ở quy mô 5 đơn/phút, và nó làm bất biến trở thành thuộc tính của dữ liệu chứ không phải của code. Phase kiến trúc quyết định; PRD chỉ ràng buộc kết quả. Bảng dưới là cơ sở của khuynh hướng đó.

| Cơ chế | Hoạt động ra sao | Điểm mạnh | Điểm yếu |
|---|---|---|---|
| **Ràng buộc ở tầng dữ liệu** (`stock >= 0` như một check constraint, trừ tồn kho bằng câu lệnh có điều kiện) | `UPDATE … SET stock = stock - n WHERE stock >= n`; số dòng bị ảnh hưởng = 0 nghĩa là không đủ tồn kho | Bất biến được chính tầng lưu trữ bảo đảm, không dựa vào code ứng dụng; đúng kể cả khi có nhiều tiến trình | Cần một câu lệnh cho mỗi dòng đơn hàng, tất cả trong một transaction; thứ tự khoá phải cố định để tránh deadlock |
| **Khoá bi quan** (khoá dòng sản phẩm rồi mới kiểm tra) | `SELECT … FOR UPDATE` từng sản phẩm theo thứ tự cố định | Dễ suy luận; đọc code là hiểu | Tranh chấp tăng ở sản phẩm bán chạy; giữ khoá suốt transaction làm p95 đặt đơn khó đạt ngưỡng 1,0 s |
| **Khoá lạc quan** (phiên bản dòng + thử lại) | Đọc phiên bản, ghi kèm điều kiện phiên bản, thử lại khi xung đột | Tranh chấp thấp ở đường thông thường | Cần chính sách thử lại; ở đúng tình huống UJ-6 (nhiều người tranh món cuối) thì đây lại là phương án tệ nhất |
| **Hàng đợi tuần tự hoá đặt đơn** | Đẩy yêu cầu đặt đơn qua một hàng đợi, xử lý tuần tự | Loại bỏ hoàn toàn tranh chấp | Đặt đơn thành bất đồng bộ — phá vỡ kỳ vọng "khách thấy mã đơn ngay" ở UJ-1, và thêm một thành phần hạ tầng vào một hệ thống cố ý không phụ thuộc gì bên ngoài |

Điều kiện kiểm chứng áp dụng cho **mọi** cơ chế trong bảng nằm ở §7: nó gác SM-1 và là thứ dễ bị bỏ sót nhất trong tài liệu này.

---

## 2. Sổ cái thay đổi tồn kho

Đích đến: mô hình dữ liệu trong tài liệu kiến trúc.

**Khuynh hướng:** cột tồn kho được duy trì, cộng một job đối chiếu định kỳ so cột với sổ cái. Chênh lệch là một sự cố, không phải một cảnh báo.

FR-27 yêu cầu mọi thay đổi tồn kho đều để lại dấu vết và cộng dồn lại phải khớp con số hiện tại. Cách làm tự nhiên là một sổ cái chỉ ghi thêm (append-only), mỗi dòng gồm: sản phẩm, delta, giá trị sau, nguyên nhân (`order_placed` | `order_cancelled` | `manual_adjustment`), mã đơn (nếu có), thời điểm, tài khoản thực hiện.

Câu hỏi thiết kế còn lại cho phase kiến trúc: con số tồn kho là **cột được duy trì** (sổ cái là bản sao để kiểm toán) hay là **kết quả cộng dồn sổ cái** (không có cột tồn kho)?

- Cột được duy trì: đọc nhanh, phù hợp với p95 ≤ 400 ms ở FR-5; rủi ro là cột và sổ cái lệch nhau.
- Cộng dồn: không thể lệch; đọc đắt, và ở 300.000 đơn thì gần như chắc chắn cần bảng tổng hợp — tức là quay lại vấn đề cũ dưới tên khác.

---

## 3. Tìm kiếm ở quy mô Y3

Đích đến: tài liệu kiến trúc.

FR-2 yêu cầu tìm theo tên có bỏ dấu; FR-3 và PRD §8 yêu cầu p95 ≤ 400 ms ở 20.000 sản phẩm.

Điểm cần lưu ý cho phase kiến trúc: yêu cầu "bỏ dấu vẫn khớp" thường bị cài đặt bằng cách chuẩn hoá lúc truy vấn, và cách đó phá index. Cách bền hơn là lưu sẵn một cột tên đã chuẩn hoá (bỏ dấu, chữ thường) và đánh index trên nó — chuẩn hoá lúc ghi, không phải lúc đọc.

20.000 bản ghi là quy mô mà cơ sở dữ liệu quan hệ vẫn tìm kiếm thoải mái. Không có gì trong PRD đòi hỏi một công cụ tìm kiếm riêng, và thêm một cái vào sẽ mâu thuẫn với tinh thần "hệ thống không nói chuyện với bất cứ thứ gì bên ngoài" (PRD §6). Thêm một công cụ tìm kiếm riêng vì thế là một phương án bị loại; §4 giải thích quy ước ghi các phương án đó.

---

## 4. Các phương án đã bị loại và lý do

Đích đến: tài liệu kiến trúc và UX spec — để không ai đề xuất lại chúng ở review.

**Quy ước:** mục này giữ các phương án bị loại **không có mục riêng của mình**. Phương án bị loại thuộc về một chủ đề đã có mục thì nằm ngay trong mục đó — hàng đợi tuần tự hoá ở §1, cộng dồn sổ cái ở §2, công cụ tìm kiếm riêng ở §3. Chỉ đọc §4 thì chưa đủ để biết những gì đã bị loại.

**Giữ chỗ tồn kho trong giỏ hàng.** Giữ chỗ khoá hàng cho những giỏ bị bỏ quên, và kéo theo cả một cơ chế hết hạn: bao lâu, dọn ra sao, khách đang thanh toán mà hết hạn thì sao. Thay bằng cam kết rẻ hơn hẳn mà giải quyết đúng vấn đề của shop — tồn kho đúng **tại thời điểm đặt đơn** (FR-14).

**Một trạng thái mới cho việc khách duyệt phí giao hàng.** Vấn đề có thật: phí giao hàng xuất hiện sau khi khách hàng đã đặt, nên nếu chủ shop nhập phí lúc chuyển đơn sang `confirmed` thì khách hàng bị cộng tiền đúng lúc mất quyền huỷ. Một trạng thái `awaiting_customer_approval` giải quyết được, nhưng làm vòng đời đơn hàng phình ra và thêm một nhánh mà khách hàng có thể bỏ lửng vô hạn. Thay bằng: nhập phí khi đơn còn ở `placed`, không đổi trạng thái (FR-20) — cùng kết quả, 0 trạng thái mới, và khớp với việc chủ shop dù sao cũng vẫn nhắn Zalo cho khách.

**Cho phép đảo ngược `delivered`.** Trả hàng nằm ngoài phạm vi, nên đảo ngược `delivered` là cánh cửa dẫn tới một luồng không tồn tại. Thay bằng một bước xác nhận riêng ở FR-19 — chặn đúng rủi ro thật sự: nhấp nhầm.

**Sổ địa chỉ của khách hàng.** Địa chỉ như một thực thể riêng làm tăng lượng dữ liệu cá nhân trong hệ thống và tạo tập bản ghi thứ hai phải xử lý trong chính sách ẩn danh hoá (PRD §9.3). Thay bằng điền sẵn từ đơn gần nhất (FR-12) — gần như trọn lợi ích, 0 thực thể mới.

**Danh mục phân cấp nhiều tầng.** Với 2.000 sản phẩm, danh mục phẳng cộng tìm kiếm là đủ để duyệt. Thay bằng danh mục phẳng (FR-26); ở 20.000 sản phẩm (Y3) thì đáng xem lại, và đó là một feature Track B.

---

## 5. Bề mặt và điều hướng — đầu vào cho phase UX

Đích đến: `bmad-ux` (DESIGN.md / EXPERIENCE.md).

Một web app responsive, desktop-first, phục vụ cả hai vai trò. Các bề mặt cấp cao nhất:

**Storefront (công khai)** — trang chủ/danh sách sản phẩm · danh mục · chi tiết sản phẩm · giỏ hàng · đăng ký/đăng nhập · đặt đơn · xác nhận đơn · lịch sử đơn của tôi · chi tiết đơn của tôi.

**Back office (chủ shop)** — đăng nhập · danh sách đơn (lọc theo trạng thái) · chi tiết đơn · danh sách sản phẩm · sửa sản phẩm · danh mục · điều chỉnh tồn kho.

**Về độ vênh desktop-first (PRD §11 Q7):** Back office rõ ràng là desktop; storefront thì đáng cân nhắc lại. Phase UX quyết định; tài liệu này không tự sửa.

**Khoảnh khắc UX nặng nhất trong sản phẩm:** đơn bị từ chối vì hết hàng (FR-14). Khách hàng đã điền địa chỉ, đã chọn thanh toán, đã bấm đặt. Thông báo phải nói rõ dòng nào không đủ, giữ nguyên phần còn lại của giỏ, và không làm khách cảm thấy mình vừa mất công vô ích. Thiết kế màn hình này chính là phần lớn giá trị của việc chống bán quá tồn kho — nếu không thì khách chỉ đơn giản là thất vọng ở một chỗ khác.

---

## 6. Những gì khôi phục mật khẩu chạm phải

Đích đến: `/speckit-clarify`, và PRD §11 Q9–Q10 — hai câu hỏi phải trả lời cùng nhau.

**Q9 (định danh đăng nhập) quyết định Q10.** Nếu định danh là email thì tồn tại một kênh gửi tự nhiên, và khôi phục mật khẩu trở thành bài toán quen thuộc — nhưng đưa email vào phạm vi thì phá vỡ "hệ thống không nói chuyện với bất cứ thứ gì bên ngoài" (PRD §6). Nếu định danh là số điện thoại thì kênh duy nhất là SMS, cũng ngoài phạm vi. Chọn định danh trước, rồi Q10 mới trả lời được.

Chưa có FR nào cho khôi phục mật khẩu, và đó không phải sơ suất — nó kẹt giữa hai quyết định phạm vi. Ba phương án, để `/speckit-clarify` chọn:

- **Chủ shop đặt lại mật khẩu qua back office** — thêm một quyền vào ma trận quyền đã đóng băng, và đưa con người trở lại đúng luồng mà sản phẩm này sinh ra để loại họ khỏi đó.
- **Không có khôi phục ở v1** — khách hàng mất mật khẩu thì tạo tài khoản mới, và mất lịch sử đơn.
- **Đưa một kênh gửi vào phạm vi chỉ cho riêng việc này** — phá vỡ ràng buộc gánh vác nhiều nhất trong PRD §6.

Không lựa chọn nào hiển nhiên. Cần một người có thẩm quyền chọn trước khi chạy `/speckit-specify`.

---

## 7. Điều kiện kiểm chứng SM-1

Đích đến: `/speckit-plan` — kế hoạch test.

Dù phase kiến trúc chọn cơ chế nào trong §1, phải có **một test tải đồng thời thật**: N tiến trình cùng đặt đơn cho một sản phẩm có tồn kho M, và số đơn thành công phải bằng đúng M — không hơn, không kém.

Test này là bằng chứng của SM-1, và là thứ duy nhất chứng minh được cam kết ở PRD §1. Không có nó, "không bao giờ bán quá tồn kho" chỉ là một câu trong tài liệu.
