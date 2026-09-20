// db/seed.ts — nạp dữ liệu mẫu (1 category, 1 product, ảnh, tồn kho) để trang chủ có thật một
// Sản phẩm để hiển thị (SC-007). TÁCH KHỎI db/migrations/ theo quyết định của người,
// 2026-09-19 (plan.md §Quyết định đã chốt (A)): AD-25 chỉ phủ migration LƯỢC ĐỒ; dữ liệu mẫu
// đổi thường xuyên hơn lược đồ, nhét nó vào migration sẽ biến mỗi lần đổi demo data thành một
// thay đổi chỉ-tiến không thể quay lui. KHÔNG sinh migration, KHÔNG gọi drizzle-kit.
//
// Idempotent (yêu cầu #2 của task-005-brief.md — SC-007 phụ thuộc trực tiếp): chạy lại nhiều
// lần cho CÙNG một trạng thái, không nhân bản dữ liệu, không lỗi ở lần thứ hai/ba.
//   - category, product: tra theo `name_normalized` trước khi ghi — không có ràng buộc UNIQUE
//     ở lược đồ (T004 không khai báo), nên idempotency ở đây là logic ứng dụng.
//   - product_image: tra theo (product_id, path) trước khi ghi.
//   - stock: PK = product_id → `ON CONFLICT (product_id) DO NOTHING`, idempotent ở TẦNG
//     DATABASE, không chỉ ứng dụng.
// Toàn bộ nằm trong một transaction để lần chạy thứ hai không thấy trạng thái nửa vời.
//
// KHÔNG ghi vào bảng sổ cái tồn kho ở đây (yêu cầu #5 của brief) — sổ cái ghi lại THAY ĐỔI
// tồn kho; trạng thái ban đầu của dữ liệu mẫu không phải một thay đổi nghiệp vụ. (Tên bảng
// cố ý không xuất hiện nguyên văn trong file này — xem acceptance criteria của task-005.)

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { category, product, productImage, stock } from './schema/index.js';

// Thư mục chứa file này (`db/`) — dùng để định vị `db/assets/ca-phe-sua-da.jpg` không phụ
// thuộc `cwd` lúc chạy script (Ruling R23, T011c). `import.meta.url` vì `db/seed.ts` chạy qua
// `tsx` (ESM, `"type": "module"` ở package.json gốc) — không có `__dirname` CommonJS ở đây.
const seedDir = path.dirname(fileURLToPath(import.meta.url));

// Hàng rào chạy được — không phải một dòng comment (yêu cầu #3 của brief). Tên biến NODE_ENV
// đã chốt ở T002.
if (process.env.NODE_ENV === 'production') {
  console.error(
    'db/seed.ts: từ chối chạy vì NODE_ENV=production. Script này chỉ nạp dữ liệu MẪU cho môi ' +
      'trường phát triển/kiểm thử — không bao giờ chạy ở production. Nếu bạn đang cố nạp dữ ' +
      'liệu mẫu cho dev/test, hãy chạy lại với NODE_ENV=development (hoặc test).',
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('db/seed.ts: DATABASE_URL chưa được set — xem ops/.env.example.');
  process.exit(1);
}

// AD-15: ảnh sản phẩm nằm trên hệ tệp cục bộ (named volume), không phải blob trong database.
// Mặc định khớp đúng quy ước `${PRODUCT_IMAGE_PATH:-/data/product-images}` của
// ops/compose.yaml khi biến chưa được set.
const productImagePath = process.env.PRODUCT_IMAGE_PATH ?? '/data/product-images';

/**
 * Quy tắc chuẩn hoá `name_normalized` (AD-11) — phiên bản ĐƠN GIẢN NHẤT theo yêu cầu #4 của
 * task-005-brief.md: hạ chữ thường, bỏ dấu tiếng Việt. Các bước, theo đúng thứ tự:
 *
 *   1. `.toLowerCase()` — hạ chữ thường (kể cả "Đ" → "đ").
 *   2. thay mọi "đ" bằng "d" — "đ" (U+0111) là MỘT CHỮ CÁI RIÊNG, Unicode NFD không tách nó
 *      thành "d" + dấu, nên phải thay tay trước khi NFD chạy.
 *   3. `.normalize('NFD')` rồi xoá mọi dấu kết hợp (combining marks, U+0300–U+036F) — bỏ dấu
 *      các nguyên âm còn lại (ví dụ "ề" → "e", "ữ" → "u").
 *   4. `.trim()` hai đầu.
 *
 * Ví dụ: "Đồ uống" → "do uong"; "Cà phê sữa đá" → "ca phe sua da".
 *
 * T011 PHẢI dùng lại NGUYÊN VĂN quy tắc này (xem task-005-report.md) — hai nơi tính
 * `name_normalized` khác nhau sẽ làm tra cứu/so khớp không nhất quán.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    // Escape Unicode tuong minh (U+0300 - U+036F), KHONG phai ky tu dau ket hop go truc tiep
    // trong ma nguon - ky tu go truc tiep vo hinh, de vo khi diff/mo lai bang editor khac/
    // doi encoding (fix round 1, review T005).
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  // Tính trước ở phạm vi `main` (không chỉ trong transaction) để bước ghi tệp ảnh ra đĩa —
  // SAU khi transaction database đã commit — dùng lại được đúng giá trị đã ghi vào cột
  // `product_image.path` (yêu cầu #2 của task-011c-brief.md), không tính lại hai lần.
  const imagePath = `${productImagePath}/ca-phe-sua-da.jpg`;

  try {
    await db.transaction(async (tx) => {
      // Khoá advisory PHẠM VI TRANSACTION (tự nhả khi transaction commit/rollback, không cần
      // unlock tay) — chặn nửa "chạy đồng thời" của finding review round 1: hai tiến trình
      // seed chạy song song đều có thể vượt qua SELECT tra-tồn-tại ở dưới TRƯỚC KHI cái nào
      // commit, sinh ra hai dòng category/product cùng `name_normalized` (không có UNIQUE
      // index đứng sau, xem comment đầu file). Khoá này serialize các lần chạy seed với
      // nhau — tiến trình thứ hai đợi tới khi tiến trình thứ nhất commit/rollback rồi mới
      // đọc, nên không còn cửa sổ đua. Khoá KHÔNG sửa được nửa "sửa `name_normalized` từ bên
      // ngoài rồi lookup miss" — nửa đó bị chặn (parked) theo ruling R16(b): cần UNIQUE index
      // (một migration, thuộc T004 đã đóng), không phải việc của seed script.
      // Khoá cố định 72500001 — không trùng với khoá advisory nào khác trong hệ thống (hiện
      // chưa có khoá advisory nào khác được dùng ở đâu trong repo này).
      await tx.execute(sql`SELECT pg_advisory_xact_lock(72500001)`);

      // --- category ---------------------------------------------------------------------
      const categoryName = 'Đồ uống';
      const categoryNameNormalized = normalizeName(categoryName);

      const existingCategory = await tx
        .select({ id: category.id })
        .from(category)
        .where(eq(category.nameNormalized, categoryNameNormalized))
        .limit(1);

      let categoryId: number;
      if (existingCategory.length > 0) {
        categoryId = existingCategory[0].id;
      } else {
        const inserted = await tx
          .insert(category)
          .values({ name: categoryName, nameNormalized: categoryNameNormalized })
          .returning({ id: category.id });
        categoryId = inserted[0].id;
      }

      // --- product ------------------------------------------------------------------------
      const productName = 'Cà phê sữa đá';
      const productNameNormalized = normalizeName(productName);

      const existingProduct = await tx
        .select({ id: product.id })
        .from(product)
        .where(eq(product.nameNormalized, productNameNormalized))
        .limit(1);

      let productId: number;
      if (existingProduct.length > 0) {
        productId = existingProduct[0].id;
      } else {
        const inserted = await tx
          .insert(product)
          .values({
            categoryId,
            name: productName,
            nameNormalized: productNameNormalized,
            description: 'Cà phê phin truyền thống pha cùng sữa đặc, phục vụ lạnh với đá viên.',
            price: 25000, // VND nguyên, đã gồm VAT — không numeric thập phân, không float.
          })
          .returning({ id: product.id });
        productId = inserted[0].id;
      }

      // --- product_image --------------------------------------------------------------------
      // Khoá tra-tồn-tại gồm cả PRODUCT_IMAGE_PATH đã resolve: giả định biến này ỔN ĐỊNH
      // giữa các lần chạy. Nếu giá trị đổi (ví dụ đổi named volume) giữa hai lần chạy, seed
      // sẽ chèn thêm một dòng `product_image` thứ hai thay vì nhận ra đó là cùng một ảnh
      // logic — chấp nhận theo review round 1, không đổi cấu trúc khoá.
      const existingImage = await tx
        .select({ id: productImage.id })
        .from(productImage)
        .where(and(eq(productImage.productId, productId), eq(productImage.path, imagePath)))
        .limit(1);

      if (existingImage.length === 0) {
        // Ảnh đại diện là bản ghi có `position` nhỏ nhất — 0 cho ảnh mẫu duy nhất này.
        await tx.insert(productImage).values({ productId, path: imagePath, position: 0 });
      }

      // --- stock -------------------------------------------------------------------------
      // PK = product_id → ON CONFLICT DO NOTHING là idempotent Ở TẦNG DATABASE.
      await tx
        .insert(stock)
        .values({ productId, quantity: 50, updatedAt: new Date().toISOString() })
        .onConflictDoNothing({ target: stock.productId });

      // KHÔNG insert vào sổ cái tồn kho ở đây — yêu cầu #5 của task-005-brief.md.
    });

    // --- tệp ảnh trên đĩa (Ruling R23, T011c) ---------------------------------------------
    // SAU khi transaction database đã commit — không phải một phần của nó, vì hệ tệp không
    // rollback theo Postgres. Copy tệp asset tĩnh đi kèm mã nguồn (`db/assets/`, không phải
    // dữ liệu người dùng) ra đúng đường dẫn đã ghi ở cột `product_image.path` phía trên
    // (AD-15: ảnh trên hệ tệp, không blob). Idempotent: `fs.copyFile` ghi đè tệp đích nếu đã
    // tồn tại, không lỗi, không tạo bản sao — an toàn cho lần chạy thứ hai/ba của `db:seed`.
    const sourceImagePath = path.join(seedDir, 'assets', 'ca-phe-sua-da.jpg');
    await fs.mkdir(path.dirname(imagePath), { recursive: true });
    await fs.copyFile(sourceImagePath, imagePath);

    console.log('db/seed.ts: đã nạp xong dữ liệu mẫu (idempotent, không đổi khi chạy lại).');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('db/seed.ts: lỗi khi nạp dữ liệu mẫu:', error);
  process.exit(1);
});
