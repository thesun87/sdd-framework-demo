---
name: 'Shop Online'
title: 'UX Spec — Shop Online'
status: curated
created: '2026-09-18'
updated: '2026-09-19'
curated_from:
  - 'planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/DESIGN.md'
  - 'planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/EXPERIENCE.md'
curated_at: '2026-09-19'
curated_by: 'Claude Opus 5, theo chỉ đạo của Tuan Nguyen'
---

# UX Spec — Shop Online

> **Đây là bản baseline.** `baseline-freeze.yaml` khai **một** artifact `ux_spec`,
> trong khi phase `bmad-ux` sinh ra **hai** tài liệu. File này gộp cả hai, giữ
> nguyên văn từng phần; chỉ các liên kết tương đối được sửa để tính từ
> `docs/baseline/`. Bản thô, `.memlog.md` (lý do đằng sau từng quyết định),
> `reconcile-ref-ui-danh-muc-san-pham.md` và thư mục `mockups/` nằm ở
> `planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/`.
>
> **Hai phần, hai vai trò khác nhau:** Phần 1 nói sản phẩm *trông* thế nào —
> nó là nguồn sự thật của design token. Phần 2 nói sản phẩm *hành xử* thế nào.

---

## Phần 1 — Xương sống thị giác

### Design token

Bảng token dưới đây là **nguồn sự thật** cho cả Trang bán hàng và Trang quản trị.
Kiến trúc đặt nó ở `packages/ui` (AD-9 cấm import chéo giữa hai app, nên đây là
nhà hợp lệ duy nhất cho thứ dùng chung). Màu rút từ ảnh chuẩn người dùng cung
cấp; mọi cặp đã qua kiểm tương phản WCAG 2.1 AA.

```yaml
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
```

# Shop Online — Xương sống thị giác

> Tài liệu này sở hữu **hình thức**. `EXPERIENCE.md` sở hữu **hành vi**.
> Khi tài liệu này chỏi với bất kỳ mock, wireframe hay ảnh import nào, **tài liệu này thắng**.
>
> **Mock tham chiếu** (dựng từ chính các token trong tài liệu này, mở offline được):
> [Trang chủ](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/trang-chu.html) · [Đơn chưa đặt được](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/don-chua-dat-duoc.html) ·
> [Chi tiết đơn hàng của tôi](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/chi-tiet-don-cua-toi.html) ·
> [Trang quản trị — Danh sách đơn hàng](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/quan-tri-danh-sach-don.html) ·
> [Bảng màu trích xuất](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/palette-extract.html).
> Mock **minh hoạ**, tài liệu này **là hợp đồng**. Mock sai thì sửa mock.
>
> Nguồn màu: `imports/ref-ui-danh-muc-san-pham.png` — người dùng ràng buộc **màu phải giống**, bố cục chỉ là tham khảo.
> Số đo hình khối lấy bằng script lấy mẫu pixel trên chính ảnh đó. Bảng màu đầy đủ: [`mockups/palette-extract.html`](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/palette-extract.html).

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


---

## Phần 2 — Xương sống trải nghiệm

# Shop Online — Xương sống trải nghiệm

Tài liệu này mô tả **hành vi**: cái gì bật, cái gì tắt, phản hồi ra sao, màn hình nói gì.
Phần **thị giác** — mã màu, kích thước, phông chữ — nằm ở `DESIGN.md`. Khi hai tài liệu
va nhau, tài liệu này thắng về hành vi và `DESIGN.md` thắng về hình thức.

Mọi token màu ở đây được gọi bằng tên (`{colors.brand-primary}`), không bao giờ bằng mã hex.

**Mock tham chiếu:** [Trang chủ](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/trang-chu.html) ·
[Đơn chưa đặt được](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/don-chua-dat-duoc.html) ·
[Chi tiết đơn hàng của tôi](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/chi-tiet-don-cua-toi.html) ·
[Trang quản trị — Danh sách đơn hàng](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/quan-tri-danh-sach-don.html).
Mock **minh hoạ**; hai xương sống **là hợp đồng**. Khi mock chỏi với tài liệu, mock sai.

---

## Foundation

Một web app duy nhất, **desktop-first**, phục vụ hai bề mặt tách biệt:

- **Trang bán hàng** — công khai. Khách chưa đăng ký, Khách hàng, và Chủ shop đều vào được.
- **Trang quản trị** — chỉ Chủ shop. Vào bằng đường dẫn riêng `/admin`, có biểu mẫu đăng nhập
  tách hẳn. **Không có liên kết nào từ Trang bán hàng trỏ tới nó.** Khách chưa đăng ký và
  Khách hàng không bao giờ thấy nó tồn tại.

Không có thư viện UI nào được PRD chỉ định (PRD §9.1: "Không có ràng buộc công nghệ nào").
Ngôn ngữ giao diện: **chỉ tiếng Việt**. Tiền tệ: **VND**, giá đã gồm VAT, không có dòng thuế
tách riêng.

Ba cam kết chi phối toàn bộ tài liệu này:

1. **FR-14 là điều duy nhất không được hy sinh.** Hệ thống từ chối bán quá tồn kho. Mọi lựa
   chọn trải nghiệm phải phục tùng điều đó, kể cả khi nó làm giảm tỷ lệ chuyển đổi.
2. **Không có kênh gửi ra ngoài.** Xem mục "Sống không có thông báo" ngay dưới.
3. **Tối thiểu hoá dữ liệu.** Không sổ địa chỉ, không hồ sơ cá nhân, không theo dõi hành vi,
   không analytics bên thứ ba (PRD §9.2, Luật 91/2025/QH15). Địa chỉ giao hàng được nhập lại
   trên từng đơn hàng, điền sẵn từ đơn hàng gần nhất và sửa được.

**Phản chỉ số SM-C2 là ràng buộc cứng lên tài liệu này:** không được đề xuất nới Tường đăng ký
(FR-11) hay nới FR-14 để tăng tỷ lệ chuyển đổi. Cả hai đều làm giảm chuyển đổi, và cả hai đều
đúng.

---

## Sống không có thông báo

Email và SMS nằm ngoài phạm vi (PRD §7.2 — PRD tự gọi đây là "mục nặng nề nhất"). FR-21:
"Không có thông báo đẩy nào được gửi." Hệ quả không thể tránh:

> **Lịch sử đơn hàng của tôi là kênh duy nhất Khách hàng biết chuyện gì đang xảy ra với
> đơn hàng của mình.**

Điều đó đặt ra bốn quy tắc, và chúng lan ra mọi mục còn lại của tài liệu này:

1. **Mọi thứ Khách hàng cần biết phải nằm sẵn trên màn hình khi họ tự quay lại.** Không có
   "chúng tôi sẽ báo bạn sau". Không có chuỗi nào chứa từ "thông báo", "gửi email", "nhắn tin".
2. **Màn hình phải tự giải thích tại sao một hành động không còn.** Nút huỷ biến mất thì màn
   hình phải nói ra lý do và nói ra việc cần làm tiếp — không để Khách hàng đoán (UJ-5).
3. **Thay đổi do Chủ shop gây ra phải để lại dấu vết đọc được.** Cụ thể: phí giao hàng đổi sau
   khi đặt đơn thì dòng phí giao hàng trong Chi tiết đơn hàng của tôi được **đánh dấu kèm thời
   điểm Chủ shop cập nhật**. Không banner lớn, không hộp thoại — một dấu hiệu cấp dòng, đọc
   được cả khi Khách hàng quay lại sau ba ngày.
4. **Không có đồng hồ đếm ngược, không có "giữ chỗ trong N phút".** Giỏ hàng không giữ chỗ tồn
   kho (FR-7). Giao diện không được ngụ ý ngược lại.

`[NOTE FOR UX]` PRD §11.2 Q8 để ngỏ chính vấn đề này: trên thực tế Chủ shop vẫn sẽ nhắn Zalo,
tức là một mảnh quy trình cũ vẫn sống ngoài hệ thống. Dấu hiệu cấp dòng ở điểm 3 là cách trải
nghiệm này chịu đựng khoảng trống đó, **không phải** cách đóng nó. Quyết định đóng hay không
thuộc `/speckit-clarify`.

`[NOTE FOR UX]` PRD §11.2 Q11: đơn hàng chuyển khoản đã được xác nhận thanh toán thì không huỷ
được nữa, ở bất kỳ trạng thái nào. FR-24 yêu cầu giao diện nói rõ điều đó **với Chủ shop trước
khi bấm**, nhưng PRD **không nêu nói gì với Khách hàng**. Tài liệu này viết một chuỗi cho
Khách hàng (xem State Patterns) và đánh dấu nó là tạm.

---

## Information Architecture

Danh mục là **phẳng, một cấp** (FR-26). Trên Trang bán hàng, danh mục nằm ở **sidebar trái cố
định**; lưới sản phẩm chiếm phần còn lại. Không có cây, không có danh mục cha.

Mỗi mục danh mục mang **số sản phẩm đang bán** của danh mục đó. Con số này đếm sản phẩm, **không
phải tồn kho** — nó không vi phạm FR-5 (cấm lộ con số tồn kho), và sản phẩm hết hàng vẫn được đếm
vì vẫn hiển thị được. Sản phẩm **Ngừng bán** không được đếm và không xuất hiện trong lưới.

Mọi màn hình **trước** Tường đăng ký truy cập được mà không cần đăng nhập, và truy cập không
có phiên trả HTTP 200 — **không redirect sang đăng nhập** (FR-1, FR-11).

### Trang bán hàng — 11 surface

| Surface | Đến từ đâu | Ai vào được | Mục đích |
|---|---|---|---|
| Trang chủ — tất cả sản phẩm | Liên kết gốc; logo ở header | Khách chưa đăng ký, Khách hàng, Chủ shop | Duyệt toàn bộ sản phẩm đang bán, phân trang 24/trang (trần 100) |
| Danh sách theo danh mục | Sidebar trái | Khách chưa đăng ký, Khách hàng, Chủ shop | Duyệt sản phẩm của một danh mục phẳng |
| Kết quả tìm kiếm | Ô tìm kiếm ở header | Khách chưa đăng ký, Khách hàng, Chủ shop | Tìm theo **tên sản phẩm**; khớp cả khi bỏ dấu, không phân biệt hoa/thường |
| Chi tiết sản phẩm | Thẻ sản phẩm trong lưới; kết quả tìm kiếm; dòng giỏ hàng | Khách chưa đăng ký, Khách hàng, Chủ shop | Tên, mô tả, giá, ảnh, tình trạng tồn kho ("Còn hàng"/"Hết hàng") |
| Giỏ hàng | Biểu tượng giỏ hàng ở header; sau khi thêm vào giỏ | Khách chưa đăng ký, Khách hàng | Sửa số lượng, xoá dòng giỏ hàng, xem tổng tiền hàng; đánh dấu dòng vượt tồn kho và dòng ngừng bán |
| Tường đăng ký | Bấm đặt đơn từ Giỏ hàng khi chưa đăng nhập | Khách chưa đăng ký | Đăng ký hoặc đăng nhập; qua tường xong trả về **đúng bước đặt đơn**, giỏ hàng nguyên vẹn |
| Đặt đơn | Giỏ hàng (đã đăng nhập); Tường đăng ký | Khách hàng | Nhập địa chỉ giao hàng (tên người nhận, số điện thoại, địa chỉ), chọn phương thức thanh toán, đặt đơn hàng |
| Xác nhận đơn | Đặt đơn thành công | Khách hàng | Mã đơn hàng + trạng thái **Đã đặt**; nếu chuyển khoản thì hiện hướng dẫn chuyển khoản |
| **Đơn chưa đặt được** | Đặt đơn bị từ chối vì thiếu tồn kho (FR-14) | Khách hàng | **Trang riêng.** Nêu cụ thể dòng giỏ hàng nào không đủ và số lượng còn bán được; giỏ hàng giữ nguyên 100% |
| Lịch sử đơn hàng của tôi | Menu tài khoản ở header | Khách hàng | Đơn hàng của chính mình, mới nhất trước: mã đơn hàng, ngày đặt, tổng tiền đơn, trạng thái |
| Chi tiết đơn hàng của tôi | Dòng trong Lịch sử đơn hàng của tôi; Xác nhận đơn | Khách hàng | Dòng đơn hàng + giá tại thời điểm đặt, địa chỉ giao hàng, phương thức thanh toán, **tổng tiền hàng · phí giao hàng · tổng tiền đơn**; nút huỷ chỉ khi **Đã đặt**; hướng dẫn chuyển khoản khi chuyển khoản + **Đã đặt** |

### Trang quản trị — 12 surface

| Surface | Đến từ đâu | Ai vào được | Mục đích |
|---|---|---|---|
| Đăng nhập Trang quản trị | Gõ thẳng `/admin`. **Không có liên kết nào từ Trang bán hàng** | Chủ shop | Đăng nhập. Không có luồng đăng ký quản trị nào tồn tại |
| Danh sách đơn hàng | Điều hướng Trang quản trị (mục mặc định sau khi đăng nhập) | Chủ shop | Mọi đơn hàng, mới nhất trước, phân trang, lọc theo trạng thái; với chuyển khoản hiện thêm tình trạng xác nhận thanh toán |
| Chi tiết đơn hàng | Dòng trong Danh sách đơn hàng | Chủ shop | Toàn bộ nội dung đơn hàng + **lịch sử trạng thái** (mỗi lần chuyển, thời điểm, tài khoản thực hiện); nhập phí giao hàng; xác nhận thanh toán; chuyển trạng thái |
| Danh sách sản phẩm | Điều hướng Trang quản trị | Chủ shop | Quản lý những gì được bán; thấy **con số tồn kho thật** |
| Chi tiết / sửa sản phẩm | Dòng trong Danh sách sản phẩm; nút tạo mới | Chủ shop | Tên, giá (> 0), mô tả, ảnh (≥ 1, JPEG/PNG/WebP, ≤ 5 MB, ảnh đầu là ảnh đại diện), gán **nhiều nhất một** danh mục, đánh dấu **ngừng bán** |
| **Sổ cái tồn kho** | Một mục trong Chi tiết sản phẩm | Chủ shop | Đọc lịch sử tồn kho của sản phẩm đó: mỗi lần tồn kho đổi, giá trị trước → sau, **lúc nào**, **do đơn hàng nào hay do điều chỉnh tay**, tài khoản thực hiện |
| Điều chỉnh tồn kho | Nút trong Chi tiết sản phẩm và trong Danh sách sản phẩm | Chủ shop | Đặt lại con số tồn kho (số nguyên ≥ 0); mỗi lần đổi ghi một dòng vào Sổ cái tồn kho |
| Danh mục | Điều hướng Trang quản trị | Chủ shop | Tạo, đổi tên, xoá danh mục. Phẳng — không đặt được danh mục cha |
| **Cài đặt** | Điều hướng Trang quản trị | Chủ shop | Mục gom ba màn hình lẻ dưới đây |
| Cài đặt → Thông tin ngân hàng | Cài đặt | Chủ shop | Cấu hình tên ngân hàng, số tài khoản, tên chủ tài khoản dùng trong hướng dẫn chuyển khoản (FR-23) |
| Cài đặt → Đổi mật khẩu chủ shop | Cài đặt | Chủ shop | Đổi mật khẩu của chính mình (FR-33) |
| Cài đặt → Đặt lại mật khẩu khách hàng | Cài đặt | Chủ shop | Đặt lại mật khẩu cho một Khách hàng theo yêu cầu ngoài hệ thống (lập trường tạm cho PRD Q10) |

`[NOTE FOR UX]` **Surface "Đặt lại mật khẩu khách hàng" thêm một quyền vào ma trận phân quyền
đang ĐÓNG BĂNG của PRD §5.** PRD §5 tuyên bố "ba vai trò, hết… và phải giữ được như vậy".
Đây là một **xung đột chưa giải quyết**, không phải một quyết định đã chốt. Phiên UX chọn
phương án (a) của ADD §6 để có thứ mà vẽ, nhưng **không được sửa PRD từ đây**. Phải giải ở
`/speckit-clarify` (PRD §11.1 Q10). Nếu Q10 chốt phương án (b) — không có khôi phục ở v1 —
thì surface này biến mất và mục Cài đặt còn hai dòng.

### IA đóng khi nào

- Mọi surface trong hai bảng trên **đều có ít nhất một lối vào** được ghi ở cột "Đến từ đâu".
- Ba surface mồ côi mà PRD hàm ý nhưng ADD §5 không liệt kê (Thông tin ngân hàng G11, Đổi mật
  khẩu chủ shop G12, Sổ cái tồn kho G13) **đã có nhà**.
- Khoảnh khắc nặng nhất (FR-14) **có surface riêng**, không bị nhét vào overlay.
- Không có nhu cầu nào trong §2.2 JTBD còn thiếu surface.

`[ASSUMPTION]` Cấu trúc điều hướng toàn cục — header, footer, menu tài khoản — PRD hoàn toàn im
lặng (G19). Tài liệu này giả định: header Trang bán hàng chứa logo, ô tìm kiếm, biểu tượng giỏ
hàng, menu tài khoản; Trang quản trị dùng điều hướng dọc bên trái. Không có footer mang chức
năng.

`[ASSUMPTION]` Sắp xếp mặc định của lưới sản phẩm: mới nhất trước. PRD không nêu.

---

## Voice and Tone

Xưng hô với Khách chưa đăng ký và Khách hàng: **"bạn"**. Áp dụng toàn bộ Trang bán hàng.
Trang quản trị nói với Chủ shop bằng câu trần thuật, không xưng hô.

Giọng chung: **nêu sự việc, rồi nêu việc cần làm**. Không xin lỗi trước, không trấn an trước,
không reo mừng.

| Viết thế này | Không viết thế này |
|---|---|
| "Tồn kho đã thay đổi trong lúc bạn đặt đơn. Không có đơn hàng nào được tạo." | "Rất tiếc! Đơn hàng của bạn không thành công 😔" |
| "Chỉ còn 1 sản phẩm. Bạn giảm số lượng xuống 1 hoặc ít hơn." | "Sản phẩm sắp hết hàng — nhanh tay lên!" |
| "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." | "Đăng ký ngay để nhận nhiều ưu đãi!" |
| "Đơn hàng đã ở trạng thái Đã xác nhận nên bạn không huỷ được ở đây. Bạn liên hệ chủ shop." | "Không thể huỷ đơn." |
| "Không có sản phẩm nào khớp với «binh giu nhiet»." | "Oops! Không tìm thấy gì cả 🔍" |
| "Đơn hàng của bạn: DH-2026-000412 · Đã đặt" | "🎉 Đặt hàng thành công!" |
| "Xác nhận thanh toán không thu hồi được." | "Bạn có chắc chắn không?" |

### Kỷ luật thuật ngữ

Dùng nguyên văn glossary (extract §9). Đặc biệt:

- **Phí giao hàng** — không bao giờ viết "phí ship", "phí vận chuyển", "cước".
- **Tổng tiền hàng** / **Tổng tiền đơn** — không bao giờ viết "tạm tính", "tổng cộng",
  "thành tiền".
- **Khách chưa đăng ký** và **Khách hàng** là hai vai trò khác nhau; không bao giờ gộp thành
  "khách".
- **Chủ shop** — không bao giờ viết "admin", "quản trị viên", "người bán".
- **Ngừng bán** — không bao giờ viết "xoá sản phẩm", "ẩn sản phẩm", "archived".
- **Dòng giỏ hàng** / **Dòng đơn hàng** — không viết "món trong giỏ", "dòng hàng".
- **Đơn hàng** viết đủ chữ trong câu văn. Chỉ ba cụm được rút gọn, vì người dùng đã chốt nguyên
  văn: **Đặt đơn**, **Xác nhận đơn**, **Đơn chưa đặt được**.

`[NOTE FOR UX]` Năm thuật ngữ do phiên này chốt — **Trang bán hàng**, **Trang quản trị**,
**Tường đăng ký**, **Đặt đơn**, **Xác nhận đơn** — **chưa có dòng nào trong
`docs/baseline/glossary.md`**. Theo CLAUDE.md §3, glossary chỉ sửa được bởi người + BMAD trên
nhánh `baseline/*`. Cần bổ sung trước khi đóng băng baseline.

### Nhãn trạng thái đơn hàng (Khách hàng và Chủ shop dùng chung, đúng năm nhãn này)

| Trạng thái | Nhãn hiển thị |
|---|---|
| `placed` | **Đã đặt** |
| `confirmed` | **Đã xác nhận** |
| `shipped` | **Đang giao** |
| `delivered` | **Đã giao** |
| `cancelled` | **Đã huỷ** |

Không có nhãn thứ sáu. Không có "đang xử lý", "chờ thanh toán", "hoàn tất".

---

## Component Patterns

Xem thật: [Trang chủ](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/trang-chu.html) (sidebar có số đếm, thẻ sản phẩm, nhãn tồn kho) ·
[Trang quản trị — Danh sách đơn hàng](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/quan-tri-danh-sach-don.html) (bảng đơn hàng, bộ lọc
trạng thái, hộp thoại một chiều).

Chỉ mô tả **hành vi**. Hình thức — màu, bo góc, kích thước — thuộc `DESIGN.md`.

| Thành phần | Dùng ở đâu | Quy tắc hành vi |
|---|---|---|
| Sidebar danh mục | Trang bán hàng, cố định bên trái | Danh sách phẳng một cấp. Danh mục đang xem được đánh dấu đang chọn. Luôn có mục "Tất cả sản phẩm" ở đầu. Không thu gọn được ở desktop. Đổi danh mục thì **đặt lại về trang 1** và xoá từ khoá tìm kiếm. Mỗi mục mang **số sản phẩm đang bán** trong danh mục đó, canh phải — danh mục rỗng vẫn hiện và mang số `0`, vì biết trước chỗ nào rỗng đỡ hơn là bấm vào rồi mới biết |
| Ô tìm kiếm | Header Trang bán hàng `[ASSUMPTION]` vị trí | Gửi khi bấm Enter hoặc nút tìm. **Không gợi ý khi gõ** (ngoài phạm vi FR-2). Từ khoá được giữ lại trong ô sau khi tìm. Tìm kiếm cắt ngang danh mục — kết quả lấy trên toàn bộ sản phẩm đang bán |
| Thẻ sản phẩm (lưới) | Trang chủ, Danh sách theo danh mục, Kết quả tìm kiếm | Ảnh đại diện = ảnh đầu tiên của sản phẩm. Hiện tên, giá, nhãn tình trạng tồn kho. Bấm bất kỳ đâu trên thẻ → Chi tiết sản phẩm. **Sản phẩm hết hàng vẫn hiện trong lưới**, không bị ẩn |
| Nhãn tình trạng tồn kho | Thẻ sản phẩm, Chi tiết sản phẩm | Đúng hai giá trị: **"Còn hàng"** hoặc **"Hết hàng"**. **Không bao giờ hiện con số** cho Khách chưa đăng ký và Khách hàng. Giá trị này **không được cache** — kể cả khi phần còn lại của trang được cache (FR-5) |
| Nút "Thêm vào giỏ hàng" | Chi tiết sản phẩm | Bật khi tồn kho > 0. **Vô hiệu hoá** khi "Hết hàng", kèm câu giải thích ngay cạnh. **Không tồn tại** trong phiên Chủ shop. Bấm xong: nút về trạng thái thường, số trên biểu tượng giỏ hàng tăng, không điều hướng đi đâu |
| Dòng giỏ hàng | Giỏ hàng | Sửa số lượng tại chỗ, lưu khi rời ô. Xoá dòng không hỏi lại (giỏ hàng không phải hành động một chiều). **Ba trạng thái cảnh báo cấp dòng**: (a) vượt tồn kho — nêu số lượng còn bán được; (b) sản phẩm ngừng bán — nêu không mua được; (c) bình thường. Dòng (a) và (b) **không tự biến mất và không tự sửa** |
| Tổng tiền hàng | Giỏ hàng, Đặt đơn | Chỉ **tổng tiền hàng**. **Không có dòng phí giao hàng** ở Giỏ hàng và Đặt đơn — phí giao hàng chỉ tồn tại sau khi đơn hàng được đặt (FR-20) |
| Bộ phân trang | Mọi danh sách | 24 mục/trang mặc định, trần 100. Yêu cầu > 100 được xử lý như 100, **không báo lỗi**. Hiện số trang hiện tại và tổng số trang. **Không có cuộn vô tận** |
| Biểu mẫu địa chỉ giao hàng | Đặt đơn | Ba trường bắt buộc: tên người nhận, số điện thoại, địa chỉ. **Điền sẵn từ đơn hàng gần nhất** nếu có, và **sửa được**. Không có sổ địa chỉ, không có nút "lưu địa chỉ này" |
| Chọn phương thức thanh toán | Đặt đơn | Đúng hai lựa chọn. Bắt buộc chọn. **Không đổi được sau khi đặt đơn** — Chi tiết đơn hàng của tôi hiển thị nó ở dạng chỉ đọc |
| Khối hướng dẫn chuyển khoản | Xác nhận đơn, Chi tiết đơn hàng của tôi | Hiện tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền, **nội dung chuyển khoản chứa mã đơn hàng**. Chỉ hiện khi phương thức thanh toán là chuyển khoản **và** đơn hàng còn ở **Đã đặt**. `[ASSUMPTION]` Có nút sao chép cho số tài khoản và nội dung chuyển khoản |
| Pill trạng thái đơn hàng | Lịch sử đơn hàng của tôi, Chi tiết đơn hàng, Danh sách đơn hàng | Chỉ hiển thị, không bấm được. Năm nhãn cố định. `DESIGN.md` → `components.status-pill` gán màu cho từng trạng thái; ràng buộc hành vi: **nhãn là chữ, không bao giờ là chấm màu**, và mọi pill phải đọc được khi in trắng đen |
| Dấu hiệu phí giao hàng đã cập nhật | Chi tiết đơn hàng của tôi | Khi phí giao hàng > 0 và đã bị Chủ shop nhập/sửa: dòng phí giao hàng mang một dấu hiệu cấp dòng kèm **thời điểm cập nhật**. Nền `{colors.info-bg}`, chữ `{colors.info-ink}`. **Không banner, không hộp thoại, không dấu chấm đỏ** |
| Bảng đơn hàng | Trang quản trị → Danh sách đơn hàng | Mới nhất trước. Mỗi dòng: mã đơn hàng, thời điểm đặt, tên người nhận, tổng tiền đơn, phương thức thanh toán, trạng thái, và với chuyển khoản thêm **tình trạng xác nhận thanh toán**. Bấm dòng → Chi tiết đơn hàng. Phân trang bắt buộc |
| Bộ lọc trạng thái | Trang quản trị → Danh sách đơn hàng | Lọc theo đúng năm nhãn, cộng "Tất cả". Đổi bộ lọc → đặt lại về trang 1. Bộ lọc đang chọn **được giữ khi quay lại từ Chi tiết đơn hàng** |
| Hộp thoại xác nhận một chiều | Chuyển sang **Đã giao**; Xác nhận thanh toán; Xoá danh mục | Nêu **hậu quả** trước, rồi mới tới nút. Nút xác nhận mang nhãn là **động từ của hành động**, không phải "OK". Nút huỷ luôn là lối thoát mặc định (Esc đóng hộp thoại) |
| Trường phí giao hàng | Trang quản trị → Chi tiết đơn hàng | Chỉ bật khi đơn hàng ở **Đã đặt**. Số ≥ 0; số âm bị từ chối tại chỗ. Lưu xong: tổng tiền đơn tính lại ngay, **trạng thái không đổi**, nút huỷ của Khách hàng **vẫn còn** |
| Nút chuyển trạng thái | Trang quản trị → Chi tiết đơn hàng | Chỉ hiện những chuyển tiếp hợp lệ từ trạng thái hiện tại. Ở **Đã giao** và **Đã huỷ** **không còn nút nào**. Với chuyển khoản chưa xác nhận thanh toán: nút sang **Đã xác nhận** **bị khoá kèm lý do**, không phải bị ẩn |
| Nút xác nhận thanh toán | Trang quản trị → Chi tiết đơn hàng | **Chỉ tồn tại với đơn hàng chuyển khoản.** Không tồn tại với COD. Là control **riêng biệt** với nút chuyển trạng thái — xác nhận thanh toán tự nó không đổi trạng thái đơn hàng. Một chiều: bắt buộc qua hộp thoại xác nhận |
| Dòng lịch sử trạng thái | Trang quản trị → Chi tiết đơn hàng | Chỉ đọc, cũ → mới. Mỗi dòng: trạng thái trước → sau, thời điểm, tài khoản thực hiện |
| Bảng sổ cái tồn kho | Trang quản trị → Chi tiết sản phẩm | `[ASSUMPTION]` Chỉ đọc, phân trang, mới nhất trước. Mỗi dòng: thời điểm, giá trị trước → sau, nguyên nhân (đơn hàng được đặt / đơn hàng bị huỷ / điều chỉnh tay), **mã đơn hàng nếu có** (bấm được → Chi tiết đơn hàng), tài khoản thực hiện |
| Bộ chọn danh mục | Trang quản trị → Chi tiết sản phẩm | **Đơn chọn**, không phải multi-select. Có lựa chọn "Không có danh mục". Phẳng — không có cấp cha |
| Trình sắp xếp ảnh sản phẩm | Trang quản trị → Chi tiết sản phẩm | Nhiều ảnh được phép; **ảnh ở vị trí đầu tiên là ảnh đại diện** và giao diện phải nói ra điều đó. Bắt buộc ≥ 1 ảnh — không xoá được ảnh cuối cùng |
| Nút xoá sản phẩm | Trang quản trị → Chi tiết sản phẩm | **Hai hành vi trên cùng một chỗ.** Sản phẩm chưa từng xuất hiện trong đơn hàng nào → xoá được, có xác nhận. Sản phẩm đã xuất hiện trong đơn hàng → **không xoá được**, giao diện chỉ đường sang **ngừng bán** |

---

## State Patterns

Xem thật: trạng thái **Hết hàng** trong [Trang chủ](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/trang-chu.html) ·
**Đơn hàng không huỷ được** trong [Chi tiết đơn hàng của tôi](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/chi-tiet-don-cua-toi.html)
(hai khối cạnh nhau: **Đã đặt** còn nút huỷ, **Đã xác nhận** thì không).

| Trạng thái | Trang bán hàng | Trang quản trị |
|---|---|---|
| **Rỗng** | Lưới sản phẩm rỗng: "Danh mục này chưa có sản phẩm nào." · Tìm kiếm 0 kết quả: "Không có sản phẩm nào khớp với «{từ khoá}». Bạn thử bớt từ hoặc xem theo danh mục bên trái." — đây là **danh sách rỗng, không phải lỗi** (FR-2) · Giỏ hàng rỗng: "Giỏ hàng của bạn đang trống." + liên kết về Trang chủ · Lịch sử đơn hàng rỗng: "Bạn chưa có đơn hàng nào." | Danh sách đơn hàng đã lọc mà rỗng: "Không có đơn hàng nào ở trạng thái Đã xác nhận." · Chưa có sản phẩm: "Chưa có sản phẩm nào. Tạo sản phẩm đầu tiên." · Sổ cái tồn kho rỗng: "Tồn kho của sản phẩm này chưa thay đổi lần nào." |
| **Đang tải** | Skeleton đúng hình dạng nội dung sắp tới (lưới 24 ô, danh sách đơn hàng), hiện sau **300ms** `[ASSUMPTION]`. Mục tiêu p95 tải trang ≤ 1,5 s và p95 đọc ≤ 400 ms nghĩa là **phần lớn lượt không bao giờ thấy skeleton** — không thiết kế skeleton như một màn hình chính thức. **Nhãn tình trạng tồn kho không được hiện giá trị cũ trong lúc tải** (FR-5 cấm cache): ô đó để trống cho tới khi có dữ liệu thật | Cùng nguyên tắc. Bảng đơn hàng dùng skeleton dòng. Nút đang gửi chuyển sang trạng thái khoá kèm nhãn tiến trình |
| **Lỗi** | Lỗi hệ thống: "Không tải được nội dung này. Bạn thử lại." + nút Thử lại, **không đổ lỗi cho kết nối của bạn** khi chưa biết · Lỗi xác thực biểu mẫu: hiện **ngay dưới trường sai**, nêu việc cần làm · Đăng nhập sai: "Email hoặc mật khẩu không đúng." (**không tiết lộ định danh có tồn tại hay không**, FR-10) · Quá số lần đăng nhập: "Bạn đã thử đăng nhập quá nhiều lần. Bạn thử lại sau 15 phút." — **không khoá tài khoản vĩnh viễn** | "Không lưu được thay đổi. Thử lại." Giá trị đã nhập được giữ nguyên trong biểu mẫu · Chuyển trạng thái bị từ chối (409): "Đơn hàng đã đổi trạng thái ở nơi khác. Tải lại để xem trạng thái hiện tại." |
| **Không có quyền** | **Đơn hàng của người khác → trang "Không tìm thấy", không phải "Không có quyền"** (FR-32: 403 đã tiết lộ đơn hàng đó tồn tại). Chuỗi: "Không tìm thấy đơn hàng." `[ASSUMPTION]` dùng chung một trang "Không tìm thấy" với sản phẩm không tồn tại · Chủ shop duyệt Trang bán hàng: **không có** biểu tượng giỏ hàng, **không có** nút thêm vào giỏ hàng. Nếu chạm tới đường dẫn đặt đơn: "Tài khoản chủ shop không đặt đơn được." · Khách chưa đăng ký bấm đặt đơn: **không phải lỗi** — đi thẳng vào Tường đăng ký | Truy cập `/admin` không có phiên → biểu mẫu đăng nhập Trang quản trị. **Không có màn hình đăng ký nào** |
| **Hết hàng** | Sản phẩm hết hàng **vẫn hiển thị** trong lưới và mở được Chi tiết sản phẩm (ẩn đi thì bạn tưởng shop không bán món đó). Nhãn "Hết hàng", nút thêm vào giỏ hàng **vô hiệu hoá** kèm: "Sản phẩm này đang hết hàng." · Dòng giỏ hàng vượt tồn kho: "Chỉ còn {n} sản phẩm. Bạn giảm số lượng xuống {n} hoặc ít hơn để đặt đơn." · Dòng giỏ hàng ngừng bán: "Sản phẩm này đã ngừng bán. Bạn xoá dòng này để đặt đơn." · Đặt đơn bị từ chối → **trang Đơn chưa đặt được** | Con số tồn kho thật hiện trong Danh sách sản phẩm và Chi tiết sản phẩm. Tồn kho 0 được đánh dấu rõ nhưng **không chặn** thao tác nào của Chủ shop |
| **Ngoại tuyến** | `[ASSUMPTION]` PRD không nêu, và **không có PWA, không có cache phía client** trong phạm vi. Xử lý: một dải thông báo cố định — "Mất kết nối. Tình trạng tồn kho trên trang này có thể không còn đúng." Mọi nút gửi (thêm vào giỏ hàng, đặt đơn, đăng nhập) **bị khoá** cho tới khi có kết nối lại. Không có hàng đợi ghi ngoại tuyến — với FR-14 thì một hàng đợi là lời hứa hệ thống không giữ được | Cùng dải thông báo. Mọi nút ghi bị khoá. Bảng đang mở vẫn đọc được nhưng được đánh dấu "Dữ liệu tính đến {thời điểm}" |
| **Đơn hàng không huỷ được** | Ở **Đã xác nhận** / **Đang giao** / **Đã giao**: nút huỷ **biến mất** và màn hình nói rõ — "Đơn hàng đã ở trạng thái {nhãn} nên bạn không huỷ được ở đây. Bạn liên hệ chủ shop để xử lý." · Đơn hàng chuyển khoản **đã được xác nhận thanh toán**: nút huỷ biến mất ở mọi trạng thái — "Chủ shop đã xác nhận thanh toán cho đơn hàng này nên không huỷ được nữa. Bạn liên hệ chủ shop." `[NOTE FOR UX]` PRD §11.2 Q11 không quy định nói gì với Khách hàng ở đây; chuỗi này là tạm | Ở **Đã giao** và **Đã huỷ**: không còn hành động nào, kể cả cho Chủ shop |

`[NOTE FOR UX]` **Chủ shop đặt đơn hộ Khách hàng (PRD §11.1 Q4) và Chủ shop có cần giỏ hàng
không (Q12)** đang để ngỏ. Bảng trên thiết kế theo lập trường "không": phiên Chủ shop trên
Trang bán hàng không có biểu tượng giỏ hàng và không có nút thêm vào giỏ hàng. Nếu Q4 chốt
"có", Trang quản trị cần một luồng đặt đơn hoàn toàn mới và bảng này phải viết lại.

`[NOTE FOR UX]` **Đơn hàng đã ẩn danh hoá** (chính sách 12 tháng, PRD §9.3) chưa có trạng thái
hiển thị nào trong tài liệu này. PRD không nêu Lịch sử đơn hàng của tôi và Danh sách đơn hàng
trình bày một đơn hàng đã ẩn danh hoá ra sao. Chờ PRD §11.1 Q3 `[CHẶN]`.

---

## Interaction Primitives

**Chuột là chính, bàn phím phải đủ.** Sản phẩm này không có phím tắt chuyên biệt — người dùng
là chủ shop bán lẻ và người mua phổ thông, không phải người dùng thành thạo. Thêm phím tắt sẽ
là chi phí học không ai trả.

### Xác nhận hành động một chiều

Đúng **ba** hành động là một chiều, và cả ba **bắt buộc** qua hộp thoại nêu hậu quả trước:

| Hành động | Câu phải nói trước khi bấm | Nhãn nút xác nhận |
|---|---|---|
| Chuyển sang **Đã giao** (FR-19) | "Chuyển sang Đã giao là bước cuối. Sau bước này đơn hàng không quay lại trạng thái nào khác được." | "Chuyển sang Đã giao" |
| **Xác nhận thanh toán** (FR-24) | "Xác nhận thanh toán không thu hồi được. Sau khi xác nhận, đơn hàng này không huỷ được nữa, ở bất kỳ trạng thái nào." | "Tôi đã nhận thanh toán" |
| **Xoá danh mục** đang có sản phẩm (FR-26) | "Xoá danh mục «{tên}». {n} sản phẩm đang thuộc danh mục này sẽ trở thành không có danh mục. Không sản phẩm nào bị xoá." | "Xoá danh mục" |

Huỷ đơn hàng **cũng** cần xác nhận (nó hoàn kho và là điểm cuối), nhưng câu nói khác — nó nêu
hệ quả về tồn kho, không nêu sự không thu hồi: "Huỷ đơn hàng {mã}. Số lượng đã trừ sẽ được
hoàn lại tồn kho." Với đơn hàng ở **Đang giao** do Chủ shop huỷ, câu đổi thành: "Huỷ đơn hàng
{mã}. Đơn hàng đang giao nên **tồn kho không được hoàn lại**." (FR-18)

**Không dùng hộp thoại** cho: xoá dòng giỏ hàng, đổi số lượng, đổi bộ lọc, đăng xuất.

### Khoá nút khi đang gửi

Mọi nút gây ghi dữ liệu chuyển sang trạng thái khoá ngay tại lần bấm đầu tiên, kèm nhãn tiến
trình bằng động từ: "Đang đặt đơn…", "Đang lưu…", "Đang huỷ…". Nút chỉ mở lại khi máy chủ đã
trả lời. **Không có spinner toàn trang** — phản hồi nằm tại chính nút vừa bấm.

### Chống bấm đôi khi đặt đơn

Đặt đơn là chỗ duy nhất mà bấm đôi có thể tạo ra hậu quả thật (trừ hai lần tồn kho, tạo hai đơn
hàng). Ba lớp, cả ba đều bắt buộc:

1. Nút **Đặt đơn** khoá ngay tại `mousedown`, không đợi phản hồi.
2. Biểu mẫu Đặt đơn mang một **khoá chống trùng** sinh khi mở màn hình; gửi lại cùng khoá đó
   trả về **chính đơn hàng đã tạo**, không tạo đơn hàng thứ hai. `[ASSUMPTION]` PRD không nêu
   cơ chế này; nó là hệ quả bắt buộc của FR-14 + mục tiêu p95 đặt đơn ≤ 1,0 s.
3. Sau khi đặt đơn thành công, **thay thế** mục lịch sử trình duyệt bằng Xác nhận đơn — bấm
   Quay lại **không** trở về biểu mẫu Đặt đơn đã gửi.

Cùng nguyên tắc áp cho **Xác nhận thanh toán** và **chuyển trạng thái** trong Trang quản trị.

### Giữ trạng thái khi quay lại

`[ASSUMPTION]` PRD không nêu. Quy tắc của tài liệu này:

- **Giữ** khi quay lại: số trang và danh mục đang xem trên Trang bán hàng; từ khoá tìm kiếm;
  bộ lọc trạng thái và số trang của Danh sách đơn hàng trong Trang quản trị.
- **Đặt lại** về trang 1 khi: đổi danh mục, đổi từ khoá tìm kiếm, đổi bộ lọc trạng thái.
- **Giữ nguyên tuyệt đối**: giỏ hàng — qua Tường đăng ký, qua đăng nhập (giỏ **sống sót nguyên vẹn**,
  sản phẩm trùng cộng dồn số lượng, không dòng nào mất), và qua trang **Đơn chưa đặt được**.
- **Không giữ**: nội dung đang gõ trong biểu mẫu địa chỉ giao hàng khi rời hẳn khỏi Đặt đơn.
  Địa chỉ được điền lại từ đơn hàng gần nhất ở lần sau — đó là cơ chế thay cho sổ địa chỉ.

### Phân trang

- Chỉ **phân trang**, không cuộn vô tận, không "tải thêm". Với 20.000 sản phẩm và 300.000 đơn
  hàng ở năm thứ ba, cuộn vô tận biến mọi danh sách thành thứ không quay lại được.
- Mặc định 24/trang, trần 100. Yêu cầu > 100 xử lý như 100, **không báo lỗi**.
- Số trang nằm trong đường dẫn để chia sẻ được và để nút Quay lại hoạt động đúng.

### Bị cấm ở mọi nơi

Carousel · pop-up thu thập email · đồng hồ đếm ngược giữ chỗ · huy hiệu "chỉ còn 2 sản phẩm!"
· cuộn vô tận · hộp thoại chồng quá một lớp · hiệu ứng ăn mừng khi đặt đơn thành công ·
bất kỳ thứ gì đo hành vi người dùng.

---

## Accessibility Floor

Mức sàn: **WCAG 2.1 AA**. PRD không nêu yêu cầu accessibility nào (G14) — mức này do phiên UX
đặt ra và là ràng buộc, không phải mong muốn.

Phần dưới là **hành vi**. Tỷ lệ tương phản cụ thể của từng cặp màu nằm ở `DESIGN.md`.

- **Bàn phím đi hết được mọi luồng**, kể cả đặt đơn và mọi hành động trong Trang quản trị. Thứ
  tự Tab bám thứ tự đọc. `Esc` luôn đóng hộp thoại đang mở.
- **Vòng focus luôn nhìn thấy được**, kể cả trên nền `{colors.brand-primary}` và
  `{colors.amber}`. Không bao giờ tắt outline mặc định mà không thay bằng thứ tương đương.
- **Lỗi biểu mẫu không chỉ dùng màu.** Mỗi lỗi có chữ, nằm ngay dưới trường sai, và được liên
  kết với trường đó để trình đọc màn hình đọc ra khi focus vào.
- **Tình trạng tồn kho không chỉ dùng màu.** "Còn hàng"/"Hết hàng" là **chữ**, luôn luôn.
  Trạng thái đơn hàng cũng là chữ, không phải chấm màu.
- **Nút bị vô hiệu hoá phải nói lý do bằng chữ ngay cạnh**, không để người dùng suy ra từ việc
  nó xám. Áp cho: nút thêm vào giỏ hàng khi hết hàng, nút **Đã xác nhận** khi chưa xác nhận
  thanh toán, nút Đặt đơn khi giỏ hàng có dòng vượt tồn kho.
- **Thay đổi không do người dùng chủ động gây ra phải được thông báo cho trình đọc màn hình**:
  kết quả tìm kiếm cập nhật, số lượng dòng giỏ hàng đổi, nội dung trang **Đơn chưa đặt được**
  khi vừa mở.
- `[ASSUMPTION]` **Vùng bấm tối thiểu 44×44 px** cho mọi control, kể cả nút tăng/giảm số lượng trong Giỏ hàng
  và nút sao chép trong khối hướng dẫn chuyển khoản.
- **Chữ phóng tới 200% vẫn dùng được**: không cắt chữ, không tràn, bảng đơn hàng cuộn ngang
  trong khung riêng thay vì đẩy trang.
- **Ràng buộc token đã kiểm tra trong phiên này, bắt buộc:**
  - `{colors.ink-decorative}` **chỉ dùng cho thứ không mang thông tin** — icon trang trí, đường
    phân cách. **Không bao giờ dùng cho chữ có nghĩa.** Mọi chữ có nghĩa ở mức phụ dùng
    `{colors.ink-secondary}`.
  - Trên nền `{colors.amber}` **bắt buộc** chữ `{colors.ink-primary}`.
  - Chữ trên nền `{colors.surface-card}` và `{colors.surface-app}` dùng `{colors.ink-primary}`,
    `{colors.ink-strong}` hoặc `{colors.ink-secondary}`.
- **Không có nội dung chỉ hiện khi rê chuột.** Mọi thông tin phải đọc được mà không cần con trỏ.

---

## Responsive & Platform

**Quyết định: desktop-first cho CẢ HAI bề mặt.** Giữ nguyên PRD §7.1. Mobile là **responsive
xuống**, không có tối ưu riêng, không có bố cục riêng, không có ứng dụng di động (ngoài phạm vi,
PRD §7.2).

`[ASSUMPTION]` PRD không nêu breakpoint nào (G16). Đề xuất của phiên này:

| Bề mặt | ≥ 1280 px | 1024–1279 px | < 1024 px |
|---|---|---|---|
| Trang bán hàng | Sidebar danh mục cố định + lưới 4 cột | Sidebar cố định + lưới 3 cột | Sidebar **xếp lên trên** lưới thành một danh sách dọc; lưới 2 cột rồi 1 cột. Sidebar **không** biến thành ngăn kéo — danh mục phẳng nên danh sách dọc đọc được |
| Trang quản trị | Điều hướng dọc + bảng đầy đủ cột | Điều hướng dọc thu gọn + bảng đầy đủ cột | Bảng đơn hàng và bảng sổ cái **cuộn ngang trong khung riêng**, không đổ thành thẻ. Biểu mẫu xếp thành một cột |

Ở mọi kích thước: **không có control nào biến mất**. Thứ phải thấy ở desktop thì cũng phải thấy
ở điện thoại, kể cả khi phải cuộn.

### Rủi ro đã được nêu và người dùng vẫn chọn desktop-first

`[NOTE FOR UX]` PRD §11.2 Q7 và ADD §5 giao đích danh câu này cho phase UX: "Brief nói khách đến
từ Facebook/Zalo — **gần như chắc chắn là điện thoại**… Phase UX nên xem lại độ vênh này."
ADD §5: "Back office rõ ràng là desktop; storefront thì **đáng cân nhắc lại**."

Phiên UX **đã nêu rủi ro này với người dùng và người dùng vẫn chọn desktop-first cho cả hai bề
mặt.** Ghi lại đây để không ai tưởng nó bị bỏ sót:

- Lưu lượng Trang bán hàng nhiều khả năng chủ yếu đến từ điện thoại, qua liên kết trong bài
  Facebook/Zalo.
- Hai màn hình chịu rủi ro nặng nhất khi chỉ responsive xuống: **Giỏ hàng** (sửa số lượng, ba
  trạng thái cảnh báo cấp dòng) và **Đặt đơn** (ba trường bắt buộc + chọn phương thức thanh
  toán + nút một chiều).
- Vì không có analytics bên thứ ba (PRD §9.2), **sẽ không có số liệu nào chứng minh hay bác bỏ**
  rủi ro này sau khi ra mắt. Đây là quyết định không có đường hồi tiếp bằng dữ liệu.

Quyết định này **không được đảo từ phiên UX**. Nếu cần xem lại, nó thuộc `/speckit-clarify`
hoặc một lần cập nhật PRD trên nhánh baseline.

---

## Inspiration & Anti-patterns

- **Lấy từ ảnh chuẩn `imports/ref-ui-danh-muc-san-pham.png`:** bảng màu (ràng buộc cứng, áp cho
  cả hai bề mặt), và cách ảnh đó **đặt thông tin thành chữ thay vì icon** — trạng thái đọc được
  mà không cần giải mã. Bố cục và mật độ của ảnh chỉ là tham khảo; mỗi bề mặt tự quyết theo ngữ
  cảnh.
- **Lấy từ ảnh chuẩn:** thói quen dùng **pill chữ** cho trạng thái, nền nhạt + chữ đậm cùng tông
  (`{colors.success-bg}` + `{colors.success-ink}`, `{colors.accent-purple-bg}` +
  `{colors.accent-purple}`). Đọc được ở mọi kích thước, không phụ thuộc màu.
- **Bác bỏ — Guest checkout.** Tường đăng ký nằm giữa Giỏ hàng và Đặt đơn, và nó ở đó có chủ ý.
  Phản chỉ số SM-C2 nói thẳng: Tường đăng ký làm giảm chuyển đổi, và nó vẫn đúng. **Không được
  đề xuất lại.**
- **Bác bỏ — Giữ chỗ tồn kho trong giỏ hàng** (ADD §4 liệt kê là phương án đã loại). Không đồng
  hồ đếm ngược, không "giữ chỗ 15 phút". Giỏ hàng không hứa gì cả, và giao diện không được ngụ ý
  ngược lại.
- **Bác bỏ — Nới FR-14 để cứu đơn hàng.** Không có "đặt trước", không có "danh sách chờ", không
  có "đặt phần còn lại tự động". Nếu tồn kho không đủ thì **không có đơn hàng nào được tạo**.
- **Bác bỏ — Sổ địa chỉ của Khách hàng** (ADD §4). Địa chỉ giao hàng nhập lại trên từng đơn
  hàng, điền sẵn từ đơn hàng gần nhất. Đây là quyết định tối thiểu hoá dữ liệu theo Luật 91/2025,
  không phải thiếu sót.
- **Bác bỏ — Danh mục phân cấp nhiều tầng** (ADD §4). Phẳng, một cấp, sidebar trái.
- **Bác bỏ — Trạng thái chờ khách duyệt phí giao hàng** (`awaiting_customer_approval`, ADD §4).
  Đúng năm trạng thái, không có trạng thái thứ sáu.
- **Bác bỏ — Khan hiếm giả tạo.** "Chỉ còn 2 sản phẩm!", "12 người đang xem", "Ưu đãi kết thúc
  sau…". Con số tồn kho **không được lộ** cho Khách chưa đăng ký và Khách hàng (FR-5), và ngay
  cả khi được phép thì nó cũng đi ngược giọng đã chốt.
- **Bác bỏ — Analytics, pixel, heatmap, A/B test.** PRD §9.2 cấm theo dõi hành vi và phân tích
  bên thứ ba. Hệ quả thẳng thắn: **sản phẩm này không đo được trải nghiệm của chính nó.** Mọi
  quyết định UX ở đây phải đúng bằng lập luận, không bằng thí nghiệm.
- **Bác bỏ — Ăn mừng khi đặt đơn thành công.** Xác nhận đơn hiện mã đơn hàng và trạng thái
  **Đã đặt**. Giá trị nằm ở chỗ đơn hàng đã tồn tại trong hệ thống, không ở pháo giấy.

---

## Key Flows

Sáu hành trình dưới đây là UJ-1…UJ-6 của PRD §2.3, giữ nguyên nhân vật và thứ tự.

### UJ-1 — Chị Hằng đặt đơn lúc 10 giờ đêm, không nhắn tin cho ai

1. Chị Hằng mở liên kết từ một bài đăng. **Chưa đăng nhập.** Trang chủ trả HTTP 200, không
   redirect đi đâu.
2. Chị bấm một danh mục ở sidebar trái, lướt lưới sản phẩm, mở một Chi tiết sản phẩm. Thấy giá
   và dòng **"Còn hàng"**.
3. Bấm **Thêm vào giỏ hàng**. Số trên biểu tượng giỏ hàng tăng; trang không chuyển đi đâu.
4. Vào Giỏ hàng, bấm **Đặt đơn** → **Tường đăng ký** hiện ra: "Bạn cần một tài khoản để đặt đơn.
   Giỏ hàng của bạn được giữ nguyên."
5. Chị đăng ký bằng **email** + mật khẩu (≥ 8 ký tự). Đăng ký xong **có phiên đăng nhập ngay**,
   không phải đăng nhập lại. **Giỏ hàng vẫn nguyên.** Hệ thống trả chị về **đúng bước Đặt đơn**.
6. Nhập tên người nhận, số điện thoại, địa chỉ. Chọn **COD**. Bấm **Đặt đơn** — nút khoá ngay,
   nhãn đổi thành "Đang đặt đơn…".
7. **Cao trào:** màn hình **Xác nhận đơn** hiện **mã đơn hàng** và pill **Đã đặt**. Đơn hàng đã
   tồn tại trong hệ thống — nó không còn là một tin nhắn chờ ai đó đọc. Giỏ hàng đã được làm
   rỗng. Chị đóng máy và đi ngủ, không nhắn cho ai.

`[NOTE FOR UX]` Bước 5 dùng **email** làm định danh đăng nhập. Đây là **lập trường tạm** của
phiên UX cho PRD §11.1 Q9 (FR-9 hiện giả định số điện thoại). Phải xác nhận ở `/speckit-clarify`.
Căng thẳng cần theo dõi: email là định danh nhưng **không được dùng làm kênh gửi** (PRD §6), và
Luật 91/2025 + tối thiểu hoá dữ liệu đặt câu hỏi về việc thu thập một trường không dùng đến.

*Thất bại:* sản phẩm vừa hết giữa lúc chị ở màn hình Đặt đơn → UJ-6.

### UJ-2 — Anh Minh xem hết hàng rồi mới chịu khai tên

1. Anh Minh là **Khách chưa đăng ký**, đến từ một bài Facebook.
2. Gõ "binh giu nhiet" vào ô tìm kiếm. Tìm kiếm khớp **cả khi bỏ dấu**, không phân biệt
   hoa/thường → ra "Bình giữ nhiệt…".
3. Lọc thêm bằng danh mục ở sidebar, mở ba Chi tiết sản phẩm, bỏ hai sản phẩm vào giỏ hàng.
4. **Không có màn hình nào chặn anh cho tới đây.** Duyệt hàng không tốn gì thì không đòi gì.
5. Bấm **Đặt đơn** → **Tường đăng ký** mới xuất hiện. Anh đăng ký.
6. **Cao trào:** hai dòng giỏ hàng **đi tiếp nguyên vẹn** sau khi tạo tài khoản (FR-8) — không
   dòng nào mất, số lượng không đổi — và anh được trả về đúng bước Đặt đơn. Thứ duy nhất anh
   phải khai cho tới lúc này là một định danh và một mật khẩu; địa chỉ giao hàng mới hỏi ở bước
   sau.

*Biên đã biến mất:* giỏ hàng sống trong trình duyệt chứ không gắn với tài khoản (`architecture.md` AD-17), nên không tồn tại "tài khoản đã có sẵn giỏ hàng", và không có thông báo gộp nào. Cái giá đã được chấp nhận: mở lại trên thiết bị khác thì giỏ không theo sang.

### UJ-3 — Chị Lan mở Trang quản trị lúc 7 giờ sáng, xử lý đêm qua trong mười phút

1. Chị Lan gõ `/admin` **trên máy tính**, đăng nhập bằng biểu mẫu riêng của Trang quản trị.
2. Danh sách đơn hàng mở sẵn, lọc **Đã đặt** — những đơn hàng về trong đêm, mới nhất trước.
3. Mở một Chi tiết đơn hàng, **nhập phí giao hàng** cho khu vực đó. Lưu xong: tổng tiền đơn tính
   lại ngay, **trạng thái vẫn là Đã đặt**, và nút huỷ phía Khách hàng **vẫn còn**.
4. Chị nhắn Zalo cho Khách hàng để xác nhận phí giao hàng (ngoài hệ thống), rồi mới bấm chuyển
   sang **Đã xác nhận**.
5. Tồn kho đã bị trừ ngay từ lúc đơn hàng được đặt (FR-14) — không có gì phải đối chiếu, không
   có bảng tính nào phải mở.
6. **Cao trào:** bộ lọc **Đã đặt** trả về danh sách rỗng — "Không có đơn hàng nào ở trạng thái
   Đã đặt." Chị đóng máy. Đêm qua đã được xử lý xong, và không có đơn hàng nào sống ở nơi khác.

*Ràng buộc trải nghiệm:* bước 3 và bước 4 là **hai hành động riêng biệt**, bằng hai control
riêng. Nhập phí giao hàng không bao giờ tự chuyển trạng thái.

### UJ-4 — Chị Lan đối chiếu một khoản chuyển khoản

1. Một đơn hàng chọn **chuyển khoản**, đang ở **Đã đặt**. Trong Chi tiết đơn hàng, nút chuyển
   sang **Đã xác nhận** **bị khoá kèm lý do hiện rõ**: "Chưa xác nhận thanh toán. Đánh dấu đã
   nhận thanh toán trước khi chuyển sang Đã xác nhận." Nút bị **khoá, không bị ẩn** — chị phải
   thấy nó tồn tại và thấy điều kiện mở nó.
2. Chị mở app ngân hàng (ngoài hệ thống), thấy tiền về đúng số tiền và đúng **nội dung chuyển
   khoản chứa mã đơn hàng**.
3. Quay lại Chi tiết đơn hàng, bấm **Tôi đã nhận thanh toán**. Hộp thoại chặn lại và nói hậu quả
   **trước**: "Xác nhận thanh toán không thu hồi được. Sau khi xác nhận, đơn hàng này không huỷ
   được nữa, ở bất kỳ trạng thái nào."
4. Chị xác nhận. **Trạng thái đơn hàng không đổi** — nó vẫn là **Đã đặt**. Chỉ tình trạng xác
   nhận thanh toán đổi, và lịch sử ghi lại **ai** đã xác nhận, **lúc nào**.
5. **Cao trào:** nút **Đã xác nhận** mở khoá. Hệ thống không biết gì về ngân hàng và không giả
   vờ là biết — nó chỉ ghi lại việc chị đã xác nhận. Đó chính xác là điều một hệ thống ghi nhận
   nên làm.

*Biên:* tiền không bao giờ về → đơn hàng nằm ở **Đã đặt** cho tới khi chị huỷ; huỷ từ **Đã đặt**
thì **hoàn kho** (FR-18).

*Biên:* đơn hàng COD → control xác nhận thanh toán **không tồn tại**, không phải bị vô hiệu hoá.

### UJ-5 — Chị Hằng đổi ý trước khi đơn hàng được xác nhận

1. Sáng hôm sau chị mở **Lịch sử đơn hàng của tôi** — kênh duy nhất chị biết chuyện gì đang xảy
   ra.
2. Đơn hàng vẫn ở **Đã đặt**. Chị mở Chi tiết đơn hàng của tôi và thấy dòng **phí giao hàng**
   được **đánh dấu kèm thời điểm chủ shop cập nhật**: "Phí giao hàng — chủ shop cập nhật lúc
   07:42, 19/09/2026". Ba dòng tiền tách bạch: **tổng tiền hàng · phí giao hàng · tổng tiền
   đơn**. Phí cao hơn chị nghĩ.
3. Chị bấm **Huỷ đơn hàng**. Hộp thoại: "Huỷ đơn hàng DH-2026-000412. Số lượng đã trừ sẽ được
   hoàn lại tồn kho."
4. **Cao trào:** đơn hàng chuyển sang **Đã huỷ**, **tồn kho hoàn lại ngay** (FR-18), và chị
   không phải nhắn cho ai cả. Cái quyền nhỏ đó — tự đóng một đơn hàng — là toàn bộ khác biệt
   giữa một hệ thống và một cuộc trò chuyện.

*Nhánh quan trọng:* nếu đơn hàng đã ở **Đã xác nhận**, **nút huỷ không còn**, và màn hình **nói
rõ** thay vì để chị đoán: "Đơn hàng đã ở trạng thái Đã xác nhận nên bạn không huỷ được ở đây.
Bạn liên hệ chủ shop để xử lý."

`[NOTE FOR UX]` Quyền Khách hàng tự huỷ đơn hàng (FR-17) là **dòng mới, chưa có trong discovery,
đang chờ xác nhận** (PRD §11.1 Q5). Nếu bị bác, nút huỷ biến mất khỏi Chi tiết đơn hàng của tôi
và **toàn bộ UJ-5 sụp**. Phải giải ở `/speckit-clarify`.

### UJ-6 — Hai Khách hàng cùng nhắm sản phẩm cuối cùng

*Hành trình mà cả sản phẩm này tồn tại vì nó.* Xem thật:
[Đơn chưa đặt được](planning-artifacts/ux-designs/ux-sdd-framework-demo-2026-09-18/mockups/don-chua-dat-duoc.html).

1. Còn đúng **1** trong tồn kho. Chị Hằng và một Khách hàng khác cùng đang ở màn hình Đặt đơn,
   cùng có sản phẩm đó trong giỏ hàng.
2. Giỏ hàng **không giữ chỗ** tồn kho (FR-7). Cả hai màn hình đều hợp lệ. **Tới đây chưa có gì
   sai.**
3. Cả hai bấm **Đặt đơn** cách nhau chưa tới một giây. Cả hai nút khoá lại ngay.
4. Một người nhận màn hình **Xác nhận đơn** với mã đơn hàng và pill **Đã đặt**.
5. **Cao trào:** người kia không nhận một hộp thoại, không bị đá về Giỏ hàng, và không thấy
   giỏ hàng của mình bị ai đó sửa. Họ tới một **trang riêng: "Đơn chưa đặt được"**, và trang đó
   nói đúng ba điều, bằng giọng trung tính:

   > **Đơn chưa đặt được**
   >
   > Tồn kho đã thay đổi trong lúc bạn đặt đơn. Không có đơn hàng nào được tạo.
   >
   > **Dòng không đủ hàng**
   > · Bình giữ nhiệt Lock&Lock 500ml — bạn đặt **2**, còn **1**.
   >
   > Giỏ hàng của bạn được giữ nguyên. Bạn giảm số lượng hoặc xoá dòng này, rồi đặt đơn lại.
   >
   > [Về giỏ hàng]

6. **Không có đơn hàng thứ hai nào được tạo ra.** Giỏ hàng giữ nguyên **100%** — **hệ thống
   không tự sửa giỏ hàng**, không có nút "bỏ sản phẩm này, đặt phần còn lại". Người đó tự quyết
   định giảm số lượng hay xoá dòng giỏ hàng, rồi tự đặt lại.

*Vì sao trang này không xin lỗi:* không có gì hỏng. Tồn kho đúng, hệ thống đúng, và người dùng
không làm gì sai. Một lời xin lỗi sẽ ngụ ý rằng có lỗi, và sẽ mời gọi câu hỏi "vậy sửa đi". Một
lời trấn an ("đừng lo!") sẽ nói thay cảm xúc của người đọc. Trang này chỉ nêu sự việc, nêu số
liệu cụ thể, và trả lại quyền quyết định.

*Vì sao là trang riêng chứ không phải overlay:* overlay ngụ ý "tạm thời, đóng lại là xong". Đây
không phải chuyện tạm thời — đơn hàng đã không được tạo, và người dùng cần một chỗ đứng yên để
đọc con số, chứ không phải một lớp phủ trên màn hình vừa thất bại.

---

## Câu hỏi còn mở

### `[NOTE FOR UX]` — chờ quyết định ngoài phiên UX

| # | Vấn đề | Lập trường tạm của UX | Phải giải ở đâu |
|---|---|---|---|
| N1 | **Định danh đăng nhập: email hay số điện thoại?** FR-9 giả định số điện thoại. | **Email.** Biểu mẫu đăng ký có trường email bắt buộc. | `/speckit-clarify` — PRD §11.1 **Q9** |
| N2 | **Khôi phục mật khẩu chưa có FR nào.** | **Chủ shop đặt lại qua Trang quản trị** → sinh ra surface "Cài đặt → Đặt lại mật khẩu khách hàng". | `/speckit-clarify` — PRD §11.1 **Q10** · ADD §6 |
| N3 | **XUNG ĐỘT CHƯA GIẢI QUYẾT:** N2 **thêm một quyền vào ma trận phân quyền ĐANG ĐÓNG BĂNG của PRD §5** ("ba vai trò, hết… và phải giữ được như vậy"). Phiên UX **không sửa PRD**. | Vẽ theo phương án (a) để IA đóng được; đánh dấu là tạm. | `/speckit-clarify` — bắt buộc, trước khi đóng băng baseline |
| N4 | **Quyền Khách hàng tự huỷ đơn hàng (FR-17)** — dòng mới, chưa có trong discovery. | Giữ nút huỷ ở **Đã đặt**. Nếu bị bác thì **UJ-5 sụp**. | `/speckit-clarify` — PRD §11.1 **Q5** |
| N5 | **Chủ shop đặt đơn hộ Khách hàng (Q4) + Chủ shop có cần giỏ hàng không (Q12).** | UX thiết kế theo "**không**": phiên Chủ shop trên Trang bán hàng không có biểu tượng giỏ hàng, không có nút thêm vào giỏ hàng. Nếu Q4 = "có" thì Trang quản trị cần **một luồng đặt đơn hoàn toàn mới**. | `/speckit-clarify` — PRD §11.1 **Q4** · §11.2 **Q12** |
| N6 | **Ẩn danh hoá đơn hàng sau 12 tháng (PRD §9.3)** — PRD **không nêu** UI trình bày đơn hàng đã ẩn danh hoá ra sao, trong Lịch sử đơn hàng của tôi lẫn Trang quản trị. | Chưa thiết kế. Không có trạng thái hiển thị nào cho việc này trong tài liệu này. | `/speckit-clarify` — PRD §11.1 **Q3** `[CHẶN]` |
| N7 | **Phí giao hàng đổi sau khi đặt đơn mà không có kênh báo.** | Dấu hiệu cấp dòng kèm thời điểm cập nhật trong Chi tiết đơn hàng của tôi. Đây là cách **chịu đựng** khoảng trống, không phải đóng nó. | `/speckit-clarify` — PRD §11.2 **Q8** |
| N8 | **Đơn hàng chuyển khoản đã xác nhận thanh toán thì kẹt.** FR-24 quy định nói gì với **Chủ shop**, không quy định nói gì với **Khách hàng**. | Chuỗi tạm: "Chủ shop đã xác nhận thanh toán cho đơn hàng này nên không huỷ được nữa. Bạn liên hệ chủ shop." | `/speckit-clarify` — PRD §11.2 **Q11** |
| N9 | **Desktop-first so với thực tế Khách hàng đến từ Facebook/Zalo bằng điện thoại.** Rủi ro đã được nêu; người dùng **vẫn chọn desktop-first** cho cả hai bề mặt. Vì không có analytics (PRD §9.2), rủi ro này **không có đường hồi tiếp bằng dữ liệu**. | Giữ PRD §7.1. Responsive xuống, không tối ưu riêng. **Không đảo từ phiên UX.** | PRD §11.2 **Q7** · ADD §5 — nếu cần xem lại thì ở `/speckit-clarify` hoặc cập nhật PRD trên nhánh baseline |
| N10 | **Năm thuật ngữ do phiên này chốt chưa có trong `docs/baseline/glossary.md`:** Trang bán hàng, Trang quản trị, Tường đăng ký, Đặt đơn, Xác nhận đơn. | Dùng nguyên văn trong tài liệu này. | Người + BMAD trên nhánh `baseline/*` (CLAUDE.md §3) |

### `[ASSUMPTION]` — phiên UX phải đoán vì PRD im lặng

| # | Giả định | Vì sao phải đoán |
|---|---|---|
| A1 | **Breakpoint** ≥ 1280 / 1024–1279 / < 1024 px. | PRD không nêu breakpoint, kích thước màn hình, hay trình duyệt hỗ trợ (G16) |
| A2 | **Cấu trúc điều hướng toàn cục**: header Trang bán hàng có logo + ô tìm kiếm + biểu tượng giỏ hàng + menu tài khoản; Trang quản trị dùng điều hướng dọc trái; không có footer mang chức năng. | ADD §5 liệt kê bề mặt nhưng không nêu cấu trúc điều hướng giữa chúng (G19) |
| A3 | **Ngưỡng hiện skeleton 300ms** và skeleton mô phỏng đúng hình dạng nội dung. | PRD chỉ nêu mục tiêu p95, không nêu pattern tải (G18) |
| A4 | **Xử lý ngoại tuyến**: dải thông báo cố định + khoá mọi nút ghi + **không có hàng đợi ghi ngoại tuyến**. | PRD không nêu offline/PWA. Suy ra từ FR-5 (tồn kho không được cache) + FR-14 |
| A5 | **Khoá chống trùng cho biểu mẫu Đặt đơn** + thay thế mục lịch sử trình duyệt sau khi đặt đơn thành công. | PRD không nêu cơ chế chống bấm đôi; suy ra bắt buộc từ FR-14 |
| A6 | **Quy tắc giữ / đặt lại trạng thái khi quay lại** (giữ trang, danh mục, từ khoá, bộ lọc; đặt lại về trang 1 khi đổi danh mục/từ khoá/bộ lọc). | PRD không nêu |
| A7 | **Sắp xếp mặc định lưới sản phẩm: mới nhất trước.** | PRD không nêu thứ tự sắp xếp cho FR-1/FR-3 |
| A8 | **Ô tìm kiếm đặt ở header Trang bán hàng**, tìm kiếm cắt ngang danh mục. | PRD nêu chức năng tìm kiếm (FR-2) nhưng không nêu vị trí hay quan hệ với bộ lọc danh mục |
| A9 | **Trang "Không tìm thấy" dùng chung** cho sản phẩm không tồn tại và đơn hàng không thuộc về người đang xem. | PRD chỉ nêu mã HTTP 404, không nêu giao diện (G18) |
| A10 | **Sổ cái tồn kho phân trang**, mới nhất trước, mã đơn hàng bấm được sang Chi tiết đơn hàng. | FR-27 quy định dữ liệu ghi vết nhưng PRD không nêu màn hình đọc (G13) |
| A11 | **Nút sao chép** cho số tài khoản và nội dung chuyển khoản trong khối hướng dẫn chuyển khoản. | FR-23 quy định nội dung hiển thị, không quy định thao tác |
| A12 | **Vùng bấm tối thiểu 44×44 px** và các quy tắc accessibility hành vi khác. | PRD **không nêu bất kỳ yêu cầu accessibility nào** (G14); mức sàn WCAG 2.1 AA do phiên UX đặt ra |

