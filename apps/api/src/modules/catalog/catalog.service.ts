// apps/api/src/modules/catalog/catalog.service.ts
//
// Quyết định nghiệp vụ của đường đọc `catalog`: ghép hình dạng response từ dữ liệu thô của
// `catalog.repository.ts` VÀ tình trạng tồn kho lấy qua lời gọi service CÔNG KHAI
// `stock.public.ts` (AD-5) — KHÔNG bao giờ `JOIN`/SELECT trực tiếp lên `stock`/`stock_ledger`
// ở đây hay ở bất kỳ đâu trong `apps/modules/catalog/**`.
//
// `this.pool` (một `pg.Pool`, xem `pg-pool.provider.ts`) được truyền thẳng làm tham số
// `unitOfWork` cho `getStockStatus` — khớp cấu trúc `StockUnitOfWork`
// (`Pick<PoolClient, 'query'>` của `stock.contract.ts`). Đây KHÔNG phải một request thứ hai
// tới database "hộ" stock — nó là đúng cách gọi một hàm công khai của module khác, chỉ đưa
// hộ nó phương tiện kết nối, không đưa hộ nó logic.
import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { storefront } from 'shared';

import { getStockStatus } from '../stock/stock.public';
import { findAllProductSummaries, findProductById, findProductImages } from './catalog.repository';
import { ENV, type AppEnv } from './env.provider';
import { PG_POOL } from './pg-pool.provider';

// Fix wave I-2 (final whole-branch review, R28) — không tự khai lại hình dạng response ở
// đây: dùng THẲNG kiểu suy ra (`z.infer`) từ schema `packages/shared` (AD-10), đúng cách
// `catalog.controller.ts` đã làm cho kiểu trả về HTTP. `ProductSummaryView`/`ProductDetailView`
// chính là `storefront.ProductSummary`/`storefront.ProductDetail` — không có trường nào khác
// biệt giữa hình dạng nội bộ của service và hình dạng HTTP ở `000`, nên không cần một kiểu
// trung gian riêng.
export type ProductSummaryView = storefront.ProductSummary;
export type ProductImageView = storefront.ProductImage;
export type ProductDetailView = storefront.ProductDetail;

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ENV) private readonly env: AppEnv,
  ) {}

  // T011b (Ruling R22): `product_image.path` (`catalog.repository.ts`) là đường dẫn TRÊN ĐĨA
  // (đúng AD-15 — không đổi ở đây, không đổi cột lưu trong database). Hợp đồng
  // (`contracts/storefront-http.md`) thể hiện `imagePath`/`images[].path` là URL
  // (`"/images/…"`) mà `ops/Caddyfile` (route `@images`, T011b) phục vụ tĩnh từ CHÍNH
  // `PRODUCT_IMAGE_PATH` này. Ánh xạ CHỈ ở tầng trình bày, đúng một chỗ, dùng cho cả hai hình
  // dạng response (list và detail) — không lặp lại logic.
  //
  // Giữ nguyên phần đường dẫn CÒN LẠI sau khi bỏ tiền tố `PRODUCT_IMAGE_PATH` (không chỉ lấy
  // `path.basename`) — một ảnh thật có thể nằm trong thư mục con của `PRODUCT_IMAGE_PATH` sau
  // này (task-011b-brief.md Requirement #3); lấy basename sẽ làm mất thông tin đó.
  //
  // Fix round 1 (review T011b) — `diskPath` không khớp tiền tố `PRODUCT_IMAGE_PATH` đã cấu
  // hình KHÔNG PHẢI lỗi live hôm nay (dữ liệu seed luôn khớp), nhưng nếu biến này đổi mà không
  // re-seed, hoặc một đường GHI tương lai chuẩn hoá `path` khác đi, fallback bên dưới
  // (`diskPath.replace(/^\/+/, '')`) vẫn trả về MỘT URL — chỉ là URL SAI (ví dụ lộ nguyên
  // `/images/data/product-images/x.jpg`), vỡ `<img>` một cách ÂM THẦM, không ai biết vì sao.
  // KHÔNG throw — một dòng `product_image` hỏng không được phép làm sập cả response danh
  // sách/chi tiết Sản phẩm (một sản phẩm ảnh lỗi không nên kéo theo cả trang). Thay vào đó,
  // log CẢNH BÁO có cấu trúc ra stdout — cùng quy ước với
  // `request-logging.middleware.ts`/`error-envelope.filter.ts` của module này (`level`, một
  // `msg` tiếng Việt, các trường liên quan, `timestamp` ISO) — để vận hành viên thấy điều kiện
  // bất thường này ngay, không phải suy luận ngược từ một `<img>` vỡ trên trình duyệt.
  private toImageUrl(diskPath: string): string {
    const root = this.env.PRODUCT_IMAGE_PATH.replace(/\/+$/, '');
    const prefix = `${root}/`;

    if (!diskPath.startsWith(prefix)) {
      // eslint-disable-next-line no-console -- log có cấu trúc ra stdout là chủ ý (cùng quy ước module).
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'product_image.path không khớp tiền tố PRODUCT_IMAGE_PATH đã cấu hình — ánh xạ URL ảnh có thể sai',
          diskPath,
          productImagePath: this.env.PRODUCT_IMAGE_PATH,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    const relative = diskPath.startsWith(prefix) ? diskPath.slice(prefix.length) : diskPath.replace(/^\/+/, '');
    return `/images/${relative}`;
  }

  private toImageUrlOrNull(diskPath: string | null): string | null {
    return diskPath === null ? null : this.toImageUrl(diskPath);
  }

  /** `GET /api/products` — con số tồn kho chính xác KHÔNG BAO GIỜ đi qua object này
   *  (FR-007/AD-19): chỉ `stockStatus` (`in_stock`/`out_of_stock`) suy từ `stock.public.ts`. */
  async listProducts(): Promise<ProductSummaryView[]> {
    const rows = await findAllProductSummaries(this.pool);
    return Promise.all(
      rows.map(async (row): Promise<ProductSummaryView> => ({
        id: row.id,
        name: row.name,
        price: row.price,
        imagePath: this.toImageUrlOrNull(row.imagePath),
        stockStatus: await getStockStatus(this.pool, row.id),
      })),
    );
  }

  /** `GET /api/products/:id` — `undefined` khi không có Sản phẩm nào khớp `productId`;
   *  controller suy ra HTTP 404 (FR-004), không phải lỗi ở tầng này. */
  async getProductDetail(productId: number): Promise<ProductDetailView | undefined> {
    const product = await findProductById(this.pool, productId);
    if (!product) {
      return undefined;
    }

    const [imageRows, stockStatus] = await Promise.all([
      findProductImages(this.pool, productId),
      getStockStatus(this.pool, productId),
    ]);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: imageRows.map((image) => ({
        path: this.toImageUrl(image.path),
        position: image.position,
      })),
      stockStatus,
    };
  }
}
