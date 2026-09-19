# Phase 1 — Data Model: Walking Skeleton

Nguồn: `architecture.md` §Thực thể lõi, AD-5 (ranh giới module = ranh giới dữ liệu),
AD-24 (quan hệ vượt biên), §Consistency Conventions. Tên bảng/cột `snake_case`, type
`PascalCase`, khoá chính `bigint` identity nội bộ, tiền là **số nguyên VND**, thời gian
`timestamptz` UTC.

Feature `000` dựng **năm bảng** thuộc **hai module**. Ba module còn lại
(`identity`, `ordering`, `settings`) không có bảng nào ở đây.

## Module `catalog`

### `category`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `bigint` identity | PK |
| `name` | `text` | NOT NULL |
| `name_normalized` | `text` | NOT NULL — chuẩn hoá **lúc ghi**, không lúc đọc (AD-11) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

> Danh mục có mặt ở `000` chỉ để Product thuộc về 0..1 Category. Duyệt theo danh mục,
> số đếm cạnh sidebar và tìm kiếm bỏ dấu là `001`.

### `product`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `bigint` identity | PK |
| `category_id` | `bigint` | NULL cho phép (0..1), FK → `category.id` |
| `name` | `text` | NOT NULL |
| `name_normalized` | `text` | NOT NULL (AD-11) |
| `description` | `text` | NOT NULL, mặc định chuỗi rỗng |
| `price` | `bigint` | NOT NULL, **số nguyên VND đã gồm VAT**, `CHECK (price >= 0)` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

> **Không** cột `slug`. `architecture.md` §Consistency chốt khoá chính là `bigint` nội bộ và
> chỉ `Order` mới có mã công khai (`order_code`). Thêm `slug` là phát minh từ vựng — không làm.
>
> **Không** cột trạng thái `Ngừng bán` ở `000`. Đó là FR-26, thuộc `009`.

### `product_image`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `bigint` identity | PK |
| `product_id` | `bigint` | NOT NULL, FK → `product.id`, `ON DELETE CASCADE` |
| `path` | `text` | NOT NULL — đường dẫn trên đĩa, không phải blob (AD-15) |
| `position` | `int` | NOT NULL — ảnh đại diện là `position` nhỏ nhất (UX §571) |

## Module `stock`

**`stock` là chủ sở hữu duy nhất của đường ghi vào tồn kho (AD-2).** Không module nào khác
`UPDATE` hai bảng dưới đây. `stock` **không biết `ordering` tồn tại**.

### `stock`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `product_id` | `bigint` | PK, FK → `catalog.product.id`, `ON DELETE CASCADE` (AD-24) |
| `quantity` | `int` | NOT NULL, **`CHECK (quantity >= 0)`** ← bất biến trung tâm của sản phẩm |
| `updated_at` | `timestamptz` | NOT NULL |

> `CHECK (quantity >= 0)` **là** nơi bất biến sống — không phải trong code. AD-25: mọi
> migration sau này chạm bảng này phải nói rõ nó **giữ nguyên** ràng buộc gì.

### `stock_ledger` — append-only, không bao giờ `UPDATE` hay `DELETE`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `bigint` identity | PK |
| `product_id` | `bigint` | NOT NULL, FK → `catalog.product.id`, **`ON DELETE RESTRICT`** (AD-24 — sổ cái là bản kiểm toán) |
| `delta` | `int` | NOT NULL, `CHECK (delta <> 0)` |
| `quantity_after` | `int` | NOT NULL, `CHECK (quantity_after >= 0)` |
| `reason` | enum | NOT NULL ∈ `{order_placed, order_cancelled, manual_adjustment}` (AD-4) |
| `order_id` | `bigint` | NULL — **giá trị trần, KHÔNG khoá ngoại** (AD-24: `stock` không được biết `ordering` tồn tại) |
| `actor_account_id` | `bigint` | NULL ở `000` — chưa có `identity` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

> `reason` giữ **đủ ba** giá trị của AD-4 ngay từ `000`, dù `000` chỉ sinh ra một loại: enum
> là hợp đồng dữ liệu, và mở rộng enum sau là một migration mà AD-25 bắt phải chỉ tiến.
> `actor_account_id` để NULL-able vì `identity` chưa tồn tại; `002` sẽ không phải đổi kiểu cột.

## Quan hệ vượt biên (trích AD-24 — bảng đầy đủ ở baseline)

| Quan hệ | Khoá ngoại? | Khi xoá bản ghi được trỏ |
|---|---|---|
| `stock.product_id` → `catalog.product` | Có | `CASCADE` |
| `stock_ledger.product_id` → `catalog.product` | Có | **`RESTRICT`** |
| `stock_ledger.order_id` → `ordering.order` | **Không** | giá trị trần; ở `000` luôn NULL |

**Khoá ngoại không bao giờ là giấy phép `JOIN`** (AD-5). Đường đọc sản phẩm kèm tình trạng
tồn kho ghép dữ liệu bằng **lời gọi service công khai** `catalog → stock`, không bằng `JOIN`
qua biên module.

## Chuyển trạng thái

Feature `000` không có máy trạng thái nào. `order_status` là `ordering`, thuộc `004`/`007`.
Thay đổi duy nhất ở đây là con số `stock.quantity`, và nó đi qua **đúng một** đường ghi:
delta có điều kiện của AD-1, kèm một dòng `stock_ledger` trong cùng đơn vị công việc.

## Quy tắc kiểm chứng gắn với model

| Bất biến | Sống ở đâu | Test mang tên nó |
|---|---|---|
| Tồn kho không bao giờ âm | `CHECK (quantity >= 0)` | `stock-never-negative.int-spec.ts` |
| N tiến trình, tồn kho M → đúng M lần thành công | số dòng bị ảnh hưởng của `UPDATE` có điều kiện | `stock-conditional-delta.race-spec.ts` |
| Sổ cái khớp cột | `stock_ledger.quantity_after` | `stock-ledger-matches-quantity.int-spec.ts` |
| Xoá sản phẩm có sổ cái bị chặn | `ON DELETE RESTRICT` | `stock-ledger-restrict.int-spec.ts` |

Hậu tố tên file quyết định test chạy dưới luật cô lập nào (§Consistency Conventions):
`*.int-spec.ts` chạm database, `*.race-spec.ts` chạy dưới luật AD-28.
