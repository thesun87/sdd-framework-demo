// apps/api/src/modules/catalog/categories.controller.ts
//
// Endpoint `GET /api/categories` cho sidebar danh mục phẳng (contracts/storefront-http.md §GET /api/categories).
//
// Kiểu trả về dùng THẲNG type suy ra từ schema `packages/shared` (AD-10).
import { Controller, Get, Header } from '@nestjs/common';
import { storefront } from 'shared';

import { CatalogService } from './catalog.service';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  // `Cache-Control: no-store` bắt buộc (AD-20)
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(): Promise<storefront.CategoriesListResponse> {
    const response = await this.catalogService.listCategories();
    // Kích hoạt hàng rào `.strict()` của AD-10 ở tầng sản xuất
    return storefront.CategoriesListResponseSchema.parse(response);
  }
}
