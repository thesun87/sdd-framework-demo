# Báo cáo T007 — `packages/ui`: design token + primitive khả năng tiếp cận

## Đã làm gì

Thay nội dung placeholder của T001 (`packages/ui/src/index.ts`) bằng:

1. **Design token** (`packages/ui/src/tokens.ts`)
   - `colors.neutral` (chữ/nền mặc định), `colors.success` (nhãn "Còn hàng"),
     `colors.danger` (nhãn "Hết hàng") — mỗi cặp là `{ text, background }`.
   - `spacing`: `xs` (4px) · `sm` (8px) · `md` (16px) · `lg` (24px).
   - `fontSize`: `sm` (14px) · `md` (16px) · `lg` (20px).
   - Gộp lại thành `tokens = { colors, spacing, fontSize }`, xuất cả object gộp
     lẫn từng phần để React import trực tiếp.

2. **`StockStatusLabel`** (`packages/ui/src/StockStatusLabel.tsx`)
   - Nhận `status: StockStatus` (`"in_stock" | "out_of_stock"`, union cục bộ
     khai trong chính file này — **không** import từ `packages/shared`, đúng
     yêu cầu brief mục 2 vì T006 đang viết package đó song song trong cùng
     worktree).
   - Luôn render **chữ** tiếng Việt: `"Còn hàng"` / `"Hết hàng"`. Màu
     (success/danger token) chỉ là gia cố thị giác thêm, không phải kênh
     truyền tải duy nhất.
   - Dùng `spacing.xs/sm` và `fontSize.sm` cho padding/cỡ chữ — token được
     tiêu thụ thật, không chỉ khai báo suông.

3. **`RouteAnnouncer`** (`packages/ui/src/RouteAnnouncer.tsx`)
   - Component nhận `message: string`, render một `<div role="status"
     aria-live="polite" aria-atomic="true">` ẩn khỏi màn hình (visually-hidden
     CSS inline) nhưng vẫn trong cây accessibility.
   - `storefront` (task khác) sẽ gọi lại với `message` mới sau mỗi lần điều
     hướng route thành công — đổi nội dung là thứ kích hoạt announcement.
   - Politeness cố định `"polite"`: phù hợp cho thông báo đổi trang (không
     khẩn cấp, không ngắt ngang thao tác người dùng).

4. **Barrel** (`packages/ui/src/index.ts`) xuất lại tất cả những gì nêu trên.

## Tên export (dùng cho `storefront`)

```ts
export { tokens, colors, spacing, fontSize } from "ui";
export { StockStatusLabel } from "ui";
export type { StockStatus, StockStatusLabelProps } from "ui";
export { RouteAnnouncer } from "ui";
export type { RouteAnnouncerProps } from "ui";
```

- `StockStatus` = `"in_stock" | "out_of_stock"` (union cục bộ, không phải type từ `packages/shared`).
- `StockStatusLabelProps` = `{ status: StockStatus }`.
- `RouteAnnouncerProps` = `{ message: string }`.

## Số tương phản thật (WCAG 2.1 AA, công thức relative luminance)

Công thức: với mỗi kênh `c ∈ [0,1]`, `lin(c) = c/12.92` nếu `c ≤ 0.03928`,
ngược lại `((c+0.055)/1.055)^2.4`; `L = 0.2126·R + 0.7152·G + 0.0722·B`;
`contrast = (L_sáng + 0.05) / (L_tối + 0.05)`. Tính bằng script Python, không
phỏng đoán:

| Cặp | Chữ | Nền | Tỉ lệ | Ngưỡng đạt |
|---|---|---|---|---|
| `colors.neutral` | `#1A1A1A` | `#FFFFFF` | **17.40:1** | Vượt xa AA chữ thường (4.5:1) và cả AAA (7:1) |
| `colors.success` (nhãn "Còn hàng") | `#1E4620` | `#E6F4EA` | **9.47:1** | Vượt AA chữ thường (4.5:1), đạt cả AAA (7:1) |
| `colors.danger` (nhãn "Hết hàng") | `#7A271A` | `#FCE8E6` | **8.36:1** | Vượt AA chữ thường (4.5:1), đạt cả AAA (7:1) |

Cả ba cặp đều đạt ngưỡng cao hơn yêu cầu tối thiểu (4.5:1 cho chữ thường),
nên không cần viện tới ngưỡng 3:1 dành cho chữ lớn.

## Test

Chạy dưới Vitest 5.0.1 + jsdom (pragma `// @vitest-environment jsdom` mỗi
file test, không cần thêm `vitest.config.ts`) + `@testing-library/react`.

- `StockStatusLabel.test.tsx` (3 test): render đúng chữ "Còn hàng" / "Hết
  hàng" cho từng giá trị `status`; khẳng định nội dung chữ luôn khác nhau
  giữa hai trạng thái (không dựa vào màu để phân biệt).
- `RouteAnnouncer.test.tsx` (2 test): vùng `role="status"` có
  `aria-live="polite"`; vùng nhận đúng nội dung thông báo mới khi `message`
  đổi (mô phỏng route đổi qua `rerender`).

Đã bỏ `--passWithNoTests` khỏi `packages/ui/package.json` (`"test": "vitest run"`).

### Output thật

```
$ npm run test --workspace=ui
> ui@0.1.0 test
> vitest run

 RUN  v5.0.1 .../packages/ui

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Duration  946ms
```

```
$ npm run lint --workspace=ui
> ui@0.1.0 lint
> tsc --noEmit
(exit 0, không output)
```

```
$ npm run build --workspace=ui
> ui@0.1.0 build
> tsc -p tsconfig.build.json
(exit 0, không output — dist/ sinh ra index.js, tokens.js, StockStatusLabel.js,
RouteAnnouncer.js + .d.ts tương ứng)
```

### Lệnh hợp đồng ở gốc repo

```
$ npm test     → PASS tất cả workspace (glue, apps/api, apps/storefront,
                 packages/shared, packages/ui) — packages/ui: 2 test file, 5 test, pass.
$ npm run lint → PASS tất cả workspace.
$ npm run build→ PASS tất cả workspace (apps/storefront build qua vite,
                 packages/shared, packages/ui build qua tsc).
```

Không có lỗi nào từ `packages/shared` (T006) — tất cả pass ở lần chạy này.

## Thay đổi ngoài `src/`

- `packages/ui/package.json`: bỏ `--passWithNoTests`; thêm
  `peerDependencies.react: "19.3.0"`; thêm `devDependencies`: `react`,
  `react-dom`, `@types/react`, `@types/react-dom` (đều pin đúng bản đã có sẵn
  trong repo — `apps/storefront` dùng cùng bản `19.3.0`). Lý do: `tsx`/`jsx`
  cần type React, và Constitution §VI yêu cầu khai báo tường minh mọi
  dependency được dùng thay vì dựa ngầm vào hoist của npm workspaces.
- `packages/ui/tsconfig.json`: thêm `"jsx": "react-jsx"`; mở rộng `include`
  sang `src/**/*.tsx`.
- `packages/ui/tsconfig.build.json`: loại `**/*.test.tsx`/`**/*.spec.tsx`
  khỏi bundle build (thêm cạnh loại trừ `.ts` sẵn có).

Không đụng tới `package.json` gốc, không đụng `packages/shared/**`.

## Tự soát xét (self-review)

- `packages/ui/src` có đúng **6 file**: `tokens.ts`, `StockStatusLabel.tsx`,
  `StockStatusLabel.test.tsx`, `RouteAnnouncer.tsx`, `RouteAnnouncer.test.tsx`,
  `index.ts`. Không có Button/Card/Modal/Grid hay component nào khác.
  **2 primitive + 1 file token + 1 barrel** = đúng mức tối thiểu brief yêu cầu.
- Không hardcode `"Còn hàng"`/`"Hết hàng"` ở đâu ngoài
  `StockStatusLabel.tsx` (nơi định nghĩa `STOCK_STATUS_LABELS`) — các chỗ
  khác chỉ là chuỗi trong test (khẳng định đầu ra) hoặc trong docstring giải
  thích token.
- Không import gì từ `apps/**`, không import gì từ `packages/shared/**`.
- Số tương phản là số tính thật (script Python, công thức WCAG relative
  luminance), không phải ước lượng.
- Token `spacing`/`fontSize` được `StockStatusLabel` tiêu thụ thật (padding,
  fontSize); không có token "chết" ngoài `colors.neutral` và
  `spacing.md/lg`, `fontSize.md/lg` — các mục này là phần còn lại của một
  bảng màu/thang đo tối thiểu (chữ/nền mặc định + 4 mức spacing + 3 mức cỡ
  chữ), đúng những gì mục 1 của brief liệt kê ("bảng màu, khoảng cách, cỡ
  chữ"), chưa có consumer khác trong `000` nhưng sẽ dùng ở các bước UI tiếp
  theo của `storefront`.

## Băn khoăn / lưu ý cho task đọc report này (storefront)

- `RouteAnnouncer` là **controlled**: `storefront` phải tự set lại chuỗi
  `message` (ví dụ: `"Đã chuyển đến trang <tên trang>"`) mỗi khi route đổi;
  bản thân component không tự sinh nội dung.
- `StockStatus` là union cục bộ khai trong `packages/ui`, không phải type từ
  `packages/shared`. Nếu `packages/shared` (T006) sau này xuất bản type
  tương đương, việc hợp nhất hai union nên là một task riêng, có bàn bạc,
  không tự ý làm trong T007.
- Đã thêm `react`/`react-dom`/`@types/react`/`@types/react-dom` vào
  `packages/ui/package.json` (trước đó các gói này chỉ tồn tại ẩn qua hoist
  từ `apps/storefront`). Không sửa `package.json` gốc hay `package-lock.json`.
