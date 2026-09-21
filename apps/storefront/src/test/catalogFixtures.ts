// apps/storefront/src/test/catalogFixtures.ts
//
// Test fixture factories cho storefront catalog browse/detail tests (T003).

export interface CategorySummaryFixture {
  id: number;
  name: string;
  productCount: number;
}

export interface PaginationFixture {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductSummaryFixture {
  id: number;
  name: string;
  price: number;
  imagePath: string | null;
  stockStatus: 'in_stock' | 'out_of_stock';
}

export interface ProductDetailFixture {
  id: number;
  name: string;
  description: string;
  price: number;
  images: Array<{ path: string; position: number }>;
  stockStatus: 'in_stock' | 'out_of_stock';
}

export interface ProductsListResponseFixture {
  items: ProductSummaryFixture[];
  pagination: PaginationFixture;
}

export function createProductSummaryFixture(
  overrides: Partial<ProductSummaryFixture> = {},
): ProductSummaryFixture {
  return {
    id: 1,
    name: 'Sản phẩm mẫu',
    price: 100000,
    imagePath: '/images/product-1.jpg',
    stockStatus: 'in_stock',
    ...overrides,
  };
}

export function createCategorySummaryFixture(
  overrides: Partial<CategorySummaryFixture> = {},
): CategorySummaryFixture {
  return {
    id: 1,
    name: 'Danh mục mẫu',
    productCount: 10,
    ...overrides,
  };
}

export function createPaginationFixture(
  overrides: Partial<PaginationFixture> = {},
): PaginationFixture {
  return {
    page: 1,
    pageSize: 24,
    totalItems: 48,
    totalPages: 2,
    ...overrides,
  };
}

export function createProductsListResponseFixture(
  overrides: Partial<ProductsListResponseFixture> = {},
): ProductsListResponseFixture {
  return {
    items: [createProductSummaryFixture()],
    pagination: createPaginationFixture(),
    ...overrides,
  };
}

export function createProductDetailFixture(
  overrides: Partial<ProductDetailFixture> = {},
): ProductDetailFixture {
  return {
    id: 1,
    name: 'Chi tiết sản phẩm mẫu',
    description: 'Mô tả chi tiết sản phẩm mẫu chất lượng cao.',
    price: 150000,
    images: [{ path: '/images/product-1.jpg', position: 0 }],
    stockStatus: 'in_stock',
    ...overrides,
  };
}
