// apps/api/src/modules/catalog/catalog.controller.ts
//
// `GET /api/products`, `GET /api/products/:id` (contracts/storefront-http.md). Tiền tố
// `/api` nằm NGAY TRONG path của `@Controller` — bắt buộc theo hợp đồng bootstrap của T010
// (`catalog-test-support.ts`: `createTestApp()` không gọi `app.setGlobalPrefix(...)`, nên
// tiền tố chỉ có tác dụng nếu khai ở đây, không phải ở `main.ts`).
//
// Kiểu trả về dùng THẲNG type suy ra từ schema `packages/shared` (AD-10) — không khai lại
// interface cho hình dạng HTTP.
import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { storefront } from 'shared';

import { parseProductListQuery } from './catalog-query';
import { CatalogService } from './catalog.service';
import { ProductNotFoundException } from './product-not-found.exception';

@Controller('api/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // `Cache-Control: no-store` bắt buộc (AD-20) — response này chứa `stockStatus`, không tầng
  // nào được phép cache nó.
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Query() query: Record<string, unknown>): Promise<storefront.ProductsListResponse> {
    const parsedQuery = parseProductListQuery(query);
    const response = await this.catalogService.listProducts(parsedQuery);
    // Fix wave I-2 (final whole-branch review, R28) — chạy response THẬT qua `.parse()` của
    // schema `packages/shared` trước khi trả ra khỏi controller. Đây là điểm DUY NHẤT response
    // rời server, nên là đúng nơi kích hoạt hàng rào `.strict()` (AD-10) Ở TẦNG SẢN XUẤT, không
    // chỉ trong test: nếu một trường lạ (ví dụ `quantity`, FR-007/AD-19) lỡ lọt vào object này,
    // `.parse()` ném lỗi thay vì âm thầm serialise nó ra HTTP.
    return storefront.ProductsListResponseSchema.parse(response);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async detail(@Param('id') idParam: string): Promise<storefront.ProductDetail> {
    const productId = Number(idParam);
    if (!Number.isInteger(productId) || productId <= 0) {
      // `:id` không phải một số nguyên dương hợp lệ — tài nguyên định danh bằng số nguyên
      // (bigint nội bộ), một id không đúng dạng đó "không tồn tại" theo đúng nghĩa FR-004,
      // không phải một lỗi 400 riêng biệt cần một mã lỗi khác.
      throw new ProductNotFoundException();
    }

    const detail = await this.catalogService.getProductDetail(productId);
    if (!detail) {
      throw new ProductNotFoundException();
    }

    // Cùng lý do như `list()` ở trên — kích hoạt hàng rào `.strict()` của AD-10 ở tầng sản
    // xuất cho response chi tiết.
    return storefront.ProductDetailSchema.parse(detail);
  }
}
