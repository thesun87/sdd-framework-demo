# Glossary — Canonical Terms

Bilingual (EN / VI). Every artifact, identifier, and commit message uses the
canonical term. If a term you need is not here, **stop and ask** — do not invent
a synonym. Naming drift is the single failure mode that task-scoped review
cannot detect (setup guide Appendix B #1).

Target: at least 20 canonical terms before the baseline is frozen.
The validator (HV015) fails if this file is missing or under 500 bytes.

| Canonical term (EN) | Tiếng Việt | Definition | Do NOT use |
|---|---|---|---|
| Track A | Track A | Greenfield flow: BMAD → Spec Kit → Superpowers | "full flow", "new project mode" |
| Track B | Track B | Brownfield feature flow: Spec Kit → Superpowers | "feature mode" |
| Track C | Track C | Direct change flow: Superpowers only, for reproducible defects | "hotfix mode", "quick fix" |
| Baseline | Baseline | The frozen contents of `docs/baseline/` at a named `baseline_id` | "the docs", "spec" |
| Baseline freeze | Đóng băng baseline | The act of recording `baseline-freeze.yaml` with `status: frozen` | "lock", "release" |
| Handoff contract | Hợp đồng bàn giao | `.sdd/<feature>/handoff.yaml` — the machine-checked boundary between planning and execution | "handover", "spec bundle" |
| Feature id | Mã feature | `NNN-slug`, the directory name under `specs/` | "ticket", "story id" |
| Change record | Hồ sơ thay đổi | `.sdd/direct/<date>-<ticket>/change-record.yaml` for Track C | "bug report" |
| Task brief | Brief công việc | `.sdd/<feature>/task-<NNN>-brief.md`, the only context a task subagent receives | "prompt", "instruction" |
| Convergence | Hội tụ | The `/speckit-converge` step: reassess the codebase against the spec and append remaining work as tasks | "final check", "QA pass" |
| Escalation | Leo thang | Abandoning a change unit and restarting on a higher track. Never a downgrade. | "upgrade", "switch track" |
| Allowed scope | Phạm vi cho phép | Paths a task may modify | "affected files" |
| Forbidden scope | Phạm vi cấm | Paths a task must never modify, even to improve them | "off limits" |
| Characterization test | Test đặc tả hiện trạng | A test that pins existing (possibly undesired) behaviour before changing it — Track B only | "legacy test" |
| Regression suite | Bộ test hồi quy | The suite named by `verification.commands.regression` | "full test" |
| Impact analysis | Phân tích tác động | `specs/<id>/impact-analysis.md`, produced READ-ONLY before any code change | "investigation" |
| Codebase context | Ngữ cảnh mã nguồn | `.sdd/<id>/codebase-context.md`, ≤ 8 KB, hand-curated | "repo summary" |
| Verification contract | Hợp đồng kiểm chứng | `docs/baseline/verification.md` and its ` ```commands ` block | "test config" |
| Stale handoff | Handoff lỗi thời | A handoff whose recorded git SHA no longer matches the artifact (HV013b) | "outdated" |
| Walking skeleton | Bộ khung chạy được | Feature `000`, the thinnest end-to-end slice that exercises the whole stack | "MVP", "POC" |

<!-- Add project-specific domain terms below this line. -->

## Domain terms — Shop Online

Source: `planning-artifacts/prds/prd-sdd-framework-demo-2026-09-18/prd.md` §3, curated
into the baseline on 2026-09-18. Definitions kept in English to match the table above.

**These terms inherit that PRD's open questions.** Three rows below encode a decision that
is still blocking at §11.1 — *Shop owner* ("cannot place an order", Q4), *Customer* (may
cancel their own `placed` order, Q5), and *Anonymisation* (the 12-month policy, Q3). If the
decision-maker answers any of them differently, the row changes with it. Do not treat a
glossary row as ratification.

| Canonical term (EN) | Tiếng Việt | Definition | Do NOT use |
|---|---|---|---|
| Product | Sản phẩm | A sellable item. Has exactly **one** price and **one** stock number. No variants. Belongs to 0..1 category | "item", "SKU", "mặt hàng", "hàng hoá" |
| Category | Danh mục | Flat group used to browse products. No multi-level hierarchy in v1. Contains 0..n products | "tag", "collection", "nhóm hàng", "ngành hàng" |
| Stock | Tồn kho | Integer ≥ 0 attached to a product: the quantity sellable right now. Changes only through order placement, cancellation, or a shop owner adjustment | "inventory", "quantity on hand", "số lượng", "hàng tồn" |
| Cart | Giỏ hàng | The set of cart lines belonging to a session (guest) or a customer. Reserves no stock | "basket", "giỏ" |
| Cart line | Dòng giỏ hàng | A (product, quantity) pair in a cart | "cart item", "món trong giỏ" |
| Order | Đơn hàng | Immutable record of one purchase: order lines, delivery address, payment method, shipping fee, order total, status. Belongs to exactly one customer | "purchase", "transaction", "đơn" |
| Order line | Dòng đơn hàng | A (product, quantity, **price at time of placement**) triple in an order. The price is copied, not referenced — changing a product's price does not change past orders | "order item", "line item", "dòng hàng" |
| Order status | Trạng thái đơn hàng | One of: `placed`, `confirmed`, `shipped`, `delivered`, `cancelled` | "order state", "tình trạng đơn", any state name not in that list |
| Discontinued | Ngừng bán | State of a product no longer sold but still present so past orders remain readable. Hidden from browse and search, cannot be added to a cart. Not a deletion | "deleted", "archived", "inactive", "xoá sản phẩm", "ẩn sản phẩm" |
| Shipping fee | Phí giao hàng | Amount entered by hand by the shop owner per order. Defaults to 0. Added to the order total | "delivery charge", "phí ship", "phí vận chuyển", "cước" |
| Line subtotal | Tổng tiền hàng | Sum of (price × quantity) over all order lines, or over all cart lines. Excludes the shipping fee | "subtotal", "tạm tính", "tiền hàng" |
| Order total | Tổng tiền đơn | Line subtotal + shipping fee. VND, VAT inclusive | "grand total", "tổng cộng", "thành tiền" |
| Payment method | Phương thức thanh toán | `cod` or `bank_transfer`. There is no third value in v1 | "payment type", "hình thức thanh toán", any third method |
| Payment confirmation | Xác nhận thanh toán | The shop owner's act of marking a bank transfer as received. Applies to `bank_transfer` only. Irreversible, and it blocks cancellation | "payment received", "payment verification", "xác nhận chuyển khoản" |
| Guest | Khách chưa đăng ký | A user with no login session. May browse and add to cart; may not place an order | "anonymous user", "visitor", "khách vãng lai", bare "khách" |
| Customer | Khách hàng | A registered, logged-in user. Places orders, views **their own** order history, and cancels their own order while it is `placed` | "user", "buyer", "member", bare "khách" |
| Shop owner | Chủ shop | The single administrator account. Manages products, stock and orders. **Cannot place an order** | "admin", "seller", "merchant", "quản trị viên", "nhân viên" |
| Delivery address | Địa chỉ giao hàng | Recipient name, phone number, address. Entered per order and copied into it. Personal data under Nghị định 13/2023/NĐ-CP | "shipping address", "địa chỉ nhận hàng", "thông tin giao hàng" |
| Anonymisation | Ẩn danh hoá | Irreversible removal of recipient name, phone number and address from an order, keeping the rest | "PII scrubbing", "data deletion", "xoá dữ liệu", "ẩn dữ liệu" |
