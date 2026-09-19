# Quickstart — Walking Skeleton

Hướng dẫn **chạy và kiểm chứng**, không phải hướng dẫn hiện thực. Chi tiết hình dạng dữ liệu ở
[data-model.md](./data-model.md), hợp đồng HTTP ở [contracts/storefront-http.md](./contracts/storefront-http.md).

## Điều kiện tiên quyết

| Yêu cầu | Trạng thái trên máy này (2026-09-19) |
|---|---|
| Node ≥ 24.15 | ✅ 24.21.0 |
| Python ≥ 3.10 + PyYAML | ✅ 3.12.3 |
| Docker + Docker Compose | ❌ **chưa dùng được trong distro WSL này** (`docs/tooling-versions.md`) |
| `npx playwright install` | ⏳ cần mạng lần đầu |

**Docker là chặn cứng, không phải tuỳ chọn.** AD-27 cấm thay PostgreSQL thật bằng bất cứ thứ
gì — `pg-mem`, shim SQLite hay repository giả đều khiến test *"xanh mà không chứng minh gì,
tệ hơn không có test"*. Cổng nghiệm thu của `000` không đi qua được cho tới khi nó được gỡ.

## Dựng và chạy

```bash
docker compose -f ops/compose.yaml up -d postgres   # dịch vụ dùng chung, không dựng lại mỗi lần
npm run db:migrate                                  # drizzle-kit migrate — TRƯỚC khi khởi động app
npm run db:seed                                     # nạp Sản phẩm mẫu — idempotent, không chạy ở prod
docker compose -f ops/compose.yaml up -d            # proxy + api + postgres
```

`drizzle-kit push` **bị cấm ở mọi môi trường, kể cả máy dev** (AD-25). Lược đồ của database
test dựng bằng **đúng** lệnh áp cho prod — không bao giờ bằng một đường riêng.

## Kiểm chứng — chạy nguyên văn bốn lệnh của hợp đồng

Không task nào được tự đặt lệnh test riêng (`verification.md`, Constitution §III).

```bash
npm test              # glue + Jest(api) + Vitest(storefront, packages) — gồm *.int-spec.ts, *.race-spec.ts
npm run lint
npm run build         # Vite build storefront + compile apps/api
npm run test:regression   # npm test + Playwright e2e
```

**Cổng thật không phải exit code.** Output phải cho thấy **nửa sản phẩm đã CHẠY**, không phải
`SKIPPED — no product workspace exists yet`. Đây là lần đầu tiên điều đó đúng trong repo này.

## Kịch bản nghiệm thu chạy tay

| # | Làm gì | Mong đợi | Truy về |
|---|---|---|---|
| 1 | Mở `/` | HTTP 200, thấy tên + giá + nhãn tồn kho của Sản phẩm mẫu | FR-001, FR-002, SC-001 |
| 2 | Bấm vào thẻ sản phẩm | Trang chi tiết: tên, mô tả, giá, ảnh, nhãn tồn kho. **Không** nút thêm vào giỏ | FR-003 |
| 3 | Mở `/api/products/999999` | HTTP 404, không stack trace | FR-004 |
| 4 | Đổi giá ở database, tải lại `/` | Giá hiển thị đổi theo | SC-001 |
| 5 | Đặt `quantity = 0`, tải lại | Nhãn "Hết hàng" dạng **chữ**; sản phẩm **vẫn hiện** | FR-005, FR-008 |
| 6 | Đọc toàn bộ thân `/api/products` | **Không có** con số tồn kho ở bất cứ đâu | FR-007, SC-005 |
| 7 | `curl -I /` và `curl -I /admin/` | Cả hai mang đủ CSP + `Referrer-Policy` + `X-Content-Type-Options` | AC-AD29, SC-004 |
| 8 | Đọc header của `/api/products` | `Cache-Control: no-store` | FR-006, AD-20 |

## Kịch bản nghiệm thu bằng test — cái quan trọng nhất

```bash
npm test -- stock-conditional-delta.race-spec.ts
```

Với Sản phẩm tồn kho **M**, **N** kết nối độc lập cùng rút 1 đơn vị (N > M, N ≥ 20, M ≥ 5):

- đúng **M** lần thành công, **N − M** lần trả về "0 dòng bị ảnh hưởng" (kết quả hợp lệ, không phải exception)
- `stock.quantity` cuối bằng **0**, không thời điểm nào âm
- chạy lại **≥ 10 lần liên tiếp** trên cùng database, không dựng lại nó → kết quả giống hệt

Test này chạy trên **trạng thái đã commit**, nhiều kết nối độc lập, dọn bằng `TRUNCATE`.
**Không bao giờ** transaction rollback (AD-28) — cách cô lập đó gộp N tiến trình vào một
transaction, tranh chấp biến mất, và test xanh một cách vô nghĩa.

Một luồng Playwright xanh **không bao giờ** được tính là đã chứng minh tính nguyên tử.

## Ghi chú về `db:seed`

`npm run db:seed` chạy `db/seed.ts` — **idempotent**, tách khỏi `db/migrations/`, và **không
bao giờ chạy ở prod** (chốt 2026-09-19). Chạy lại nhiều lần phải cho cùng một trạng thái;
đó là điều kiện để `SC-007` lặp lại được.
