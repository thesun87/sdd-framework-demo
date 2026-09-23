import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function newAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

test.describe("E2E Auth Journey (T020)", () => {
  test("đăng ký tài khoản mới, duy trì phiên, hiển thị trên header và đăng xuất", async ({
    page,
  }) => {
    const uniqueEmail = `khach-${Date.now()}@example.com`;
    const password = "MatKhau123!";

    // 1. Mở trang đăng ký
    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1, name: "Đăng ký tài khoản" })).toBeVisible();

    // Kiểm tra khả năng tiếp cận WCAG trên trang Đăng ký
    const registerAxeResults = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(registerAxeResults.violations).toEqual([]);

    // 2. Điền thông tin và bấm Đăng ký
    await page.locator("#email").fill(uniqueEmail);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();

    // 3. Đăng ký thành công -> điều hướng về trang chủ và hiển thị email trên Header
    await expect(page).toHaveURL("/");
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    // 4. Tải lại trang -> phiên làm việc vẫn được duy trì qua cookie shop_session
    await page.reload();
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    // 5. Đăng xuất
    await page.getByRole("button", { name: "Đăng xuất" }).click();

    // Sau khi đăng xuất, Header hiển thị lại liên kết Đăng nhập và Đăng ký
    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng ký" })).toBeVisible();
    await expect(page.getByText(uniqueEmail)).not.toBeVisible();
  });

  test("đăng nhập với tài khoản có sẵn và xác thực accessibility trên trang đăng nhập", async ({
    page,
  }) => {
    const email = `login-${Date.now()}@example.com`;
    const password = "MatKhau123!";

    // Đăng ký tài khoản trước qua API
    await page.request.post("/api/auth/register", {
      data: { email, password },
    });

    // Mở trang đăng nhập
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeVisible();

    // Kiểm tra WCAG accessibility
    const loginAxeResults = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(loginAxeResults.violations).toEqual([]);

    // Đăng nhập sai mật khẩu -> hiện thông báo lỗi
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("WrongPassword!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Email hoặc mật khẩu không chính xác.");

    // Đăng nhập đúng mật khẩu -> thành công về trang chủ
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(email)).toBeVisible();
  });
});
