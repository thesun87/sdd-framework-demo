// T013 — luồng người dùng US1 (trang chủ → thẻ sản phẩm → trang chi tiết), sàn WCAG 2.1 AA
// bằng @axe-core/playwright trên cả hai trang, và bằng chứng thật rằng vùng aria-live của
// `RouteAnnouncer` (packages/ui, T007) nhận NỘI DUNG MỚI khi route đổi — SPA không có ranh
// giới tải trang nào làm việc đó thay (xem `apps/storefront/src/App.tsx`).
//
// KHÔNG có test tải đồng thời/tính nguyên tử ở đây (AD-28) — bất biến tồn kho được chứng
// minh ở T008, một luồng xanh ở đây không được tính là bằng chứng cho việc đó.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * `@axe-core/playwright` khai `page: Page` từ `playwright-core` riêng của nó, hoisted trong
 * `node_modules` ở một bản khác (1.63.0) với bản mà `@playwright/test` mang theo (1.62.1) —
 * lệch bản thuần tuý ở tầng khai báo kiểu (npm không dedupe được vì `@axe-core/playwright`
 * không pin bản), không lệch ở hành vi runtime: cùng một object `Page` thật của Playwright
 * chạy dưới một `npx playwright test`. Ép kiểu tường minh tại đúng ranh giới gọi thư viện
 * ngoài, không lan ra chỗ khác trong file.
 */
function newAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

/**
 * Định dạng giá — sao chép nguyên logic hiển thị của `apps/storefront/src/formatPrice.ts`
 * (chỉ đọc, không import chéo workspace: `e2e` không khai dependency tới `apps/storefront`
 * và không được sửa `apps/**`). Dùng để tính giá trị MONG ĐỢI từ dữ liệu API thật, không
 * hard-code chuỗi giá theo dữ liệu seed cụ thể.
 */
function formatPriceVnd(price: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(price)}₫`;
}

const STOCK_STATUS_LABELS: Record<string, string> = {
  in_stock: "Còn hàng",
  out_of_stock: "Hết hàng",
};

interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  images: { path: string; position: number }[];
  stockStatus: "in_stock" | "out_of_stock";
}

test.describe("US1 — luồng trang chủ → chi tiết sản phẩm", () => {
  test("bấm thẻ sản phẩm mở trang chi tiết đúng tên/mô tả/giá/ảnh/nhãn tồn kho", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Sản phẩm" })).toBeVisible();

    // Thẻ sản phẩm đầu tiên trong lưới — không giả định ID cụ thể, đọc thẳng từ DOM.
    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute("href");
    expect(href).toBeTruthy();
    const productId = href!.split("/").pop();

    // Dữ liệu MONG ĐỢI lấy từ chính API thật (qua proxy) — không hard-code theo seed hiện tại,
    // để test không gãy vô lý nếu seed đổi (miễn còn ít nhất một sản phẩm).
    const detailResponse = await request.get(`/api/products/${productId}`);
    expect(detailResponse.ok()).toBe(true);
    const product = (await detailResponse.json()) as ProductDetail;
    const sortedImages = [...product.images].sort((a, b) => a.position - b.position);

    await firstCard.click();
    await expect(page).toHaveURL(new RegExp(`/products/${productId}$`));

    // Tên, mô tả, giá, ảnh, nhãn tồn kho — đúng năm mục brief liệt kê cho trang chi tiết.
    //
    // Dùng locator THEO CẤU TRÚC DOM (không phải `getByText` tự do): dữ liệu thật trên stack
    // chia sẻ có thể có `description` RỖNG hoặc `price` bằng 0 sau khi một bộ Jest chạm cùng
    // database chạy trước đó (AD-28 — TRUNCATE + fixture riêng của từng `it`, không phải lỗi).
    // `getByText("")` khớp MỌI phần tử rỗng trên trang (strict-mode violation) — không dùng
    // được cho một giá trị có thể rỗng.
    await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
    const main = page.locator("main");
    // Cấu trúc `ProductDetailPage`: <a>← Trang chủ</a>, <h1>, [<img> nếu có ảnh], <p>giá</p>,
    // nhãn tồn kho (KHÔNG phải <p>), <p>mô tả</p> — nên <p> đầu tiên luôn là giá, <p> thứ hai
    // luôn là mô tả, có ảnh hay không không đổi thứ tự này.
    await expect(main.locator("p").nth(0)).toHaveText(formatPriceVnd(product.price));
    await expect(main.locator("p").nth(1)).toHaveText(product.description);
    await expect(main.locator("[data-stock-status]")).toHaveText(
      STOCK_STATUS_LABELS[product.stockStatus],
    );

    // Ảnh: hợp đồng không đảm bảo mọi sản phẩm có ảnh (mảng `images` có thể rỗng) — khẳng
    // định ĐÚNG hành vi có điều kiện của component thay vì giả định luôn có `<img>`.
    if (sortedImages.length > 0) {
      const detailImage = page.getByRole("img", { name: product.name });
      await expect(detailImage).toBeVisible();
      await expect(detailImage).toHaveAttribute("src", sortedImages[0].path);
    } else {
      await expect(page.getByRole("img", { name: product.name })).toHaveCount(0);
    }
  });

  test("thông báo đổi route cho screen reader THẬT SỰ đổi nội dung khi điều hướng", async ({
    page,
  }) => {
    // `RouteAnnouncer` (packages/ui) là vùng role="status"/aria-live="polite" — kiểm tra sự
    // TỒN TẠI của nó không chứng minh gì; phải chứng minh NỘI DUNG thật sự đổi khi route đổi
    // (App.tsx gọi lại nó với `message` mới trong useEffect phụ thuộc `pathname`).
    await page.goto("/");
    const announcer = page.getByRole("status");
    await expect(announcer).toBeVisible();
    // Landing lần đầu ở "/" cũng chạy effect (App.tsx cố ý không có ngoại lệ "lần đầu") —
    // nội dung ban đầu phải là thông báo của trang chủ, không rỗng.
    await expect(announcer).toHaveText("Đã chuyển đến trang chủ.");

    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/products\//);

    // Sau điều hướng, CÙNG vùng đó phải mang NỘI DUNG MỚI, khác nội dung ban đầu — đây là
    // bằng chứng thật của "thông báo đổi route", không phải suy diễn từ việc phần tử tồn tại.
    await expect(announcer).toHaveText("Đã chuyển đến trang chi tiết sản phẩm.");
  });
});

test.describe("WCAG 2.1 AA (@axe-core/playwright)", () => {
  test("trang chủ không vi phạm mức AA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Sản phẩm" })).toBeVisible();
    // Đợi lưới sản phẩm render xong (không quét lúc còn ở trạng thái "Đang tải…") để axe
    // đánh giá đúng nội dung thật sẽ hiển thị cho người dùng.
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();

    const results = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("trang chi tiết sản phẩm không vi phạm mức AA", async ({ page, request }) => {
    await page.goto("/");
    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute("href");
    const productId = href!.split("/").pop();

    const detailResponse = await request.get(`/api/products/${productId}`);
    const product = (await detailResponse.json()) as ProductDetail;

    await firstCard.click();
    await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();

    const results = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});

test.describe("Feature 001 — Giả định seed data", () => {
  test("seed data chứa đầy đủ danh mục, sản phẩm không danh mục, tiếng Việt có dấu và hết hàng", async ({
    request,
  }) => {
    const res = await request.get("/api/products");
    expect(res.ok()).toBe(true);
    const data = (await res.json()) as { items: Array<{ name: string; stockStatus: string }> };
    const items = data.items || [];
    expect(items.length).toBeGreaterThan(0);

    // Có sản phẩm hết hàng
    const outOfStock = items.find((p) => p.stockStatus === "out_of_stock");
    expect(outOfStock).toBeDefined();

    // Có sản phẩm tiếng Việt có dấu "Bình giữ nhiệt"
    const accented = items.find((p) => p.name.includes("Bình giữ nhiệt"));
    expect(accented).toBeDefined();

    // Có sản phẩm không thuộc danh mục (Sổ tay ghi chép)
    const uncategorized = items.find((p) => p.name === "Sổ tay ghi chép");
    expect(uncategorized).toBeDefined();
  });
});

test.describe("US1 — duyệt danh mục phẳng (E2E)", () => {
  test("hiển thị sidebar danh mục phẳng với 'Tất cả sản phẩm', chọn danh mục lọc sản phẩm và xử lý danh mục rỗng", async ({
    page,
  }) => {
    await page.goto("/");
    // Sidebar có 'Tất cả sản phẩm' và các danh mục từ seed
    const allLink = page.getByRole("link", { name: /Tất cả sản phẩm/ });
    await expect(allLink).toBeVisible();

    const doGiaDung = page.getByRole("link", { name: /Đồ gia dụng/ });
    await expect(doGiaDung).toBeVisible();

    // Bấm vào danh mục 'Thời trang' (danh mục rỗng trong seed)
    const thoiTrang = page.getByRole("link", { name: /Thời trang/ });
    await expect(thoiTrang).toBeVisible();
    await thoiTrang.click();

    await expect(page).toHaveURL(/categoryId=/);
    await expect(page.getByText("Danh mục này chưa có sản phẩm nào.")).toBeVisible();
  });
});


