import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
const { Pool } = pg;

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

  test("Flags & Tồn kho (US1-3, US3-1, US3-3, SC-005): Hết hàng disabled, vượt quá tồn kho gắn cờ, không lộ số tồn (DOM + mọi response)", async ({
    page,
  }) => {
    // 1. Sản phẩm hết hàng từ seed: 'Bình giữ nhiệt Mini 350ml'
    await page.goto("/");
    await page.getByRole("link", { name: "Bình giữ nhiệt Mini 350ml" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bình giữ nhiệt Mini 350ml" })).toBeVisible();

    const addBtn = page.getByRole("button", { name: "Thêm vào giỏ hàng" });
    await expect(addBtn).toBeDisabled();
    await expect(page.getByText("Sản phẩm này đang hết hàng.")).toBeVisible();

    // 2. SC-005 (T019, convergence finding F3): bài test cũ chỉ so khớp TÊN TRƯỜNG JSON
    // ("stockQuantity", "quantity\":") trên MỘT response bắt được qua page.waitForResponse —
    // schema packages/shared đã .strict() nên tên trường đó không bao giờ xuất hiện dù có
    // lộ số tồn hay không (khẳng định cũ luôn đúng một cách vô nghĩa). Ở đây dựng một sản
    // phẩm fixture RIÊNG với một giá trị Stock đã biết trước, rồi khẳng định ĐÚNG GIÁ TRỊ
    // SỐ đó — không phải tên trường — không xuất hiện ở bất kỳ đâu: cả text hiển thị (DOM)
    // lẫn MỌI response /api/cart-lines/status quan sát được trong suốt test (không chỉ một
    // lần reload).
    const databaseUrl = process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/shop";
    const pool = new Pool({ connectionString: databaseUrl });

    // Lựa chọn các giá trị để KHÔNG THỂ trùng với bất kỳ số nào khác xuất hiện trên trang:
    //   - SEEDED_STOCK=9187: 4 chữ số "lạ" (không phải một mốc tròn như 50/100/9999 hay
    //     bằng bất kỳ price/id nào của dữ liệu seed — xem db/seed.ts, giá 25 000–189 000 và
    //     tồn kho 0/15/20/35/50).
    //   - PRICE=137 000: khác hoàn toàn SEEDED_STOCK về chữ số, không phải bội số của nó.
    //   - EXCEEDING_QTY=SEEDED_STOCK+1=9188: đúng bằng 1 đơn vị trên tồn kho (chắc chắn kích
    //     hoạt "exceeds_stock") và vẫn ≤ trần kỹ thuật 9999 của CartLineSchema (packages/
    //     shared/src/storefront/cart.ts) — không thể set quantity lớn hơn để "cho chắc".
    //   - id sản phẩm mới do CSDL tự sinh (identity, bắt đầu từ nhỏ, xem migration) — không
    //     thể trùng một số 4 chữ số "lạ" như 9187 (khẳng định lại bằng runtime check bên
    //     dưới, không chỉ suy luận suông).
    //   - Tổng tiền dòng = 137 000 × 9188 = 1 258 756 000 — đã kiểm bằng tay (task-019-report)
    //     rằng chuỗi "9187" không phải là dãy con của bất kỳ số nào ở trên.
    const SEEDED_STOCK = 9187;
    const PRICE = 137000;
    const EXCEEDING_QTY = SEEDED_STOCK + 1;
    const seededStockStr = String(SEEDED_STOCK);

    let fixtureProductId: number | undefined;
    try {
      const productName = `Fixture SC005 ${Date.now()}`;
      const insertRes = await pool.query<{ id: string | number }>(
        `INSERT INTO product (name, name_normalized, description, price)
         VALUES ($1, $1, '', $2)
         RETURNING id`,
        [productName, PRICE],
      );
      fixtureProductId = Number(insertRes.rows[0].id);
      await pool.query(
        `INSERT INTO stock (product_id, quantity, updated_at) VALUES ($1, $2, now())`,
        [fixtureProductId, SEEDED_STOCK],
      );

      // Không suy luận suông — khẳng định thật rằng id vừa sinh không trùng giá trị Stock đã
      // chọn (nếu một ngày id chạy tới 9187, test này BÁO LỖI RÕ RÀNG thay vì âm thầm sai).
      expect(
        String(fixtureProductId),
        "id sản phẩm fixture trùng SEEDED_STOCK — đổi SEEDED_STOCK sang giá trị khác",
      ).not.toBe(seededStockStr);

      // Bắt TOÀN BỘ response /api/cart-lines/status trong suốt test (không chỉ một lần) —
      // đăng ký listener TRƯỚC lần điều hướng đầu tiên để không bỏ lỡ lần kiểm tra khi mount.
      const statusResponseBodies: string[] = [];
      page.on("response", (res) => {
        if (res.url().includes("/api/cart-lines/status")) {
          void res
            .text()
            .then((body) => statusResponseBodies.push(body))
            .catch(() => {
              // Response bị huỷ (điều hướng tiếp theo) — bỏ qua, không phải lỗi cần test này bắt.
            });
        }
      });

      await page.goto("/");
      await page.evaluate(
        (payload) => localStorage.setItem("shop_cart", JSON.stringify(payload)),
        { v: 1, lines: [{ productId: fixtureProductId, quantity: 1 }] },
      );
      await page.goto("/cart");
      await expect(page.getByText(productName)).toBeVisible();

      // Đặt số lượng vượt đúng 1 đơn vị so với Stock đã seed
      const qtyInput = page.getByRole("spinbutton");
      await qtyInput.fill(String(EXCEEDING_QTY));
      await qtyInput.press("Enter");

      // Cờ vượt quá tồn kho xuất hiện
      await expect(
        page.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
      ).toBeVisible();

      // Nút Đặt đơn bị vô hiệu hoá và hiện lý do
      const placeOrderBtn = page.getByRole("button", { name: "Đặt đơn" });
      await expect(placeOrderBtn).toBeDisabled();
      await expect(page.getByText("Bạn sửa các dòng được đánh dấu để đặt đơn.")).toBeVisible();

      // Một reload nữa để có thêm ít nhất một response /api/cart-lines/status (lần mount đầu
      // + lần reload này) trong tập hợp quan sát được.
      await page.reload();
      await expect(
        page.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
      ).toBeVisible();

      await expect
        .poll(() => statusResponseBodies.length, {
          message: "phải bắt được ít nhất một response /api/cart-lines/status",
        })
        .toBeGreaterThan(0);

      // SC-005 — khẳng định chính: giá trị Stock đã seed KHÔNG xuất hiện trong BẤT KỲ
      // response /api/cart-lines/status nào quan sát được (không phải chỉ tên trường).
      for (const body of statusResponseBodies) {
        expect(body).not.toContain(seededStockStr);
        // Giữ lại các khẳng định tên trường cũ — vẫn có giá trị nếu một bản vá sau này thêm
        // hẳn một trường mới mang tên đó (dù giá trị số có trùng SEEDED_STOCK hay không).
        expect(body).not.toContain("availableQuantity");
        expect(body).not.toContain("stockQuantity");
      }

      // SC-005 — giá trị Stock đã seed cũng KHÔNG xuất hiện trong text hiển thị của trang.
      const pageText = await page.locator("body").innerText();
      expect(pageText).not.toContain(seededStockStr);
    } finally {
      if (fixtureProductId !== undefined) {
        await pool.query(`DELETE FROM stock WHERE product_id = $1`, [fixtureProductId]);
        await pool.query(`DELETE FROM product WHERE id = $1`, [fixtureProductId]);
      }
      await pool.end();
    }
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

  test("Mọi route trước Tường đăng ký trả về HTTP 200, không redirect, khi chưa đăng nhập (FR-017)", async ({
    page,
    request,
  }) => {
    // FR-017 liệt kê: home, Category, search, Product detail, Giỏ hàng — cộng thêm
    // /place-order, /login?returnTo=..., /register?returnTo=... vì các trang này cũng PHẢI
    // vào được không cần phiên (Tường đăng ký/đăng nhập tự nó không được redirect ra ngoài
    // đường tới nó). Bài test cũ chỉ kiểm 3 route và dùng `page.request.get` — mặc định của
    // Playwright là TỰ ĐỘNG follow redirect rồi báo status của đích cuối, nên "không
    // redirect" (yêu cầu #3 của brief) CHƯA TỪNG thực sự được khẳng định.
    const productsRes = await request.get("/api/products");
    expect(productsRes.status()).toBe(200);
    const productsBody = (await productsRes.json()) as { items: Array<{ id: number }> };
    expect(productsBody.items.length).toBeGreaterThan(0);
    const firstProductId = productsBody.items[0].id;

    const preWallPaths = [
      "/", // home
      "/?categoryId=1", // Category
      "/?q=binh%20giu%20nhiet", // search
      `/products/${firstProductId}`, // Product detail
      "/cart", // Giỏ hàng
      "/place-order",
      "/login?returnTo=/place-order",
      "/register?returnTo=/place-order",
    ];

    for (const path of preWallPaths) {
      // `maxRedirects: 0` — nếu có một redirect (3xx) tới bất kỳ đâu (vd /login), request
      // này KHÔNG được tự động theo nó; `res.status()` phải là chính status của `path`, không
      // phải status của đích redirect.
      const res = await page.request.get(path, { maxRedirects: 0 });
      expect(res.status(), `route ${path} phải trả 200, không redirect`).toBe(200);
    }

    // F-3: `maxRedirects: 0` ở trên chỉ chứng minh SERVER không trả 3xx cho request thô — nó
    // KHÔNG bắt được một redirect PHÍA CLIENT (JS điều hướng sang nơi khác sau khi trang SPA
    // đã tải, ví dụ Tường đăng ký/router tự ý push sang /login). `page` của chính bài test
    // này chưa từng đăng nhập ở bất kỳ bước nào phía trên — mở thật từng route bằng
    // page.goto trong đúng ngữ cảnh không phiên đó, và khẳng định URL cuối cùng của trình
    // duyệt đúng bằng route đã gọi, không bị điều hướng sang nơi khác.
    for (const path of preWallPaths) {
      await page.goto(path);
      await expect(
        page,
        `route ${path} không được điều hướng (client-side) sang URL khác`,
      ).toHaveURL(path);
    }
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

    // 1b. T014/T015 (plan.md) yêu cầu quét /cart khi CÓ ÍT NHẤT MỘT dòng bị đánh cờ và Đặt
    // đơn bị vô hiệu hoá — bài test cũ chỉ quét trạng thái "mọi thứ ổn"; trạng thái cảnh báo
    // đỏ (role="alert") + nút disabled là một cây DOM khác, có nguy cơ vi phạm AA riêng
    // (tên accessible của nút disabled, ngữ cảnh của vùng cảnh báo) mà lần quét trên không
    // chạm tới.
    const qtyInput = page.getByRole("spinbutton");
    await qtyInput.fill("9999");
    await qtyInput.press("Enter");
    await expect(
      page.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Đặt đơn" })).toBeDisabled();

    const cartFlaggedAxe = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(cartFlaggedAxe.violations, JSON.stringify(cartFlaggedAxe.violations, null, 2)).toEqual(
      [],
    );

    // Trả giỏ hàng về trạng thái không bị đánh cờ, không ảnh hưởng các bước quét /place-order
    // bên dưới (độc lập với dòng bị đánh cờ ở trên).
    await qtyInput.fill("1");
    await qtyInput.press("Enter");
    await expect(
      page.getByText("Số lượng này vượt quá số hàng còn bán được. Bạn giảm số lượng để đặt đơn."),
    ).not.toBeVisible();

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
    // T018: tiêu đề mục giỏ hàng trên trang Đặt đơn là "Giỏ hàng" (glossary-true), không còn
    // "Tóm tắt đơn hàng" — khoá lại đúng copy hiện tại để một hồi quy đổi copy bị bắt ở đây.
    await expect(page.getByRole("heading", { level: 2, name: "Giỏ hàng" })).toBeVisible();
    await expect(page.getByText("Cà phê sữa đá")).toBeVisible();

    const orderAxe = await newAxeBuilder(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(orderAxe.violations, JSON.stringify(orderAxe.violations, null, 2)).toEqual([]);
  });
});
