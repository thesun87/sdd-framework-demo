import { z } from "zod";

/**
 * Tình trạng tồn kho hiển thị cho khách — đúng hai giá trị, chốt 2026-09-19
 * (docs/baseline/glossary.md, mục "Stock status"). Đây là con số tồn kho DUY NHẤT được
 * phép rời khỏi server; con số chính xác (Stock) không bao giờ đi qua HTTP (FR-007, AD-19).
 * KHÔNG thêm giá trị thứ ba, và KHÔNG thêm trường số lượng cạnh nó ở bất kỳ schema nào
 * trong package này.
 */
export const StockStatusSchema = z.enum(["in_stock", "out_of_stock"]);
export type StockStatus = z.infer<typeof StockStatusSchema>;

/** Giá bán — số nguyên VND đã gồm VAT. Từ chối số thập phân và số âm. */
const priceSchema = z.int().nonnegative();

/** Đường dẫn ảnh sản phẩm; `null` nếu sản phẩm chưa có ảnh nào. */
const imagePathSchema = z.string().min(1).nullable();

/**
 * Phần tử của `GET /api/products` (`items[]`). `.strict()` là hàng rào kỹ thuật cho ràng
 * buộc FR-007/AD-19: nếu ai đó vô tình thêm `quantity` (hay bất kỳ trường lạ nào) vào dữ
 * liệu trước khi serialise, schema từ chối thay vì âm thầm cho lọt qua.
 */
export const ProductSummarySchema = z
  .object({
    id: z.int().positive(),
    name: z.string().min(1),
    price: priceSchema,
    imagePath: imagePathSchema,
    stockStatus: StockStatusSchema,
  })
  .strict();

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/** Một ảnh của sản phẩm, kèm vị trí sắp xếp (0 = ảnh đại diện). */
export const ProductImageSchema = z
  .object({
    path: z.string().min(1),
    position: z.int().nonnegative(),
  })
  .strict();

export type ProductImage = z.infer<typeof ProductImageSchema>;

/** `GET /api/products/:id` — chi tiết một Sản phẩm. Cùng hàng rào `.strict()` như trên. */
export const ProductDetailSchema = z
  .object({
    id: z.int().positive(),
    name: z.string().min(1),
    description: z.string(),
    price: priceSchema,
    images: z.array(ProductImageSchema),
    stockStatus: StockStatusSchema,
  })
  .strict();

export type ProductDetail = z.infer<typeof ProductDetailSchema>;

/**
 * Response của `GET /api/products` — bọc trong `{ items }`, KHÔNG phải mảng trần
 * (contracts/storefront-http.md).
 */
export const ProductsListResponseSchema = z
  .object({
    items: z.array(ProductSummarySchema),
  })
  .strict();

export type ProductsListResponse = z.infer<typeof ProductsListResponseSchema>;
