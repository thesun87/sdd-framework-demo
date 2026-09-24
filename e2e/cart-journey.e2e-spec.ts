import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function newAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

test.describe("E2E Cart Journey (T010, T014)", () => {
  // Helper kiểm tra localStorage.shop_cart:
  // Chỉ chứa v, productId, quantity; KHÔNG chứa email hay token (FR-020)
  const assertStorageClean = async (page: Page) => {
    const raw = await page.evaluate(() => localStorage.getItem("shop_cart"));
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveProperty("v", 1);
    expect(Array.isArray(parsed.lines)).toBe(true);
    for (const line of parsed.lines) {
      expect(Object.keys(line).sort()).toEqual(["productId", "quantity"].sort());
    }
    expect(raw).not.toContain("token");
    expect(raw).not.toContain("email");
    return parsed;
  };

  test("Giỏ hàng sống sót qua reload, đăng ký, đăng xuất, đăng nhập và đăng nhập thất bại (US4)", async ({
    page,
  }) => {
    // 1. (a) Guest vào trang chủ, chọn sản phẩm A (Cà phê sữa đá)
    await page.goto("/");
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cà phê sữa đá" })).toBeVisible();

    // Thêm A 2 lần
    const addBtn = page.getByRole("button", { name: "Thêm vào giỏ hàng" });
    await addBtn.click();
    await expect(page.getByText("Đã thêm vào giỏ hàng.")).toBeVisible();
    await addBtn.click();

    // Biểu tượng giỏ trên header hiển thị 2
    const cartLink = page.getByRole("link", { name: /Giỏ hàng/ });
    await expect(cartLink).toContainText("2");

    // Chọn sản phẩm B (Sổ tay ghi chép)
    await page.goto("/");
    await page.getByRole("link", { name: "Sổ tay ghi chép" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sổ tay ghi chép" })).toBeVisible();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await expect(cartLink).toContainText("3");

    // Kiểm tra localStorage sau bước (a)
    const cartAfterAdd = await assertStorageClean(page);
    expect(cartAfterAdd.lines.length).toBe(2);

    // Mở trang giỏ hàng và reload
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1, name: "Giỏ hàng" })).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();

    // Reload lại trang
    await page.reload();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await assertStorageClean(page);

    // 2. (b) Đăng ký tài khoản Customer mới: Giỏ hàng không đổi (US4-1)
    const uniqueEmail = `cust-${Date.now()}@example.com`;
    const password = "MatKhau123!";

    await page.goto("/register");
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();

    // Sau khi đăng ký thành công về trang chủ
    await expect(page).toHaveURL("/");
    await expect(page.getByText(uniqueEmail)).toBeVisible();
    // Biểu tượng giỏ vẫn giữ nguyên 3 sản phẩm
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("3");

    // Mở /cart kiểm tra giỏ hàng
    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await assertStorageClean(page);

    // 3. (c) Đăng xuất: Giỏ hàng không đổi (US4-3)
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("3");

    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await assertStorageClean(page);

    // 4. (d) Đăng nhập: Giỏ hàng không đổi (US4-2)
    await page.goto("/login");
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(uniqueEmail)).toBeVisible();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("3");

    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await assertStorageClean(page);

    // 5. (e) Đăng xuất rồi thử đăng nhập thất bại -> quay lại /cart: Giỏ hàng không đổi (US4-4)
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();

    await page.goto("/login");
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill("MatKhauSaiRoi!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    // Báo lỗi đăng nhập
    await expect(page.getByText("Email hoặc mật khẩu không chính xác.")).toBeVisible();

    // Quay lại /cart
    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("3");
    await assertStorageClean(page);
  });

  test("UJ-1: Guest thêm vào giỏ -> Đặt đơn -> gặp Tường đăng ký -> Đăng ký -> trang Đặt đơn với giỏ nguyên vẹn (US5-1, US5-2)", async ({
    page,
  }) => {
    // Bắt đầu với tư cách Guest
    await page.goto("/");
    // Xoá cookie hoặc đăng xuất nếu có
    const logoutBtn = page.getByRole("button", { name: "Đăng xuất" });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }

    // Chọn sản phẩm Cà phê sữa đá
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await expect(page.getByText("Đã thêm vào giỏ hàng.")).toBeVisible();

    // Vào /cart
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1, name: "Giỏ hàng" })).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    // Bấm Đặt đơn
    const placeOrderBtn = page.getByRole("link", { name: "Đặt đơn" });
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    // Chuyển tới /place-order và thấy Tường đăng ký (US5-1)
    await expect(page).toHaveURL("/place-order");
    await expect(
      page.getByText("Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên."),
    ).toBeVisible();

    // Bấm Đăng ký từ tường đăng ký
    await page.locator("main").getByRole("link", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL("/register?returnTo=/place-order");

    // Đăng ký tài khoản mới
    const email = `uj1-${Date.now()}@example.com`;
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("MatKhau123!");
    await page.getByRole("button", { name: "Đăng ký" }).click();

    // Tự động điều hướng về lại /place-order (US5-2)
    await expect(page).toHaveURL("/place-order");
    await expect(page.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeVisible();
    await expect(page.getByText("Chức năng đặt đơn chưa sẵn sàng.")).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await assertStorageClean(page);
  });

  test("US5-3, US5-4, US5-5: Đăng nhập từ Tường đăng ký, Customer vào thẳng Đặt đơn, Guest mở trực tiếp gặp tường", async ({
    page,
  }) => {
    // Tạo sẵn một tài khoản Customer
    const email = `cust-flow-${Date.now()}@example.com`;
    const password = "MatKhau123!";
    await page.goto("/register");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL("/");

    // Đăng xuất để thành Guest
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();

    // Thêm sản phẩm vào giỏ
    await page.goto("/");
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();

    // US5-5: Guest mở trực tiếp /place-order thấy Tường đăng ký
    await page.goto("/place-order");
    await expect(
      page.getByText("Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên."),
    ).toBeVisible();

    // US5-3: Bấm Đăng nhập từ tường đăng ký
    await page.locator("main").getByRole("link", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL("/login?returnTo=/place-order");

    // Cross-link kiểm tra mang returnTo
    const regLink = page.locator(".auth-footer").getByRole("link", { name: "Đăng ký" });
    await expect(regLink).toHaveAttribute("href", "/register?returnTo=/place-order");

    // Nhập thông tin đăng nhập
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    // Điều hướng về /place-order, thấy trang Đặt đơn với giỏ nguyên vẹn
    await expect(page).toHaveURL("/place-order");
    await expect(page.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeVisible();
    await expect(page.getByText("Chức năng đặt đơn chưa sẵn sàng.")).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    // US5-4: Customer đã đăng nhập bấm Đặt đơn từ /cart vào thẳng trang Đặt đơn
    await page.goto("/cart");
    await page.getByRole("link", { name: "Đặt đơn" }).click();
    await expect(page).toHaveURL("/place-order");
    await expect(
      page.getByText("Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên."),
    ).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeVisible();
  });

  test("Security (US5-6): returnTo ngoài origin bị loại bỏ và chuyển hướng về trang chủ", async ({
    page,
  }) => {
    const email = `sec-${Date.now()}@example.com`;
    const password = "MatKhau123!";

    // Đăng ký tài khoản
    await page.goto("/register");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: "Đăng xuất" }).click();

    // Thử login với //evil.com
    await page.goto("/login?returnTo=//evil.com");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    // Phải về "/" trên cùng origin, không sang evil.com
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Đăng xuất" }).click();

    // Thử register với https://evil.com
    const email2 = `sec2-${Date.now()}@example.com`;
    await page.goto("/register?returnTo=https://evil.com");
    await page.locator("#email").fill(email2);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page).toHaveURL("/");
  });

  test("Flags & Tồn kho (US1-3, US3-1, US3-3, SC-005): Hết hàng disabled, vượt quá tồn kho gắn cờ, không lộ số tồn", async ({
    page,
  }) => {
    // 1. Sản phẩm hết hàng từ seed: 'Bình giữ nhiệt Mini 350ml'
    await page.goto("/");
    await page.getByRole("link", { name: "Bình giữ nhiệt Mini 350ml" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bình giữ nhiệt Mini 350ml" })).toBeVisible();

    const addBtn = page.getByRole("button", { name: "Thêm vào giỏ hàng" });
    await expect(addBtn).toBeDisabled();
    await expect(page.getByText("Sản phẩm này đang hết hàng.")).toBeVisible();

    // 2. Sản phẩm còn hàng: 'Cà phê sữa đá'
    await page.goto("/");
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();

    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    // Đặt số lượng 9999
    const qtyInput = page.getByRole("spinbutton");
    await qtyInput.fill("9999");
    await qtyInput.press("Enter");

    // Cờ vượt quá tồn kho xuất hiện
    await expect(
      page.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
    ).toBeVisible();

    // Nút Đặt đơn bị vô hiệu hoá và hiện lý do
    const placeOrderBtn = page.getByRole("button", { name: "Đặt đơn" });
    await expect(placeOrderBtn).toBeDisabled();
    await expect(page.getByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeVisible();

    // SC-005: Kiểm tra toàn bộ text trên trang không chứa số lượng tồn kho bí mật
    // Bắt phản hồi API /api/cart-lines/status
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/cart-lines/status")),
      page.reload(),
    ]);

    const resJson = await response.json();
    const bodyStr = JSON.stringify(resJson);
    expect(bodyStr).not.toContain("availableQuantity");
    expect(bodyStr).not.toContain("stockQuantity");
    expect(bodyStr).not.toContain("quantity\":"); // Response không được chứa trường quantity của stock
  });

  test("Đồng bộ giỏ hàng đa tab (FR-021)", async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/");
    // Dọn sạch giỏ
    await page1.evaluate(() => localStorage.removeItem("shop_cart"));

    // Thêm sản phẩm trên page1
    await page1.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page1.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();

    // Mở /cart trên cả 2 tab
    await page1.goto("/cart");
    await page2.goto("/cart");

    await expect(page1.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page2.getByText("Cà phê sữa đá")).toBeVisible();

    // Bấm tăng số lượng trên page1
    const incBtn = page1.getByRole("button", { name: /Tăng số lượng/ });
    await incBtn.click();

    // Tab 2 tự động cập nhật số lượng thành 2 mà không cần reload
    const qtyInput2 = page2.getByRole("spinbutton");
    await expect(qtyInput2).toHaveValue("2");

    // Xoá sản phẩm trên tab 1
    await page1.getByRole("button", { name: "Xoá" }).click();
    await expect(page1.getByText("Giỏ hàng của bạn đang trống.")).toBeVisible();

    // Tab 2 tự động chuyển về giỏ rỗng mà không cần reload
    await expect(page2.getByText("Giỏ hàng của bạn đang trống.")).toBeVisible();

    await page1.close();
    await page2.close();
  });

  test("Shop owner (US6-1, US6-2, US6-3, FR-018): không có giỏ hàng, từ chối ở /cart và /place-order, bảo toàn giỏ cũ", async ({
    page,
  }) => {
    // 1. Guest thêm Cà phê sữa đá vào giỏ
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("shop_cart"));
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("1");

    // 2. Đăng nhập quyền Shop owner (seeded: owner@example.com / ShopOwner123!)
    await page.goto("/login");
    await page.locator("#email").fill("owner@example.com");
    await page.locator("#password").fill("ShopOwner123!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL("/");

    // US6-2: Header không có biểu tượng giỏ hàng
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toHaveCount(0);

    // US6-1: Trang chi tiết không có nút Thêm vào giỏ
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng" })).toHaveCount(0);

    // US6-3: Mở trực tiếp /place-order
    await page.goto("/place-order");
    await expect(page.getByText("Tài khoản chủ shop không đặt đơn được.")).toBeVisible();

    // FR-018: Mở trực tiếp /cart
    await page.goto("/cart");
    await expect(page.getByText("Tài khoản chủ shop không đặt đơn được.")).toBeVisible();

    // 3. Đăng xuất: Giỏ hàng cũ của Guest tái xuất hiện nguyên vẹn
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("1");

    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await assertStorageClean(page);
  });

  test("Dữ liệu localStorage rác không làm hỏng trang (FR-001 Edge Case)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("shop_cart", "rác dữ liệu {invalid]"));
    await page.goto("/cart");

    // Không sập, hiển thị giỏ hàng rỗng
    await expect(page.getByRole("heading", { level: 1, name: "Giỏ hàng" })).toBeVisible();
    await expect(page.getByText("Giỏ hàng của bạn đang trống.")).toBeVisible();
  });

  test("Mọi route trước tường đều trả về HTTP 200 không redirect khi chưa đăng nhập (FR-017)", async ({
    page,
  }) => {
    const resHome = await page.request.get("/");
    expect(resHome.status()).toBe(200);

    const resCart = await page.request.get("/cart");
    expect(resCart.status()).toBe(200);

    const resProduct = await page.request.get("/products/1");
    expect(resProduct.status()).toBe(200);
  });

  test("Accessibility: /cart và /place-order đạt chuẩn WCAG 2.1 AA (zero violations)", async ({
    page,
  }) => {
    // 1. Quét /cart khi có sản phẩm
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("shop_cart"));
    await page.getByRole("link", { name: "Cà phê sữa đá" }).click();
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    const cartAxe = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(cartAxe.violations, JSON.stringify(cartAxe.violations, null, 2)).toEqual([]);

    // 2. Quét /place-order khi là Guest (Tường đăng ký)
    await page.goto("/place-order");
    await expect(
      page.getByText("Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên."),
    ).toBeVisible();

    const wallAxe = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(wallAxe.violations, JSON.stringify(wallAxe.violations, null, 2)).toEqual([]);

    // 3. Quét /place-order khi là Customer
    const email = `a11y-${Date.now()}@example.com`;
    await page.goto("/register?returnTo=/place-order");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("MatKhau123!");
    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page).toHaveURL("/place-order");
    await expect(page.getByRole("heading", { level: 1, name: "Đặt đơn" })).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    const orderAxe = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(orderAxe.violations, JSON.stringify(orderAxe.violations, null, 2)).toEqual([]);
  });
});
