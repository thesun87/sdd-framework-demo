# Feature Specification: Cart & Registration Wall

**Feature Branch**: `003-cart-and-wall`

**Created**: 2026-09-23

**Status**: Draft

**Track**: B — brownfield feature. Baseline `baseline-0002-ecommerce` is frozen, and this feature completes a capability listed in `docs/baseline/feature-map.md`: *"Khách thêm hàng vào giỏ ở trình duyệt, giỏ **sống sót qua lần đăng nhập**, và gặp tường đăng ký khi định đặt đơn"*.

**Input**: User description: "003-cart-and-wall (Track B). Khách thêm hàng vào giỏ ở trình duyệt, giỏ sống sót qua lần đăng nhập, và gặp Tường đăng ký khi định đặt đơn. FR-6, FR-7, FR-8, FR-11."

**Baseline references**:

- `docs/baseline/feature-map.md`: `003-cart-and-wall`, depends on `001`, `002`, owns PRD FR-6, FR-7, FR-8, FR-11, governed by AD-17.
- `docs/baseline/prd.md`: §4.3 FR-6 (Quản lý dòng giỏ hàng), FR-7 (Giỏ hàng không giữ chỗ tồn kho), FR-8 (Giỏ sống sót qua lần đăng nhập); §4.4 FR-11 (Tường đăng ký giữa giỏ hàng và đặt đơn); §5 permission matrix row "Thêm vào giỏ hàng".
- `docs/baseline/architecture.md`: AD-17 (cart lives only in the browser, never carries a price), AD-19 (storefront contract exposes enums, never a Stock number), AD-20 (Stock status is never cached at any tier), AD-8 (no auth token in browser storage), AD-10 (one contract source in `packages/shared`).
- `docs/baseline/glossary.md`: Cart, Cart line, Line subtotal, Guest, Customer, Shop owner, Stock status, Discontinued.
- `docs/baseline/ux-spec.md`: component rows "Nút Thêm vào giỏ hàng", "Dòng giỏ hàng", "Tổng tiền hàng"; surfaces "Giỏ hàng", "Tường đăng ký"; state table rows Rỗng / Không có quyền / Hết hàng; UJ-1 steps 3–5, UJ-2 steps 3–6.
- `specs/003-cart-and-wall/impact-analysis.md`: decisions **D1** and **D2** (Tuan Nguyen, 2026-09-23).

> **Derived artifact.** This specification refines PRD FR-6, FR-7, FR-8 and FR-11 only. It does not add order placement, delivery address, payment method, the *Đơn chưa đặt được* page or idempotency (all `004-place-order`), a server-side cart, cart sync across devices, stock reservation, or guest checkout. If implementation requires any of those, that is a scope or baseline conflict.

> **Recorded decisions carried from `impact-analysis.md`:**
> - **D1** — The Cart marks lines whose quantity exceeds current Stock using a **per-line status enum** computed by the server from `(product, quantity)`. No Stock number reaches the storefront. The Cart therefore **does not state "chỉ còn {n}"**. The PRD FR-6 phrase *"nêu rõ số lượng còn bán được"* and the `ux-spec.md` string *"Chỉ còn {n} sản phẩm…"* were **amended in `baseline-0002-ecommerce`** (2026-09-23, ADR-0001); the Cart-line strings used here are now in `ux-spec.md`.
> - **D2** — The terms **Tường đăng ký**, **Trang bán hàng** and **Đặt đơn** are canonical since `baseline-0002-ecommerce`: `glossary.md` rows *Registration wall*, *Storefront*, *Place order*. No other synonym ("checkout", "login wall", "paywall", "basket") may be introduced.

## Clarifications

### Session 2026-09-23

- Q: Khi Khách chưa đăng ký bấm Đặt đơn, Tường đăng ký là trang có sẵn form, hay trang thông báo dẫn sang trang Đăng ký / Đăng nhập của `002`? → A: Trang thông báo có hai nút **Đăng ký** và **Đăng nhập**, dẫn sang trang của `002` kèm đích quay về là bước Đặt đơn (B).
- Q: Khi cùng một giỏ mở ở hai tab, tab kia có tự cập nhật ngay không? → A: Có — biểu tượng giỏ và trang Giỏ hàng cập nhật ngay khi tab khác đổi giỏ; mọi thao tác ghi đọc bản mới nhất trong trình duyệt trước khi sửa (A).
- Q: Số trên biểu tượng giỏ là tổng số lượng hay số dòng giỏ? → A: Tổng số lượng của mọi dòng giỏ (A).
- Q: Có chốt ngưỡng hiệu năng cho Giỏ hàng bằng ngưỡng p95 của PRD §8 không? → A: Có — trang Giỏ hàng ≤ 1,5 s p95 (tối đa 20 dòng), kiểm tra trạng thái dòng ≤ 400 ms p95 (A).
- Q: (remediation `/speckit-analyze` I1, người duyệt) Shop owner mở thẳng `/cart` thấy gì? → A: "Tài khoản chủ shop không đặt đơn được."; giỏ trong trình duyệt giữ nguyên (FR-018).
- Q: (remediation U1) Customer mở `/place-order` khi giỏ rỗng hoặc có dòng bị cờ? → A: Giỏ rỗng hiện câu giỏ rỗng; dòng bị cờ hiện cờ như Giỏ hàng (FR-019).
- Q: (remediation T1) Tiền của một dòng gọi là gì? → A: Không đặt tên mới; viết "price × quantity" — glossary chỉ có *Line subtotal*.

## Existing behaviour that must not change

Features `000`, `001` and `002` established these behaviours; they remain protected:

- A Guest can open the Trang bán hàng, browse flat Categories, search accent-insensitively, paginate and view Product details **without being prompted or redirected to log in** — every screen before the Tường đăng ký answers HTTP 200 without a session (FR-11, `ux-spec.md` §Điều hướng).
- Stock status is exactly "Còn hàng" / "Hết hàng", is always fresh, and the exact Stock number never reaches the Trang bán hàng.
- Registration, login, logout, session lifetime, rate limiting and the pre-seeded Shop owner behave as specified by `002-accounts`. Logging in or registering **from anywhere other than the Tường đăng ký** still lands on the home page as today.
- No authentication token is ever held in browser storage (AD-8).
- Security headers (CSP), single origin, and all existing unit, integration, race and end-to-end suites keep passing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Guest adds Products to a Cart that lives in the browser (Priority: P1)

A Guest viewing a Product detail page that is "Còn hàng" presses **Thêm vào giỏ hàng**. The page does not navigate anywhere; the counter on the Cart icon in the header increases. The Guest opens the Giỏ hàng and sees each Cart line with the Product's name, image, **current** price, quantity and price × quantity, plus the Line subtotal. The Cart survives page reloads. No account and no server-side record is involved.

**Why this priority**: FR-6 and FR-7 are the core of the slice; without a Cart there is nothing to carry through login and nothing for the Tường đăng ký to guard. It is the first half of UJ-1 and UJ-2.

**Independent Test**: As a Guest, add two different Products (one of them twice) from their detail pages, reload the page, open the Giỏ hàng. Verify two Cart lines, the repeated Product with quantity 2, the Line subtotal equal to Σ(current price × quantity), no shipping fee line, and the Stock of both Products unchanged.

**Acceptance Scenarios**:

1. **Given** a Guest on the detail page of a Product that is "Còn hàng", **When** they press **Thêm vào giỏ hàng**, **Then** a Cart line with quantity 1 is added, the Cart icon counter increases, and the page stays where it is.
2. **Given** a Cart already containing Product P, **When** the Guest adds P again, **Then** the existing Cart line's quantity increases by 1, no second line for P is created, and the Cart icon counter increases by 1.
3. **Given** a Product that is "Hết hàng", **When** a Guest views its detail page, **Then** the **Thêm vào giỏ hàng** button is disabled and the text "Sản phẩm này đang hết hàng." is shown next to it.
4. **Given** a Cart with lines, **When** the Guest reloads the page or closes and reopens the tab in the same browser, **Then** the Cart contains the same lines with the same quantities.
5. **Given** a Cart with lines, **When** the Giỏ hàng is shown, **Then** it displays the Line subtotal only — there is no shipping fee line.
6. **Given** a Product's price is changed after it was added to the Cart, **When** the Giỏ hàng is shown, **Then** the Cart line and the Line subtotal use the **current** price, not the price at the time it was added.
7. **Given** a Product whose Stock is S, **When** any number of Guests and Customers add it to their Carts, **Then** its Stock is still exactly S.
8. **Given** the Stock of Product P is 1, **When** two different browsers each add P to their Cart, **Then** both additions succeed.
9. **Given** an empty Cart, **When** the Giỏ hàng is shown, **Then** it reads "Giỏ hàng của bạn đang trống." with a link back to the home page.

---

### User Story 2 — Guest or Customer edits Cart lines (Priority: P1)

In the Giỏ hàng, the user changes quantities in place and removes lines. A quantity change is saved when the field is left or when the increase/decrease control is used. Removing a line does not ask for confirmation.

**Why this priority**: FR-6 requires change-quantity and remove; a Cart that can only grow is not usable, and the verifiable consequences (0 means remove, negative/non-integer rejected) are part of the acceptance baseline.

**Independent Test**: With a Cart of two lines, set line A to 3, set line B to 0, then try entering -1 and 1.5 on line A. Verify A becomes 3, B disappears, and both invalid entries are rejected with A still at 3.

**Acceptance Scenarios**:

1. **Given** a Cart line with quantity 1, **When** the user sets it to 3 and leaves the field, **Then** the line quantity is 3, the line's price × quantity and the Line subtotal update, and the change survives a reload.
2. **Given** a Cart line, **When** the user sets its quantity to 0, **Then** the line is removed, exactly as if they had removed it.
3. **Given** a Cart line, **When** the user enters a negative number or a non-integer, **Then** the value is rejected, a message explains why, and the line keeps its previous quantity.
4. **Given** a Cart line, **When** the user removes it, **Then** it disappears immediately without a confirmation dialog.
5. **Given** a Cart line, **When** the user sets a quantity larger than the current Stock, **Then** the change is **accepted** (the Cart does not judge Stock) and the line is flagged as described in User Story 3.

---

### User Story 3 — Cart flags lines that cannot currently be bought (Priority: P1)

Each time the Giỏ hàng is shown, and after each quantity change, the system re-checks every Cart line against current Stock. A line is either **normal**, **exceeds Stock** (quantity greater than current Stock, Stock > 0), or **out of stock** (current Stock is 0). Flagged lines stay visible, are never removed or corrected automatically, and while any line is flagged the **Đặt đơn** button is disabled with the reason stated.

**Why this priority**: FR-6 makes line flagging an acceptance criterion, and UJ-6 exists to reduce the number of people who reach the rejection page of `004`. Per D1 the flag carries no Stock number.

**Independent Test**: Seed Product A with Stock 3 and Product B with Stock 0. Put A × 5 and B × 1 in the Cart. Verify A shows the exceeds-Stock warning without any number, B shows the out-of-stock warning, both remain, **Đặt đơn** is disabled. Reduce A to 3 and remove B; verify both warnings are gone and **Đặt đơn** is enabled.

**Acceptance Scenarios**:

1. **Given** a Cart line whose quantity exceeds the Product's current Stock (Stock > 0), **When** the Giỏ hàng is shown, **Then** the line shows a warning telling the user to reduce the quantity to be able to order, and **no Stock number appears anywhere on the page or in any response the page receives**.
2. **Given** a Cart line whose Product has current Stock 0, **When** the Giỏ hàng is shown, **Then** the line shows "Sản phẩm này đang hết hàng." and remains in the Cart.
3. **Given** at least one flagged line, **When** the Giỏ hàng is shown, **Then** **Đặt đơn** is disabled and a visible reason next to it points at the flagged lines.
4. **Given** a flagged line, **When** the user fixes it (reduces quantity to within Stock or removes it), **Then** the flag disappears after the re-check, and once no line is flagged **Đặt đơn** is enabled.
5. **Given** Stock changes while the Giỏ hàng is open in another tab, **When** the Giỏ hàng is shown again or a quantity is changed, **Then** line flags reflect the Stock at that moment, not a remembered earlier result.
6. **Given** any line status request, **When** the client sends a price, **Then** the server ignores it; prices shown come only from current Product data.

---

### User Story 4 — Cart survives registration, login and logout (Priority: P1)

A Guest with a non-empty Cart registers or logs in; afterwards the Cart holds exactly the same lines and quantities. A Customer who logs out keeps the Cart in that browser.

**Why this priority**: FR-8 is the outcome the feature-map row emphasises ("giỏ **sống sót qua lần đăng nhập**") and the climax of UJ-2.

**Independent Test**: As a Guest, add A × 2 and B × 1, register a new account; verify the Cart is A × 2, B × 1. Log out; verify the Cart is unchanged. Log in again; verify it is still unchanged.

**Acceptance Scenarios**:

1. **Given** a Guest with a Cart of lines L, **When** they register successfully, **Then** the Cart contains exactly L with the same quantities.
2. **Given** a Guest with a Cart of lines L, **When** they log in successfully, **Then** the Cart contains exactly L.
3. **Given** a logged-in Customer with a Cart, **When** they log out, **Then** the Cart is not cleared.
4. **Given** a failed login or failed registration, **When** the user returns to the Giỏ hàng, **Then** the Cart is unchanged.

---

### User Story 5 — Guest meets the Tường đăng ký and returns to Đặt đơn (Priority: P1)

From the Giỏ hàng, a Guest presses **Đặt đơn**. Instead of the Đặt đơn step, the Tường đăng ký appears with "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." and lets them register or log in. After success they are taken to **the Đặt đơn step**, with the Cart intact. A Customer who presses **Đặt đơn** goes directly to the Đặt đơn step.

**Why this priority**: FR-11 is the second half of the feature-map outcome. The wall is deliberate (SM-C2): it must not be softened, skipped, or replaced by guest checkout.

**Independent Test**: As a Guest with a Cart, press **Đặt đơn**; verify the Tường đăng ký message and both options. Register; verify arrival at the Đặt đơn step with the same Cart. Repeat with an existing account via login. As a logged-in Customer, press **Đặt đơn**; verify no wall is shown.

**Acceptance Scenarios**:

1. **Given** a Guest with a non-empty, unflagged Cart, **When** they press **Đặt đơn**, **Then** the Tường đăng ký is shown with the text "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." and two actions, **Đăng ký** and **Đăng nhập**, leading to the existing registration and login pages. This is not presented as an error.
2. **Given** the Tường đăng ký, **When** the Guest registers successfully, **Then** they are taken to the Đặt đơn step without logging in again, and the Cart is intact.
3. **Given** the Tường đăng ký, **When** the Guest logs in successfully, **Then** they are taken to the Đặt đơn step and the Cart is intact.
4. **Given** a logged-in Customer with a non-empty, unflagged Cart, **When** they press **Đặt đơn**, **Then** they go directly to the Đặt đơn step without seeing the Tường đăng ký.
5. **Given** a Guest, **When** they open the Đặt đơn step directly by its address, **Then** they see the Tường đăng ký, not the Đặt đơn step.
6. **Given** a return destination supplied to registration or login, **When** it is not an address within the Trang bán hàng, **Then** it is ignored and the user lands on the home page (no redirect to another site).
7. **Given** a Customer at the Đặt đơn step, **When** the page is shown, **Then** it is titled "Đặt đơn", shows the Cart lines with current prices and the Line subtotal, states that ordering is not yet available, and offers no way to submit an order.
8. **Given** the Tường đăng ký, **When** the user leaves it without registering or logging in, **Then** the Cart is unchanged and every earlier screen remains reachable without a session.

---

### User Story 6 — Shop owner has no Cart on the Trang bán hàng (Priority: P2)

When the Shop owner browses the Trang bán hàng in a Shop owner session, there is no Cart icon and no **Thêm vào giỏ hàng** button, because the Shop owner does not place orders (PRD §5, §11.1 Q4).

**Why this priority**: A permission-matrix row (`—` for Shop owner) and a `ux-spec.md` state; lower than the Customer flows because it removes UI rather than delivering value.

**Independent Test**: Log in as the pre-seeded Shop owner on the Trang bán hàng; verify no Cart icon in the header and no add-to-cart button on a Product detail page; open the Đặt đơn step address directly and verify "Tài khoản chủ shop không đặt đơn được."

**Acceptance Scenarios**:

1. **Given** a Shop owner session, **When** any Trang bán hàng page is shown, **Then** there is no Cart icon in the header.
2. **Given** a Shop owner session, **When** a Product detail page is shown, **Then** there is no **Thêm vào giỏ hàng** button.
3. **Given** a Shop owner session, **When** the Đặt đơn step address is opened directly, **Then** the page reads "Tài khoản chủ shop không đặt đơn được."

---

### Edge Cases

- **Corrupted or hand-edited Cart data in the browser** (not valid structure, negative or non-integer quantity, duplicate lines for the same Product, identifiers that match no Product): the page must not break. Invalid lines are discarded, duplicates are combined, and a Product identifier that matches no Product is dropped — it can only arise from tampering, since no feature before `009` can remove a Product.
- **Discontinued Products**: no Product can become Discontinued until `009-product-admin`. The Cart-line state "sản phẩm ngừng bán" (`ux-spec.md` state (b)) is therefore **not delivered here**; `009` owns it together with the Discontinued status.
- **Cart open in two tabs**: a change made in one tab is reflected **immediately** in the other tab's Cart icon counter and Giỏ hàng, without reload. Every Cart change starts from the latest Cart stored in the browser, so no tab ever overwrites the Cart with an older copy.
- **Browser storage unavailable** (private mode with storage disabled, quota exceeded): the user is told the Cart cannot be saved in this browser; browsing keeps working.
- **Different device or cleared browser data**: the Cart is not there. This is an accepted consequence of AD-17 (PRD FR-8 NOTE FOR PM), not a defect.
- **Line status check fails** (network error, server error): the Cart lines stay as stored, no line is flagged or unflagged on stale data, and **Đặt đơn** stays disabled until a successful check.
- **Very large quantities**: there is **no product rule** limiting a Cart line's quantity (PRD sets none; decided 2026-09-23, Q1 = A). `/speckit-plan` sets a purely technical sanity limit for validation and records the D1 probing risk (exact Stock inferable from `(product, quantity)` pairs) as an **accepted risk**.
- **Shop owner with a Cart left from an earlier Guest session in the same browser**: the Cart is kept but not shown; it reappears if the Shop owner logs out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(← PRD FR-6, FR-8, AD-17)*: The Cart MUST be kept in the user's browser and MUST survive page reloads. It MUST hold only Product identifiers and quantities — never prices, names or Stock information.
- **FR-002** *(← PRD FR-6, §5)*: A Guest or Customer MUST be able to add a Product that is "Còn hàng" to the Cart from its Product detail page. Adding MUST NOT navigate away and MUST update the Cart icon counter, which shows the **total quantity across all Cart lines** (e.g. A × 2 + B × 1 shows 3).
- **FR-003** *(← PRD FR-6)*: Adding a Product already in the Cart MUST increase that Cart line's quantity; the Cart MUST NOT contain two lines for the same Product.
- **FR-004** *(← PRD FR-6)*: Users MUST be able to change a Cart line's quantity and remove a Cart line. Setting quantity to 0 MUST be equivalent to removing the line. Negative and non-integer quantities MUST be rejected.
- **FR-005** *(← PRD FR-6, FR-7)*: A quantity greater than current Stock MUST be accepted into the Cart.
- **FR-006** *(← PRD FR-6, AD-17)*: The Giỏ hàng MUST show, for each Cart line, the Product's current name, image, current price and price × quantity, and MUST show the Line subtotal computed from **current** prices. It MUST NOT show any shipping fee.
- **FR-007** *(← PRD FR-6, D1, AD-19)*: The system MUST determine for each Cart line, from the Product's current Stock and the line quantity, one of: **normal**, **exceeds Stock**, **out of stock**. The result MUST be expressed as a status value only; no Stock number may be returned to or displayed on the Trang bán hàng.
- **FR-008** *(← PRD FR-6, AD-20)*: Line statuses and Stock status MUST be re-determined every time the Giỏ hàng is shown and after every quantity change; they MUST NOT be served from a remembered earlier result at any tier.
- **FR-009** *(← PRD FR-6)*: Flagged lines MUST remain visible with a line-level message and MUST NOT be removed or corrected automatically. Per `ux-spec.md`, the out-of-stock message is "Sản phẩm này đang hết hàng."; the exceeds-Stock message MUST tell the user to reduce the quantity in order to place an order **without stating a number** (final wording owed to the `ux-spec.md` amendment of D1).
- **FR-010** *(← PRD FR-6, `ux-spec.md` disabled-control rule)*: While any Cart line is flagged, or the Cart is empty, or line statuses could not be determined, **Đặt đơn** MUST be disabled with a visible reason.
- **FR-011** *(← PRD FR-7)*: Adding to, editing or removing from the Cart MUST NOT change any Product's Stock, and MUST NOT create any record on the server. The Cart has no expiry.
- **FR-012** *(← AD-17)*: Any price sent by the client MUST be ignored by the server; displayed prices come only from current Product data.
- **FR-013** *(← PRD FR-8)*: Successful registration and successful login MUST leave the Cart exactly as it was (same lines, same quantities). Logout MUST NOT clear the Cart.
- **FR-014** *(← PRD FR-11)*: A Guest pressing **Đặt đơn**, or opening the Đặt đơn step directly, MUST be shown the Tường đăng ký: a page with the text "Bạn cần một tài khoản để đặt đơn. Giỏ hàng của bạn được giữ nguyên." and two actions, **Đăng ký** and **Đăng nhập**, which open the existing registration and login pages of `002` carrying the Đặt đơn step as their return destination. The Tường đăng ký holds no form of its own. It MUST NOT be presented as an error.
- **FR-015** *(← PRD FR-11)*: After successful registration or login started from the Tường đăng ký, the user MUST be taken to the Đặt đơn step with the Cart intact. A logged-in Customer pressing **Đặt đơn** MUST reach the Đặt đơn step directly.
- **FR-016** *(← PRD FR-11, security)*: A return destination passed through registration or login MUST be honoured only if it is an address within the Trang bán hàng; otherwise the user MUST land on the home page.
- **FR-017** *(← PRD FR-11)*: Every screen before the Tường đăng ký — home, Category, search, Product detail, Giỏ hàng — MUST remain reachable without a session and MUST NOT redirect to login.
- **FR-018** *(← PRD §5, §11.1 Q4)*: In a Shop owner session, the Trang bán hàng MUST NOT show the Cart icon or the **Thêm vào giỏ hàng** button, and both the Giỏ hàng and the Đặt đơn step, when opened directly, MUST read "Tài khoản chủ shop không đặt đơn được." The Cart in that browser is kept untouched.
- **FR-019** *(← PRD FR-11, `004` boundary; decided 2026-09-23, Q2 = A)*: In this feature the Đặt đơn step MUST be a page titled "Đặt đơn" that shows the Cart summary (Cart lines, current prices, Line subtotal) and a notice that ordering is not yet available. Lines are re-checked and flagged exactly as in the Giỏ hàng (FR-007–FR-009); an empty Cart shows "Giỏ hàng của bạn đang trống." with a link to the home page. It MUST NOT collect a delivery address or payment method and MUST NOT create anything. The notice is **interim copy** deliberately kept out of `ux-spec.md` because it is temporary; `004-place-order` replaces the page content.
- **FR-020** *(← AD-8)*: The Cart stored in the browser MUST NOT contain any account identifier, email or session token.
- **FR-021** *(← PRD FR-6, FR-8)*: A Cart change made in one tab MUST be reflected without reload in every other open tab of the same browser (Cart icon counter and Giỏ hàng), and every Cart change MUST be applied to the latest stored Cart, never to an older copy held by the tab.

### Key Entities

- **Cart**: The set of Cart lines kept in one browser. Belongs to whoever uses that browser — Guest or Customer — and is not linked to an account. Reserves no Stock and has no expiry.
- **Cart line**: A (Product, quantity) pair; quantity is a positive integer. Holds no price.
- **Cart line status**: The server's current verdict on a Cart line — normal, exceeds Stock, out of stock. Derived on demand, never stored, carries no number.
- **Line subtotal**: Σ(current price × quantity) over all Cart lines. Excludes shipping fee.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Guest can go from a Product detail page to a Cart containing that Product in one action, with no page navigation and no login prompt.
- **SC-002**: In 100% of tested register, login and logout flows, the Cart afterwards has exactly the same lines and quantities as before.
- **SC-003**: The Stock of every Product is identical before and after any sequence of Cart operations by any number of users.
- **SC-004**: In 100% of tested Cart states where a line's quantity exceeds Stock or Stock is 0, that line is flagged and **Đặt đơn** is disabled; in 100% of states with no such line, no line is flagged.
- **SC-005**: Zero Stock numbers appear in any Trang bán hàng page or in any response the Trang bán hàng receives, across all Cart scenarios.
- **SC-006**: A Guest who presses **Đặt đơn** reaches the Đặt đơn step after registering or logging in with at most one form submission after the Tường đăng ký, and no Guest ever reaches the Đặt đơn step without a session.
- **SC-007** *(← PRD §8)*: With up to 20 Cart lines, the Giỏ hàng finishes showing every line with its current price and status in **≤ 1.5 s at p95**, and determining the line statuses answers in **≤ 400 ms at p95** (PRD §8 read path).
- **SC-008**: 100% of pre-existing unit, integration, race and end-to-end suites of `000`, `001` and `002` continue to pass.

## Assumptions

- Features `000`, `001`, `002` are merged; Product detail, Stock status, registration and login exist and are reused.
- **Thêm vào giỏ hàng** adds quantity 1; quantity is adjusted in the Giỏ hàng. The button exists only on Product detail (`ux-spec.md`), not on Product cards.
- Login and registration started **outside** the Tường đăng ký keep their current destination (home page).
- The offline banner and locking of submit buttons while offline (`ux-spec.md` state table "Ngoại tuyến") are a cross-cutting concern not delivered by `000`–`002` and are not in scope here.
- The Đặt đơn step's content — delivery address, payment method, order placement and the rule "API đặt đơn không có phiên → HTTP 401" — belongs to `004-place-order`, where that API first exists.
- The residual risk recorded in D1 (exact Stock can be inferred by probing quantities) is an **accepted risk** (2026-09-23, Q1 = A); `/speckit-plan` records it and adds no user-visible rule.
