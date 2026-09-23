# Impact Analysis: 002-accounts

**Feature**: `002-accounts`
**Track**: B — brownfield feature over completed `000-walking-skeleton` and `001-catalog-browse`
**Created**: 2026-09-23
**Mode**: READ-ONLY analysis before implementation

## 1. Baseline Reference Check

- **PRD FRs touched**:
  - `FR-9`: Đăng ký khách hàng (Customer self-registration with email and password).
  - `FR-10`: Đăng nhập và đăng xuất (Customer and Shop owner login/logout, session lifecycle, failed login rate limit).
  - `FR-33`: Tài khoản chủ shop được tạo sẵn (Pre-seeded single Shop owner account; no public registration).
- **Architecture decisions that constrain this work**:
  - `AD-5`: Ranh giới module là ranh giới dữ liệu — module `identity` sở hữu các bảng `account`, `session`, `failed_login_attempt` (hoặc cấu trúc tương đương). Không module nào khác đọc/ghi trực tiếp bảng của `identity`.
  - `AD-6`: Email là định danh, không bao giờ là địa chỉ gửi — không thêm thư viện gửi mail, không SMTP client, không SMS gateway.
  - `AD-8`: Một origin, phiên lưu ở server trong PostgreSQL, hai bề mặt không dùng chung cookie (`httpOnly; Secure; SameSite=Lax`; cookie Trang bán hàng tách biệt với cookie Trang quản trị; thu hồi phiên bằng cách xoá dòng trong PostgreSQL; không lưu token trong `localStorage` hay `sessionStorage`).
  - `AD-10`: Hợp đồng HTTP có đúng một nguồn sự thật, tách theo bề mặt (`storefront` và `backoffice`) trong `packages/shared`.
- **Glossary terms involved**:
  - `Guest` (Khách chưa đăng ký)
  - `Customer` (Khách hàng)
  - `Shop owner` (Chủ shop)
- **Fits current architecture**: **YES** (Hoàn toàn nằm trong kiến trúc modular monolith và baseline đã freeze).

## 2. Existing behaviour

Hiện tại hệ thống đã hoàn thành hai lát cắt:
- `000-walking-skeleton`: Cung cấp nền tảng NestJS API, PostgreSQL (Drizzle ORM), Docker Compose, reverse proxy Caddy (một origin), cấu hình bảo mật header CSP, và kiểm thử bất biến tồn kho.
- `001-catalog-browse`: Cung cấp khả năng duyệt danh mục phẳng, tìm kiếm sản phẩm theo tên không dấu tiếng Việt, phân trang, xem chi tiết sản phẩm cho Guest.

Hành vi liên quan đến định danh hiện tại:
- Tất cả request từ storefront hiện đang ở vai trò `Guest` công khai, chưa có cơ chế xác thực hoặc quản lý phiên.
- Chưa có bảng người dùng (`account`), bảng phiên (`session`) hay bảng theo dõi đăng nhập sai trong cơ sở dữ liệu.
- Chưa có module `identity` trong `apps/api`.
- Seed data trong `db/seed.ts` chỉ khởi tạo danh mục, sản phẩm, ảnh và tồn kho; chưa khởi tạo tài khoản Shop owner duy nhất theo `FR-33`.

## 3. Affected modules

- `apps/api/src/modules/identity/` (mới):
  - Module quản lý tài khoản, mật khẩu (hash an toàn với Node.js crypto / scrypt / argon2), phiên làm việc lưu trong PostgreSQL, và rate limiting chống brute-force (10 lần sai / 15 phút).
  - Cung cấp guard/middleware trích xuất phiên từ cookie `httpOnly` và gắn định danh người dùng vào request context.
- `apps/api/src/app.module.ts`:
  - Đăng ký `IdentityModule` vào cây DI của ứng dụng.
- `packages/shared/src/storefront/auth.ts` (mới) & `packages/shared/src/index.ts`:
  - Khai báo schema Zod và TypeScript type cho request/response đăng ký, đăng nhập, thông tin phiên hiện tại (`SessionInfo` / `CurrentUserResponse`).
- `db/schema/identity.ts` (mới) & `db/migrations/`:
  - Khai báo bảng `account`, `session` và migration append-only tương ứng.
- `db/seed.ts`:
  - Khởi tạo tài khoản duy nhất của `Shop owner` từ cấu hình/biến môi trường (không có luồng đăng ký công khai cho Shop owner theo FR-33).
- `apps/storefront/src/`:
  - Bổ sung màn hình/form đăng ký, đăng nhập cho Customer; component hiển thị trạng thái tài khoản (đăng xuất, email khách hàng); client API gọi endpoints auth.
- `ops/Caddyfile`:
  - Đảm bảo routing cho các auth endpoint `/api/auth/*` và thiết lập cookie header an toàn.

## Affected contracts

- **API Endpoints (Storefront)**:
  - `POST /api/auth/register`: Đăng ký tài khoản Customer (nhận `email`, `password`; trả về phiên đăng nhập ngay, set cookie `httpOnly`).
  - `POST /api/auth/login`: Đăng nhập Customer (nhận `email`, `password`; kiểm tra rate limit; set cookie `httpOnly`).
  - `POST /api/auth/logout`: Đăng xuất (thu hồi phiên trong database, xoá cookie).
  - `GET /api/auth/me`: Lấy thông tin tài khoản đang đăng nhập của phiên hiện tại (hoặc null nếu là Guest).
- **Cookie Contract**:
  - Tên cookie storefront: ví dụ `shop_session` (AD-8).
  - Cờ: `HttpOnly; Secure; SameSite=Lax; Path=/`.
- **Database Schema**:
  - Bảng `account`: `id`, `email` (unique, lowercase), `password_hash`, `role` (`customer` | `shop_owner`), `created_at`, `updated_at`.
  - Bảng `session`: `id` (token/UUID ngẫu nhiên có entropy cao), `account_id`, `expires_at`, `created_at`, `last_active_at`.
  - Bảng / cơ chế `failed_login_attempt`: ghi nhận số lần thất bại theo email/identifier trong cửa sổ trượt 15 phút.

## 5. Contracts that must remain compatible or move together

- `Guest` browsing (Feature 000 & 001) phải giữ nguyên vẹn 100%: người dùng chưa đăng nhập vẫn duyệt danh mục, tìm kiếm và xem chi tiết sản phẩm bình thường mà không bị redirect hay ép đăng nhập.
- Không để lộ thông tin nhạy cảm:
  - Mật khẩu không bao giờ lưu bản rõ và không bao giờ xuất hiện trong response hay log.
  - Lỗi đăng nhập sai trả thông báo tổng quát, không tiết lộ email có tồn tại trong hệ thống hay không (FR-10).
  - Không bao giờ gửi email xác nhận hay OTP vì email chỉ là định danh đăng nhập (AD-6).
- Phiên làm việc (Session):
  - Phiên lưu ở server (PostgreSQL), thu hồi ngay khi logout hoặc reset (AD-8).
  - Hết hạn sau 30 ngày không hoạt động, tối đa 90 ngày tuyệt đối (FR-10).
  - Cookie Trang bán hàng hoàn toàn tách biệt với Trang quản trị (AD-8).

## 6. Tests to preserve and extend

- **Tests hiện có bắt buộc giữ nguyên vẹn**:
  - Toàn bộ unit/integration tests của `catalog`, `stock`, `shared`, `ui`.
  - Toàn bộ 19 kịch bản E2E Playwright của feature 000 và 001.
- **Tests mới cần bổ sung (Test-First / TDD)**:
  - Unit tests cho password hashing và validation rules (mật khẩu >= 8 ký tự, email chuẩn hoá).
  - Integration tests cho `POST /api/auth/register` (thành công, trùng email, mật khẩu ngắn).
  - Integration tests cho `POST /api/auth/login` (đúng pass, sai pass, rate limit sau 10 lần sai trong 15 phút).
  - Integration tests cho `POST /api/auth/logout` và xác thực phiên qua `GET /api/auth/me`.
  - Integration tests đảm bảo tài khoản Shop owner được seed sẵn và từ chối đăng ký tài khoản Shop owner qua API công khai (FR-33).
  - Storefront component tests cho form đăng ký, form đăng nhập, trạng thái đăng xuất.
  - E2E tests kiểm thử luồng đăng ký, đăng nhập, bảo tồn phiên qua refresh, đăng xuất, và rate limit.
