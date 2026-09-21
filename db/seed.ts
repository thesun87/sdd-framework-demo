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
import { storefront } from 'shared';

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
  return storefront.normalizeProductName(name);
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

      // --- categories ------------------------------------------------------------------
      // Ba danh mục: Đồ uống (có sản phẩm), Đồ gia dụng (>24 sản phẩm), Thời trang (0 sản phẩm)
      const categoriesData = [
        { name: 'Đồ uống' },
        { name: 'Đồ gia dụng' },
        { name: 'Thời trang' },
      ];

      const categoryMap = new Map<string, number>();

      for (const cat of categoriesData) {
        const catNormalized = normalizeName(cat.name);
        const existing = await tx
          .select({ id: category.id })
          .from(category)
          .where(eq(category.nameNormalized, catNormalized))
          .limit(1);

        if (existing.length > 0) {
          categoryMap.set(cat.name, existing[0].id);
        } else {
          const inserted = await tx
            .insert(category)
            .values({ name: cat.name, nameNormalized: catNormalized })
            .returning({ id: category.id });
          categoryMap.set(cat.name, inserted[0].id);
        }
      }

      const doUongId = categoryMap.get('Đồ uống')!;
      const doGiaDungId = categoryMap.get('Đồ gia dụng')!;

      // --- products helper ---------------------------------------------------------------
      interface SeedProductItem {
        name: string;
        categoryId: number | null;
        description: string;
        price: number;
        stockQuantity: number;
        hasImage: boolean;
      }

      const productsToSeed: SeedProductItem[] = [
        // 1. Sản phẩm gốc thuộc Đồ uống
        {
          name: 'Cà phê sữa đá',
          categoryId: doUongId,
          description: 'Cà phê phin truyền thống pha cùng sữa đặc, phục vụ lạnh với đá viên.',
          price: 25000,
          stockQuantity: 50,
          hasImage: true,
        },
        // 2. Sản phẩm không có Category (category_id = null)
        {
          name: 'Sổ tay ghi chép',
          categoryId: null,
          description: 'Sổ tay bìa cứng 200 trang phục vụ ghi chép công việc hàng ngày.',
          price: 45000,
          stockQuantity: 20,
          hasImage: false,
        },
        // 3. Sản phẩm tiếng Việt có dấu "Bình giữ nhiệt" thuộc Đồ gia dụng
        {
          name: 'Bình giữ nhiệt',
          categoryId: doGiaDungId,
          description: 'Bình giữ nhiệt inox 304 dung tích 500ml, giữ nhiệt nóng lạnh 12 giờ.',
          price: 189000,
          stockQuantity: 35,
          hasImage: true,
        },
        // 4. Sản phẩm hết hàng (stock = 0)
        {
          name: 'Bình giữ nhiệt Mini 350ml',
          categoryId: doGiaDungId,
          description: 'Bình giữ nhiệt nhỏ gọn tiện lợi mang theo khi đi làm hoặc du lịch.',
          price: 129000,
          stockQuantity: 0,
          hasImage: true,
        },
      ];

      // Thêm 24 sản phẩm khác vào Đồ gia dụng để Đồ gia dụng có tổng cộng 26 sản phẩm (> 24)
      for (let i = 1; i <= 24; i++) {
        productsToSeed.push({
          name: `Dụng cụ nhà bếp tiện ích #${i}`,
          categoryId: doGiaDungId,
          description: `Bộ dụng cụ làm bếp đa năng món số ${i}, thép không gỉ.`,
          price: 50000 + i * 5000,
          stockQuantity: 15,
          hasImage: false,
        });
      }

      for (const item of productsToSeed) {
        const prodNormalized = normalizeName(item.name);
        const existingProd = await tx
          .select({ id: product.id })
          .from(product)
          .where(eq(product.nameNormalized, prodNormalized))
          .limit(1);

        let pId: number;
        if (existingProd.length > 0) {
          pId = existingProd[0].id;
        } else {
          const inserted = await tx
            .insert(product)
            .values({
              categoryId: item.categoryId,
              name: item.name,
              nameNormalized: prodNormalized,
              description: item.description,
              price: item.price,
            })
            .returning({ id: product.id });
          pId = inserted[0].id;
        }

        if (item.hasImage) {
          const existingImg = await tx
            .select({ id: productImage.id })
            .from(productImage)
            .where(and(eq(productImage.productId, pId), eq(productImage.path, imagePath)))
            .limit(1);

          if (existingImg.length === 0) {
            await tx.insert(productImage).values({ productId: pId, path: imagePath, position: 0 });
          }
        }

        // --- stock ---
        await tx
          .insert(stock)
          .values({ productId: pId, quantity: item.stockQuantity, updatedAt: new Date().toISOString() })
          .onConflictDoNothing({ target: stock.productId });
      }
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
