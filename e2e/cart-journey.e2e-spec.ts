import { test, expect } from "@playwright/test";

test.describe("E2E Cart Journey (T010 - US4)", () => {
  test("Giỏ hàng sống sót qua reload, đăng ký, đăng xuất, đăng nhập và đăng nhập thất bại", async ({
    page,
  }) => {
    // Helper kiểm tra localStorage.shop_cart:
    // Chỉ chứa v, productId, quantity; KHÔNG chứa email hay token (FR-020)
    const assertStorageClean = async () => {
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
    const cartAfterAdd = await assertStorageClean();
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
    await assertStorageClean();

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
    await assertStorageClean();

    // 3. (c) Đăng xuất: Giỏ hàng không đổi (US4-3)
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Giỏ hàng/ })).toContainText("3");

    await page.goto("/cart");
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();
    await expect(page.getByText("Sổ tay ghi chép")).toBeVisible();
    await assertStorageClean();

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
    await assertStorageClean();

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
    await assertStorageClean();
  });
});
