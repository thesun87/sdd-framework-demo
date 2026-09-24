import { z } from "zod";

/**
 * Dòng sản phẩm trong giỏ hàng (CartLine) — sống ở trình duyệt.
 * Không mang giá, tên, ảnh, trạng thái tồn kho (AD-17, FR-001, FR-020).
 * Trần 9 999 là giới hạn kỹ thuật (R3).
 */
export const CartLineSchema = z
  .object({
    productId: z.int().positive("productId phải là số nguyên > 0"),
    quantity: z
      .int("quantity phải là số nguyên")
      .min(1, "quantity tối thiểu là 1")
      .max(9999, "quantity tối đa là 9999"),
  })
  .strict();

export type CartLine = z.infer<typeof CartLineSchema>;

/**
 * Trạng thái dòng giỏ hàng dạng enum — riêng biệt, KHÔNG mở rộng StockStatusSchema (D1, R1).
 */
export const CartLineStatusSchema = z.enum([
  "ok",
  "exceeds_stock",
  "out_of_stock",
  "not_found",
]);

export type CartLineStatus = z.infer<typeof CartLineStatusSchema>;

/**
 * Item trong request POST /api/cart-lines/status.
 * Unknown fields bị strip (bỏ qua, ví dụ price gửi lên sẽ bị drop, không từ chối).
 */
const CartLineRequestItemSchema = z
  .object({
    productId: z.int().positive("productId phải là số nguyên > 0"),
    quantity: z
      .int("quantity phải là số nguyên")
      .min(1, "quantity tối thiểu là 1")
      .max(9999, "quantity tối đa là 9999"),
  })
  .strip();

export const CartLinesStatusRequestSchema = z
  .object({
    lines: z
      .array(CartLineRequestItemSchema)
      .max(100, "Tối đa 100 dòng cho mỗi yêu cầu"),
  })
  .strip()
  .superRefine((data, ctx) => {
    const seen = new Set<number>();
    for (let i = 0; i < data.lines.length; i++) {
      const pid = data.lines[i].productId;
      if (seen.has(pid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `productId trùng lặp: ${pid}`,
          path: ["lines", i, "productId"],
        });
      }
      seen.add(pid);
    }
  });

export type CartLinesStatusRequest = z.infer<typeof CartLinesStatusRequestSchema>;

/**
 * Thông tin sản phẩm đi kèm trong response kiểm tra dòng giỏ.
 * Không mang số lượng tồn kho (AD-19).
 */
export const CartLineProductSchema = z
  .object({
    name: z.string().min(1),
    price: z.int().nonnegative(),
    imagePath: z.string().min(1).nullable(),
  })
  .strict();

export type CartLineProduct = z.infer<typeof CartLineProductSchema>;

/**
 * Một dòng trong response POST /api/cart-lines/status.
 * product là null khi và chỉ khi lineStatus = "not_found".
 * .strict() ở mọi cấp đảm bảo không có trường số tồn kho nào lọt ra ngoài (AD-19).
 */
export const CartLineStatusResponseItemSchema = z
  .object({
    productId: z.int().positive(),
    lineStatus: CartLineStatusSchema,
    product: CartLineProductSchema.nullable(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.lineStatus === "not_found" && item.product !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "product phải là null khi lineStatus là not_found",
        path: ["product"],
      });
    }
    if (item.lineStatus !== "not_found" && item.product === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "product không được null khi lineStatus khác not_found",
        path: ["product"],
      });
    }
  });

export type CartLineStatusResponseItem = z.infer<
  typeof CartLineStatusResponseItemSchema
>;

export const CartLinesStatusResponseSchema = z
  .object({
    lines: z.array(CartLineStatusResponseItemSchema),
  })
  .strict();

export type CartLinesStatusResponse = z.infer<
  typeof CartLinesStatusResponseSchema
>;

/**
 * Dữ liệu lưu trong localStorage (shop_cart).
 * .strict() ngăn chặn việc ghi trường lạ vào storage (FR-020).
 */
export const StoredCartSchema = z
  .object({
    v: z.literal(1),
    lines: z.array(CartLineSchema),
  })
  .strict();

export type StoredCart = z.infer<typeof StoredCartSchema>;
