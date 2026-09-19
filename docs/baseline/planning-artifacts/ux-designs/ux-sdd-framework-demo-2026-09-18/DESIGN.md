---
name: Shop Online
description: Cửa hàng trực tuyến cho shop bán lẻ một chủ. Sáng, sạch, dữ liệu nói trước. Màu lấy nguyên từ giao diện quản trị mà chủ shop đã quen.
status: final
updated: 2026-09-18
colors:
  brand-primary: '#0070CE'
  brand-strong: '#005AA6'
  brand-tint: '#F0F8FF'
  surface-card: '#FFFFFF'
  surface-app: '#F4F5F6'
  surface-subtle: '#F8FAFC'
  border-default: '#E8EAEC'
  border-subtle: '#E2E8F0'
  ink-primary: '#232628'
  ink-strong: '#1E293B'
  ink-secondary: '#687179'
  ink-muted: '#64748B'
  ink-decorative: '#A2ACB4'
  success: '#059669'
  success-bar: '#10B981'
  success-ink: '#06763A'
  success-bg: '#ECFDF5'
  success-border: '#A7F3D0'
  info-bg: '#F0FDF4'
  info-ink: '#15803D'
  accent-purple: '#7E22CE'
  accent-purple-bg: '#FAF5FF'
  accent-purple-border: '#E9D5FF'
  danger: '#D93843'
  danger-bg: '#FDECEE'
  danger-border: '#F5C2C7'
  amber: '#FEC020'
typography:
  font-family:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    note: 'Đã chốt: font hệ thống. Tải tức thì, không tốn request nào, và dấu tiếng Việt luôn hiển thị đúng vì dùng font có sẵn của máy. Đổi lại: máy Windows và máy Mac trông khác nhau đôi chút.'
  page-title:
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.3
  page-subtitle:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  section-title:
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  price:
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
  price-secondary:
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  table-label:
    fontSize: 13px
    fontWeight: 600
    letterSpacing: 0.04em
    note: 'Viết hoa toàn bộ. Chỉ dùng cho header bảng trong Trang quản trị.'
  badge:
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 5px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
  gutter: 32px
  control-height: 38px
  control-height-sm: 35px
  row-height: 104px
  rail-width: 83px
components:
  button-primary:
    background: '{colors.brand-primary}'
    color: '{colors.surface-card}'
    height: '{spacing.control-height}'
    radius: '{rounded.md}'
    padding-x: '{spacing.4}'
    font: '{typography.body-strong}'
  button-secondary:
    background: '{colors.surface-card}'
    color: '{colors.ink-strong}'
    border: '1px solid {colors.border-default}'
    height: '{spacing.control-height-sm}'
    radius: '{rounded.sm}'
    padding-x: '{spacing.3}'
  button-danger:
    background: '{colors.danger}'
    color: '{colors.surface-card}'
    height: '{spacing.control-height}'
    radius: '{rounded.md}'
  input:
    background: '{colors.surface-subtle}'
    border: '1px solid {colors.border-subtle}'
    height: '{spacing.control-height}'
    radius: '{rounded.md}'
    placeholder-color: '{colors.ink-secondary}'
    focus-ring: '2px solid {colors.brand-primary}'
  status-pill:
    height: 22px
    radius: '{rounded.full}'
    padding-x: '{spacing.2}'
    font: '{typography.badge}'
    da-dat-bg: '{colors.surface-subtle}'
    da-dat-ink: '{colors.ink-secondary}'
    da-xac-nhan-bg: '{colors.brand-tint}'
    da-xac-nhan-ink: '{colors.brand-strong}'
    dang-giao-bg: '{colors.amber}'
    dang-giao-ink: '{colors.ink-primary}'
    da-giao-bg: '{colors.ink-primary}'
    da-giao-ink: '{colors.surface-card}'
    da-huy-bg: '{colors.surface-card}'
    da-huy-ink: '{colors.danger}'
    da-huy-border: '1px solid {colors.danger}'
  stock-label:
    height: 22px
    radius: '{rounded.full}'
    con-hang-bg: '{colors.success-bg}'
    con-hang-ink: '{colors.success-ink}'
    con-hang-border: '1px solid {colors.success-border}'
    het-hang-bg: '{colors.surface-card}'
    het-hang-ink: '{colors.danger}'
    het-hang-border: '1px solid {colors.danger}'
  badge-attr:
    background: '{colors.accent-purple-bg}'
    color: '{colors.accent-purple}'
    border: '1px solid {colors.accent-purple-border}'
    radius: '{rounded.sm}'
    font: '{typography.badge}'
  nav-item:
    background-active: '{colors.brand-tint}'
    color-active: '{colors.brand-primary}'
    color-rest: '{colors.ink-muted}'
    radius: '{rounded.md}'
  product-card:
    background: '{colors.surface-card}'
    border: '1px solid {colors.border-default}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
  table-row:
    height: '{spacing.row-height}'
    divider: '1px solid {colors.border-default}'
    background-hover: '{colors.surface-subtle}'
  banner-scope:
    background: '{colors.info-bg}'
    color: '{colors.info-ink}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
---

# Shop Online — Xương sống thị giác

> Tài liệu này sở hữu **hình thức**. `EXPERIENCE.md` sở hữu **hành vi**.
> Khi tài liệu này chỏi với bất kỳ mock, wireframe hay ảnh import nào, **tài liệu này thắng**.
>
> **Mock tham chiếu** (dựng từ chính các token trong tài liệu này, mở offline được):
> [Trang chủ](mockups/trang-chu.html) · [Đơn chưa đặt được](mockups/don-chua-dat-duoc.html) ·
> [Chi tiết đơn hàng của tôi](mockups/chi-tiet-don-cua-toi.html) ·
> [Trang quản trị — Danh sách đơn hàng](mockups/quan-tri-danh-sach-don.html) ·
> [Bảng màu trích xuất](mockups/palette-extract.html).
> Mock **minh hoạ**, tài liệu này **là hợp đồng**. Mock sai thì sửa mock.
>
> Nguồn màu: `imports/ref-ui-danh-muc-san-pham.png` — người dùng ràng buộc **màu phải giống**, bố cục chỉ là tham khảo.
> Số đo hình khối lấy bằng script lấy mẫu pixel trên chính ảnh đó. Bảng màu đầy đủ: [`mockups/palette-extract.html`](mockups/palette-extract.html).

## Brand & Style

Đây là cửa hàng của **một người**. Không có phòng marketing, không có nhiếp ảnh sản phẩm chuyên nghiệp, không có ngân sách hoạt hoạ. Giao diện phải làm cho ảnh chụp bằng điện thoại của chủ shop trông tử tế, chứ không phải đòi hỏi thứ chủ shop không có.

Thái độ: **sáng, sạch, dữ liệu nói trước**. Nền trắng và xám rất nhạt, một màu xanh dương duy nhất để chỉ chỗ bấm, xanh lá chỉ dành cho tiền và tình trạng còn hàng. Không gradient, không bóng đổ nặng, không màu nền lớn. Cái gì tô màu là cái đó có nghĩa.

Hai bề mặt — **Trang bán hàng** và **Trang quản trị** — dùng chung một bảng màu để chủ shop không phải học hai hệ thống, nhưng **khác nhau về mật độ**: Trang bán hàng thở, mỗi sản phẩm một thẻ; Trang quản trị dày, mỗi dòng bảng mang nhiều lớp thông tin.

Sản phẩm này không bao giờ gửi tin nhắn cho ai. Vì vậy màn hình phải **nói hết ngay tại chỗ** — không có email xác nhận nào đến sau để cứu một thông báo viết ẩu.

## Colors

Toàn bộ mã màu dưới đây lấy trực tiếp từ ảnh chuẩn, không phải phỏng đoán.

**Xanh thương hiệu.** `{colors.brand-primary}` `#0070CE` là màu duy nhất của *chỗ bấm được*: nút chính, mục điều hướng đang chọn, vòng focus. `{colors.brand-strong}` `#005AA6` đậm hơn một bậc, dành cho **chữ** — tên sản phẩm dạng liên kết, nhãn trên nền `{colors.brand-tint}`. Không dùng xanh thương hiệu cho chữ chạy trong đoạn văn: xanh ở đây có nghĩa là bấm được.

**Nền.** `{colors.surface-card}` trắng là mặt làm việc — thẻ, dòng bảng, thanh trên, sidebar. `{colors.surface-app}` `#F4F5F6` là nền ngoài, để các thẻ trắng nổi lên mà không cần bóng. `{colors.surface-subtle}` `#F8FAFC` dành cho phần *ở dưới* nội dung: header bảng, ô nhập, chip mã.

**Chữ.** Bốn bậc, và bậc thứ năm không phải chữ. `{colors.ink-primary}` cho tiêu đề và con số tiền. `{colors.ink-strong}` cho nhãn trên nút phụ. `{colors.ink-secondary}` cho mọi chữ phụ **có nghĩa** — mô tả, nhãn phụ, placeholder. `{colors.ink-muted}` cho icon chưa chọn. `{colors.ink-decorative}` `#A2ACB4` **không được dùng cho chữ** (xem *Do's and Don'ts*).

**Xanh lá là tiền và là hàng còn.** `{colors.success}` cho con số giá được nhấn; `{colors.success-bar}` cho thanh biểu thị; `{colors.success-ink}` trên `{colors.success-bg}` viền `{colors.success-border}` cho pill "Còn hàng". `{colors.info-bg}` + `{colors.info-ink}` dành riêng cho dải banner nêu phạm vi dữ liệu đang xem.

**Tím** `{colors.accent-purple}` là màu của **thuộc tính phân loại** — thứ mô tả sản phẩm chứ không mô tả trạng thái của nó. Không dùng tím cho bất cứ thứ gì thay đổi theo thời gian.

**Đỏ và vàng.** `{colors.danger}` `#D93843` nâng lên từ badge số thông báo trong ảnh; nay là màu chuẩn cho lỗi và hành động phá huỷ. `{colors.amber}` `#FEC020` nâng lên từ màu avatar; nay là màu cảnh báo — thứ chưa hỏng nhưng cần nhìn. `[ASSUMPTION]` `danger-bg` `#FDECEE` và `danger-border` `#F5C2C7` **không có trong ảnh**, được suy ra để dựng khối lỗi; cần người duyệt. Lưu ý đã đo: `{colors.danger}` đặt trên `danger-bg` chỉ đạt **4.00**, trượt AA — nên nền hồng này chỉ dùng cho **khối lỗi có chữ màu mực**, không dùng làm nền cho chữ đỏ.

**Không có chế độ tối ở v1** — đã chốt. Ảnh chuẩn chỉ có giao diện sáng, và định nghĩa một bộ token tối sẽ buộc phải suy ra màu không có trong ảnh, tức là nới chính ràng buộc "màu giống ảnh". Token không đặt sẵn hậu tố `-dark`; khi nào cần chế độ tối thì đó là một lượt sửa có chủ đích, không phải chỗ trống chờ điền.

## Typography

Font hệ thống, theo quyết định đã chốt — xem `{typography.font-family}`. Mọi số đo dưới đây lấy từ ảnh chuẩn.

| Vai trò | Cỡ | Đậm | Dùng ở đâu |
|---|---|---|---|
| `{typography.page-title}` | 21px | 600 | Tên màn hình, một cái duy nhất mỗi trang |
| `{typography.section-title}` | 17px | 600 | Tiêu đề khối trong trang |
| `{typography.body}` | 14px | 400 | Nền tảng của mọi thứ |
| `{typography.body-strong}` | 14px | 600 | Nhãn nút, tên sản phẩm trong danh sách |
| `{typography.price}` | 18px | 700 | Giá — bậc lớn thứ nhì sau tiêu đề trang, vì đây là con số khách đọc kỹ nhất |
| `{typography.price-secondary}` | 15px | 600 | Tổng tiền hàng, giá phụ trong dòng |
| `{typography.meta}` | 13px | 400 | Ngày đặt, mã đơn, chú thích |
| `{typography.table-label}` | 13px | 600 | Header bảng, viết hoa, giãn chữ 0.04em — **chỉ** ở Trang quản trị |
| `{typography.badge}` | 12px | 500 | Pill và badge |

Số đo lấy từ vùng **chỉ có chữ số** trong ảnh (giá 18px, giá phụ 15px, số đếm 14px) vì dấu tiếng Việt làm sai lệch phép đo chiều cao chữ. Sai số ±1px.

Tiếng Việt có dấu chồng lên chữ hoa. Vì vậy `line-height` không bao giờ dưới **1.3**, kể cả ở tiêu đề — dấu bị cắt là lỗi hiển thị, không phải lựa chọn thẩm mỹ. Không dùng `text-transform: uppercase` cho chữ chạy: chữ hoa toàn phần làm dấu tiếng Việt chen nhau.

Tiền luôn viết theo lối Việt: `330.000 ₫`, dấu chấm phân nhóm nghìn. Không rút gọn thành `330k` ở bất cứ đâu trong sản phẩm.

## Layout & Spacing

Thang giãn cách chạy theo bội của 4, và mọi khoảng cách đều lấy từ thang đó: `{spacing.1}` 4px cho khe giữa nhãn và giá trị, `{spacing.2}` 8px trong pill, `{spacing.3}` 12px giữa các phần tử cùng nhóm, `{spacing.4}` 16px cho đệm trong thẻ, `{spacing.6}` 24px giữa các khối, `{spacing.8}` 32px cho `{spacing.gutter}` — khoảng cách giữa cột điều hướng và vùng nội dung, đo được trong ảnh.

Chiều cao điều khiển là hằng số: `{spacing.control-height}` 38px cho nút chính và ô nhập, `{spacing.control-height-sm}` 35px cho nút phụ nằm trong dòng bảng. Một dòng bảng trong Trang quản trị cao `{spacing.row-height}` 104px — đủ cho ba lớp thông tin chồng nhau mà không phải nheo mắt. Cột điều hướng rộng `{spacing.rail-width}` 83px khi chỉ hiện icon.

**Trang bán hàng**: sidebar trái cố định chứa danh mục phẳng, lưới sản phẩm chiếm phần còn lại. `[ASSUMPTION]` Lưới 4 cột ở màn hình rộng, 3 cột khi hẹp hơn, 2 cột ở máy tính bảng, 1 cột trên điện thoại.

**Trang quản trị**: rail icon bên trái, nội dung là thẻ trắng trên nền `{colors.surface-app}`, bảng chiếm gần trọn bề ngang.

Sản phẩm này **desktop-first** ở cả hai bề mặt theo quyết định đã chốt. Điện thoại được phục vụ bằng cách thu gọn xuống, không có bố cục riêng. Hệ quả của lựa chọn này nằm ở `EXPERIENCE.md` mục *Responsive & Platform*.

## Elevation & Depth

Không có ngôn ngữ bóng đổ. Độ sâu đến từ **chênh lệch nền**: trắng nổi trên `{colors.surface-app}`, `{colors.surface-subtle}` lùi xuống dưới trắng. Một đường viền `{colors.border-default}` 1px đủ để tách hai vùng cùng màu.

Ngoại lệ duy nhất: lớp phủ và menu thả xuống được dùng một bóng nhẹ để tách khỏi nội dung phía sau — `0 4px 12px rgba(35, 38, 40, 0.08)`. `[ASSUMPTION]` Không đo được từ ảnh.

## Shapes

Bo góc nhỏ, dứt khoát, đo từ ảnh: `{rounded.sm}` 5px cho nút phụ và ô nhập, `{rounded.md}` 6px cho nút chính và banner, `{rounded.lg}` 8px cho thẻ sản phẩm `[ASSUMPTION]`, `{rounded.full}` cho pill trạng thái — pill cao 22px bo tròn hết hai đầu.

Quy tắc: **bo tròn hoàn toàn chỉ dành cho pill trạng thái**. Khi một khối bo tròn hết, nó đang nói "tôi là một trạng thái, không phải một cái nút".

## Components

**button-primary** — Nền `{colors.brand-primary}`, chữ trắng, cao 38px, bo `{rounded.md}`. Mỗi màn hình có nhiều nhất **một** nút chính. Trạng thái vô hiệu: giữ nguyên hình khối, giảm độ đậm màu nền, con trỏ không đổi thành bàn tay — và **luôn kèm lý do bằng chữ** bên cạnh, không để khách đoán vì sao không bấm được.

**button-secondary** — Nền trắng, viền `{colors.border-default}`, chữ `{colors.ink-strong}`, cao 35px, bo `{rounded.sm}`. Dùng cho hành động trong dòng và cho lối thoát ("Về giỏ hàng").

**button-danger** — Nền `{colors.danger}`, chữ trắng. Chỉ dùng cho hành động **không thể hoàn tác**. Không bao giờ là nút chính của một màn hình mà khách đến với ý định khác.

**input** — Nền `{colors.surface-subtle}`, viền `{colors.border-subtle}`, cao 38px. Focus: vòng 2px `{colors.brand-primary}`. Lỗi: viền `{colors.danger-border}`, chữ lỗi `{colors.danger}` **đặt dưới ô, không phải tooltip** — thông báo lỗi phải đọc được khi không di chuột.

**status-pill** — Cao 22px, bo tròn hết, chữ 12px. Năm trạng thái đơn hàng dùng chung hình khối, khác nhau ở màu — và màu đi theo **tiến độ**, đậm dần rồi kết lại, chứ không theo tốt/xấu:

| Trạng thái | Nền | Chữ | Tương phản |
|---|---|---|---|
| Đã đặt | `{colors.surface-subtle}` | `{colors.ink-secondary}` | 4.75 |
| Đã xác nhận | `{colors.brand-tint}` | `{colors.brand-strong}` | 6.50 |
| Đang giao | `{colors.amber}` | `{colors.ink-primary}` | 9.26 |
| Đã giao | `{colors.ink-primary}` | `{colors.surface-card}` | 15.22 |
| Đã huỷ | `{colors.surface-card}` + viền `{colors.danger}` | `{colors.danger}` | 4.57 |

**Đã giao** là điểm cuối nên nó trầm và đặc, không reo mừng — xanh lá bị khoá nghĩa cho tiền và tình trạng còn hàng nên không được dùng ở đây. **Đã huỷ** là pill duy nhất dùng viền thay vì nền tô: `{colors.danger}` trên bất kỳ sắc hồng nhạt nào cũng chỉ đạt 4.0–4.3, dưới ngưỡng AA, nên nền phải là trắng tinh. **Đang giao** là pill duy nhất tô nền đặc màu — đó là trạng thái duy nhất đang diễn ra, và nó được phép đòi mắt nhìn.

Pill **không bao giờ bấm được** ở Trang bán hàng.

**stock-label** — Nhãn tình trạng tồn kho, cùng hình khối với `status-pill` nhưng khác họ nghĩa. **Còn hàng**: `{colors.success-bg}` + `{colors.success-ink}` + viền `{colors.success-border}` — đây là một trong hai chỗ duy nhất xanh lá được phép xuất hiện. **Hết hàng**: nền `{colors.surface-card}` + viền và chữ `{colors.danger}` (4.57) — cùng lý do như pill **Đã huỷ**: `{colors.danger}` trên mọi sắc hồng nhạt đều trượt AA. Nhãn luôn là **chữ**, không bao giờ chỉ là chấm màu.

**badge-attr** — Nền `{colors.accent-purple-bg}`, chữ `{colors.accent-purple}`, viền `{colors.accent-purple-border}`. Chỉ cho thuộc tính phân loại tĩnh.

**nav-item** — Đang chọn: nền `{colors.brand-tint}`, icon và chữ `{colors.brand-primary}`. Chưa chọn: icon `{colors.ink-muted}`, không nền. Mục danh mục trên Trang bán hàng mang một con số canh phải, cỡ `{typography.meta}`, màu `{colors.ink-secondary}` — không phải badge, không nền, không viền: nó là dữ liệu phụ chứ không phải nhãn cần chú ý.

**product-card** — Thẻ trắng, viền `{colors.border-default}`, bo `{rounded.lg}`, đệm 16px. Ảnh vuông ở trên, tên 2 dòng tối đa, giá `{typography.price}`, pill tình trạng hàng. Hàng hết vẫn hiển thị đầy đủ, **không làm mờ cả thẻ** — chỉ pill đổi và nút thêm giỏ vô hiệu.

**table-row** — Cao 104px, kẻ dưới 1px `{colors.border-default}`, di chuột đổi nền `{colors.surface-subtle}`. Cột thao tác ghim bên phải.

**banner-scope** — Nền `{colors.info-bg}`, chữ `{colors.info-ink}`, bo `{rounded.md}`. Dùng để nêu *phạm vi dữ liệu đang xem*, không dùng để báo thành công.

## Do's and Don'ts

**Làm:**

- Dùng `{colors.ink-secondary}` cho mọi chữ phụ có nghĩa — kể cả placeholder.
- Trên nền `{colors.amber}` luôn viết chữ `{colors.ink-primary}` (tương phản 9.26).
- Giữ `line-height` ≥ 1.3 ở mọi cỡ chữ, để dấu tiếng Việt không bị cắt.
- Ghép màu với chữ hoặc icon. Mọi trạng thái phải đọc được khi in trắng đen.
- Giữ chiều cao điều khiển đúng 38 / 35px. Hai bề mặt trông cùng một hệ nhờ những hằng số này.

**Không làm:**

- **Không dùng `{colors.ink-decorative}` `#A2ACB4` cho chữ.** Trên nền trắng nó chỉ đạt tương phản 2.31, dưới ngưỡng WCAG 2.1 AA (4.5). Trong ảnh chuẩn màu này đang làm phụ đề và placeholder; ở sản phẩm này nó **chỉ còn dùng cho icon trang trí và đường phân cách**. Mã màu giữ nguyên, phạm vi dùng thu hẹp — đây là quyết định đã ghi nhận, không phải sơ suất.
- Không viết chữ trắng trên `{colors.amber}` (1.64 — trượt xa).
- Không dùng xanh lá cho bất cứ thứ gì không phải tiền hoặc tình trạng còn hàng — kể cả trạng thái **Đã giao**, dù phản xạ thông thường là tô xanh cho việc đã xong.
- Không dùng tím cho thứ thay đổi theo thời gian.
- Không thêm bóng đổ để tạo thứ bậc — dùng chênh lệch nền.
- Không rút gọn tiền tệ (`330k`) và không bỏ ký hiệu `₫`.
- Không đặt hai nút chính cạnh nhau trên cùng một màn hình.
