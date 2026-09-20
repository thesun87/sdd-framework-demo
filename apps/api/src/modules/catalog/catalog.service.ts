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

import { getStockStatus } from '../stock/stock.public';
import { findAllProductSummaries, findProductById, findProductImages } from './catalog.repository';
import { PG_POOL } from './pg-pool.provider';

export interface ProductSummaryView {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly imagePath: string | null;
  readonly stockStatus: 'in_stock' | 'out_of_stock';
}

export interface ProductImageView {
  readonly path: string;
  readonly position: number;
}

export interface ProductDetailView {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  // Mảng THƯỜNG (không `readonly`) — khớp đúng kiểu `images` mà `storefront.ProductDetail`
  // (suy từ `z.array(...)` của packages/shared) mô tả; `readonly T[]` không gán được cho
  // `T[]` (TS2322), dù nội dung bất biến về mặt thực thi (không ai `push`/`splice` vào đây).
  readonly images: ProductImageView[];
  readonly stockStatus: 'in_stock' | 'out_of_stock';
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** `GET /api/products` — con số tồn kho chính xác KHÔNG BAO GIỜ đi qua object này
   *  (FR-007/AD-19): chỉ `stockStatus` (`in_stock`/`out_of_stock`) suy từ `stock.public.ts`. */
  async listProducts(): Promise<ProductSummaryView[]> {
    const rows = await findAllProductSummaries(this.pool);
    return Promise.all(
      rows.map(async (row): Promise<ProductSummaryView> => ({
        id: row.id,
        name: row.name,
        price: row.price,
        imagePath: row.imagePath,
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

    const [images, stockStatus] = await Promise.all([
      findProductImages(this.pool, productId),
      getStockStatus(this.pool, productId),
    ]);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images,
      stockStatus,
    };
  }
}
