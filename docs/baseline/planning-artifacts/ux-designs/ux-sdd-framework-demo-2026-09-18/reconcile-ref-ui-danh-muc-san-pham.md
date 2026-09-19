# Đối chiếu đầu vào — `imports/ref-ui-danh-muc-san-pham.png`

Ảnh chụp giao diện quản trị FMCG ("Danh Mục Sản Phẩm, Bảng Giá & Room Giá NVKD"), do người dùng
cung cấp. Ràng buộc người dùng đặt ra: **màu bắt buộc giống**; bố cục và mật độ chỉ là tham khảo;
**không có chi tiết nào trong ảnh bị người dùng chê**.

Ảnh và PRD là **hai sản phẩm khác nhau** — ảnh là công cụ B2B nội bộ của nhà phân phối, PRD là
cửa hàng trực tuyến B2C của một shop bán lẻ. Việc đối chiếu vì vậy phải tách rõ: cái gì chuyển
được vì không thuộc nghiệp vụ, cái gì không chuyển được.

## 1. Ảnh đã đóng góp gì vào hai xương sống

| Lấy từ ảnh | Đi vào đâu | Cách lấy |
|---|---|---|
| 25 mã màu | `DESIGN.md` frontmatter `colors` | Script lấy mẫu pixel, không ước lượng bằng mắt |
| Chiều cao nút 38px / 35px, ô nhập 38px | `{spacing.control-height}`, `{spacing.control-height-sm}` | Đo vùng liên tục theo trục dọc |
| Bo góc 6px / 5px / bo tròn hết | `{rounded.md}`, `{rounded.sm}`, `{rounded.full}` | Đo độ thụt của mép theo từng hàng pixel ở góc |
| Chiều cao dòng bảng 104px, header bảng 45px | `{spacing.row-height}`, component `table-row` | Dò đường kẻ ngang, 4 dòng đều nhau |
| Cột điều hướng 83px, khe 32px | `{spacing.rail-width}`, `{spacing.gutter}` | Dò chuyển nền trắng → `#F4F5F6` |
| Cỡ chữ 18 / 15 / 14px | Thang `typography` | Chỉ đo vùng **chỉ có chữ số** — dấu tiếng Việt làm sai phép đo |
| Pill trạng thái có icon, bo tròn hết | component `status-pill` | Hình khối giữ, nghĩa đổi (xem §3) |
| Badge thuộc tính nền tím nhạt | component `badge-attr` | Giữ cả bảng màu tím ba lớp |
| Banner nêu phạm vi dữ liệu đang xem | component `banner-scope` | Giữ nguyên vai trò: nêu phạm vi, **không** báo thành công |
| Cột thao tác ghim bên phải | component `table-row` | Chỉ áp cho Trang quản trị |
| Mục điều hướng đang chọn: nền xanh nhạt + icon xanh | component `nav-item` | Giữ nguyên |

## 2. Cái gì trong ảnh **cố ý không** chuyển sang

| Trong ảnh | Vì sao không chuyển |
|---|---|
| Bảng 8 cột, mật độ rất cao | Đúng cho Trang quản trị, sai cho Trang bán hàng. Khách mua hàng không đọc bảng. Người dùng đã xác nhận bố cục chỉ là tham khảo |
| Chip lọc có đếm số ("Tất Cả 121 · Đồ uống 16") | Đã đưa ra lựa chọn, người dùng chọn **sidebar trái cố định** cho danh mục. Chip bị bỏ lại — xem §4 |
| Lối vào "Trợ Lý AI" | Không có trong phạm vi PRD |
| Nút "Nhập Excel", "Thao tác khác", "Ghim đính" | Không có FR nào tương ứng |
| Chuông thông báo có số đếm (12) | **Chỏi trực tiếp với PRD §6/§7.2**: sản phẩm không gửi thông báo cho ai. Đưa vào là phá ràng buộc nặng nhất của sản phẩm |
| Mã màn hình cạnh tiêu đề (`WF-WEB-08 · ADR-028`) | Quy ước tài liệu nội bộ của hệ khác |
| Bộ chọn kho, room giá, biên độ ±5% | Nghiệp vụ phân phối, không tồn tại trong PRD |
| Vai trò hiển thị ở header ("Giám đốc Vận hành") | PRD chỉ có một tài khoản quản trị duy nhất — không có gì để phân biệt |
| Trạng thái đổi được ngay trên dòng (dropdown trong ô) | Trạng thái đơn của sản phẩm này có ràng buộc chuyển tiếp (FR-24 khoá `Đã xác nhận` cho tới khi xác nhận thanh toán) → không thể là dropdown tự do |

## 3. Chỗ ảnh và sản phẩm dùng **cùng hình khối, khác nghĩa**

- **Pill trạng thái.** Trong ảnh: "Kinh doanh" — trạng thái kinh doanh của một SKU, đổi được tại chỗ.
  Ở đây: trạng thái đơn hàng, **chỉ đọc** ở Trang bán hàng, và ở Trang quản trị thì đổi qua hành động
  có ràng buộc chứ không qua dropdown.
- **Xanh lá.** Trong ảnh: giá sàn, biên độ, tồn kho — nhiều nghĩa cùng lúc. Ở đây `DESIGN.md` **khoá
  lại chỉ hai nghĩa**: tiền và tình trạng còn hàng.
- **Badge tím.** Trong ảnh: "2 quy cách" — một thuộc tính đóng gói. Ở đây: thuộc tính phân loại tĩnh,
  và có quy tắc cấm dùng tím cho thứ thay đổi theo thời gian.

## 4. Ý tưởng bị rơi — người dùng có thể muốn lấy lại

1. **Chip lọc có đếm số.** Trong ảnh nó cho biết ngay danh mục nào rỗng ("Thực phẩm 0") trước khi bấm.
   Sidebar trái đã chọn không mang con số này. Có thể thêm số đếm vào từng mục sidebar — chưa hỏi.
2. **Banner phạm vi đóng được, kèm gợi ý cách đổi.** Ảnh làm rất gọn: nêu phạm vi + chỉ chỗ đổi + nút
   đóng. Component `banner-scope` đã giữ hình khối nhưng chưa có surface nào trong PRD cần nêu phạm vi.
3. **Nhiều lớp thông tin trong một ô bảng** (tên + ngành hàng + badge đơn vị). Mẫu này hợp với dòng đơn
   hàng ở Trang quản trị, nhưng chưa được đưa vào `EXPERIENCE.md` như một pattern có tên.

## 5. Xung đột đã phát hiện và cách xử lý

- **`#A2ACB4` làm phụ đề và placeholder trong ảnh** — tương phản 2.31 trên nền trắng, trượt WCAG 2.1 AA
  (sàn người dùng đã chọn). Xử lý đã chốt: **giữ nguyên mã màu, thu hẹp phạm vi dùng** sang icon trang
  trí và đường phân cách; mọi chữ có nghĩa dùng `{colors.ink-secondary}` (4.97).
- **Chữ trắng trên nền vàng `#FEC020`** — 1.64. Không xuất hiện trong ảnh (vàng ở đó là avatar chữ đen),
  nhưng đã thành quy tắc cấm trong `DESIGN.md`.
- **Viền `#E8EAEC` (1.21) và `#A7F3D0` (1.28)** — dưới ngưỡng 3:1 của AA cho thành phần giao diện. Chấp
  nhận được khi viền chỉ trang trí; **không chấp nhận được** khi viền là tín hiệu duy nhất cho ô nhập
  đang lỗi. `DESIGN.md` vì vậy bắt ô lỗi phải có **chữ lỗi đặt dưới ô**, không chỉ đổi viền.
