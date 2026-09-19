---
title: "PRD Quality Review — Shop Online"
status: review
created: 2026-09-18
reviewed_artifact: prd.md + addendum.md (prd-sdd-framework-demo-2026-09-18)
---

# PRD Quality Review — Shop Online

Calibration for this review: stakes are a demo / protocol reference run for the three-track
Agentic SDD process, not a commercial launch. Vietnamese is a deliberate output-language choice
(`.memlog.md`) and is not treated as a finding. Skipped market research and the unresolved
build-vs-buy question are judged on the honesty of their disclosure, not on their absence.
Downstream consumer is Spec Kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks`),
so done-ness clarity and downstream usability carry the most weight.

## Overall verdict

This is a genuinely good PRD: it has a thesis it names out loud ("tồn kho chính xác tại thời điểm
đặt đơn", §1, "Nếu chỉ một yêu cầu trong tài liệu này được giữ khi mọi thứ khác phải cắt, đó là
FR-14"), a non-goals list that does real load-bearing work, counter-metrics that name what must
*not* be optimised, and an addendum that records rejected alternatives so nobody re-proposes them
at review. Traceability upstream is clean — all eight of the brief addendum's open questions are
either resolved in an FR or carried forward with a `(Carry-over: …)` marker, and the two deltas
from discovery's permission matrix are declared rather than smuggled in (§5).

What is at risk is downstream execution, not the thinking. The order lifecycle has two unhandled
money/stock consequences the PRD never names — cancelling a `shipped` order restocks goods already
dispatched (FR-18), and cancelling a `bank_transfer` order whose payment was confirmed (FR-24)
leaves money in the shop's account with refunds deferred to v2 — and both corrode the exact
invariant §1 stakes the product on. Authentication is the one FR cluster Spec Kit cannot specify
end to end: no password-recovery FR exists, the login identifier is undecided, and §8 carries no
session or rate-limiting bound at all.

Fix the three `high` findings before `/speckit-specify` and this PRD will drive Spec Kit honestly.
Ship it as-is and the spec phase will silently invent answers in precisely the places the product
is most sensitive.

---

## Decision-readiness — strong

Decisions read as decisions. §4.3 does not say the cart "balances" reservation against simplicity —
it says "Giỏ hàng là bản nháp, không phải lời hứa… đó là lựa chọn có chủ ý", names what reservation
would have cost ("khoá hàng cho những giỏ bị bỏ quên, và đẩy bài toán sang việc phải hết hạn giữ
chỗ"), and points at the requirement that carries the burden instead (FR-14). The shipping-fee
problem in §4.7 is the best example in the document: the tension is stated plainly ("nó làm tổng
tiền thay đổi sau lưng khách"), the obvious fix (a new `awaiting_customer_approval` state) is
recorded as considered-and-rejected in addendum §3 with its cost, and the chosen answer is defended
on a property a reader can check — zero new states, customer keeps the cancel right.

The three `[NOTE FOR PM]` callouts sit at real tensions, not safe checkpoints: FR-17 (a permission
that discovery never granted), §4.7 (the customer may never learn the shipping fee), §7.2 (email/SMS
called "mục nặng nề nhất trong danh sách"). The Open Questions in §11 are mostly genuinely open —
Q2 (no business metric), Q7 (desktop-first vs. mobile reality), Q8, Q9, Q10 have no answer hiding
in the next sentence. Q1 discloses the skipped research without hedging: "Chưa chạy nghiên cứu thị
trường — cố ý bỏ qua cho bản demo này. PRD không đưa ra tuyên bố cạnh tranh nào." That is the
honest form of that disclosure, and addendum §7 repeats it rather than letting it "im lặng biến mất".

### Findings

- **medium** Desktop-first is asserted as settled where downstream will read it, and questioned only
  where downstream will not (§7.1 vs §11 Q7) — §7.1 lists "web responsive, ưu tiên desktop, một bề
  mặt duy nhất" as in-scope with no provisional marker, while §11 Q7 and addendum §5 both record
  that the brief's own input says customers arrive from Facebook/Zalo, "gần như chắc chắn là điện
  thoại". Q7 is not marked `[CHẶN]`, so `/speckit-plan` will read §7.1 and plan a desktop-first
  surface against a mobile-dominant audience. *Fix:* tag the form-factor line in §7.1 with
  `[ASSUMPTION: desktop-first chưa đối chiếu với thực tế kênh khách đến]` and index it in §12, or
  promote Q7 to `[CHẶN]` — the choice is cheap now and expensive after `/speckit-tasks`.
- **low** Two of the three `[CHẶN]` questions are ratification requests, not open decisions — §11 Q4
  (owner placing orders) is already answered by §5 "§5 giữ nguyên 'không'", and Q5 (FR-17) is already
  written as a complete FR with a permission-matrix row, an SM (SM-5) and a UJ (UJ-5). This is honest,
  but the decision-maker cannot see the blast radius of answering "no". *Fix:* one line under each
  naming what unwinds — for Q5: FR-17, FR-18's "bất kể ai huỷ" clause, §5 row 6, §7.1, SM-5, UJ-5.

---

## Substance over theater — strong

Three personas, and each drives a decision the PRD would not otherwise make. "Khách chưa đăng ký"
is not decoration: it produces the deliberately-late registration wall (FR-11) and the cart-merge
requirement (FR-8), and §2.2 spends four bullets on *non*-users — staff, second seller, B2B,
non-Vietnamese-speakers — which is the harder half and the half most PRDs skip.

The Vision in §1 could not be swapped into another PRD. "Hôm nay chủ shop nằm trên đường găng của
từng đơn hàng — khách nhắn lúc 10 giờ đêm, không có gì xảy ra cho tới khi chủ shop đọc tin" is this
shop's problem, and the mechanism claim that follows — "một hệ thống ghi nhận duy nhất, do chính
giao dịch viết ra thay vì được gõ lại sau đó" — is an argument, not a slogan.

No innovation theater: the PRD makes zero novelty claims, consistent with the brief's admission that
"nothing about the technology is novel", and §11 Q1 keeps that position. NFRs are not boilerplate —
every number in §8 traces to `docs/discovery/README.md`, is labelled "mục tiêu đặt ra, không phải số
đo được", and is bound to specific FRs in a third table column. The 5 orders/minute figure is given a
reason for existing rather than just a value: "nó phải đúng dưới tải đồng thời, và tăng gấp 10 lần
quy mô ở Y3 phải không phá được nó."

The counter-metrics (SM-C1, SM-C2) are the strongest single passage in the document. "Đơn bị từ chối
vì hết hàng là hệ thống làm đúng việc của nó, không phải một thất bại cần tối ưu" pre-empts the exact
pressure that would otherwise destroy FR-14 six months in. Most PRDs at any stakes level do not have
this.

*No findings.*

---

## Strategic coherence — strong

There is one bet and everything serves it. §1 states it ("Cam kết thiết kế quan trọng nhất… tồn kho
chính xác tại thời điểm đặt đơn"), names the requirement that carries it (FR-14), and §2.3 gives it
a dedicated user journey — UJ-6 is subtitled "hành trình mà cả sản phẩm này tồn tại vì nó". §4.3's
no-reservation decision, §4.5's all-or-nothing rejection, FR-15's decrement, FR-18's restock, FR-27's
ledger and SM-1 are one chain, not six features. Scope kind is coherently problem-solving: §7.2 gives
every exclusion a *reason* rather than a schedule, and several name the condition that would reopen
them ("→ v2, khi khối lượng chuyển khoản làm việc xác nhận tay thành nút thắt mới").

Metrics mostly validate the thesis rather than measuring activity — SM-1 is the thesis stated as a
number, and SM-4 is explicitly a baseline-only measure of "phần thời gian chủ shop vẫn còn nằm trên
đường găng", which is the right thing to watch. The weakness is that two of the three *primary* SMs
do not survive contact with how they would actually be computed.

### Findings

- **medium** SM-2 cannot be measured by the system it claims to be measured from (§10). §10 opens
  "Mọi chỉ số đều đo được từ chính hệ thống, không cần khảo sát", but SM-2's stated measurement is
  "hệ thống không có đường nào để làm việc đó" — that is a design property, not a measurement.
  Orders re-keyed into a spreadsheet by definition live outside the system and are invisible to it,
  so SM-2 will read 100% even in the failure case it exists to detect. *Fix:* either restate SM-2 as
  an invariant under §8 ("không có đường nhập đơn nào ngoài FR-14") rather than a success metric, or
  give it a measurement that can fail — e.g. a periodic owner attestation, or order-count
  reconciliation against the shop's own revenue record.
- **medium** SM-3's denominator is undefined and its numerator is close to vacuous (§10). "≥ 95% đơn
  hàng đi từ `placed` tới `delivered` mà không có bất kỳ sửa đổi nào ngoài chuyển trạng thái và nhập
  phí giao hàng" — no FR in §4 permits any other modification to an order, so the only way an order
  fails this metric is by not reaching `delivered` at all, which makes SM-3 a cancellation-rate
  measure wearing a different name. It is also unclear whether cancelled orders are in the
  denominator. *Fix:* state the denominator explicitly (all orders placed in the period, or only
  non-cancelled ones) and either name a concrete "modification" the system can record, or fold SM-3
  into SM-4 and drop the 95% target.

---

## Done-ness clarity — adequate

Structurally this dimension is handled better than most PRDs manage: every FR carries a **Hệ quả
kiểm chứng được** block, and the majority of those consequences are genuinely testable rather than
adjectival. FR-14's "với tồn kho = 1 và hai yêu cầu đặt đơn đồng thời cho cùng sản phẩm đó: **đúng
một** đơn được tạo… tồn kho kết thúc ở 0 — không bao giờ ở -1" is a test, not a wish, and addendum §1
even supplies the acceptance condition for it ("N tiến trình cùng đặt đơn cho một sản phẩm có tồn kho
M, và số đơn thành công phải bằng đúng M"). HTTP status codes are specified where behaviour is
contested (401 at FR-11, 409 at FR-16/FR-19/FR-20/FR-24, 404-not-403 at FR-32), performance
thresholds are attached to the specific FRs that must meet them (FR-3, FR-14, FR-29), and §8's four
"bất biến xuyên suốt" tell the test author what must never be true. There is almost no "graceful",
"reasonable" or "user-friendly" anywhere.

What pulls this down to *adequate* is not vagueness — it is absence at three places where the product
is most sensitive, plus a handful of consequences left to the implementer's discretion. The lifecycle
in §4.6 is drawn as a five-state diagram and then given only the transitions the PRD found
interesting; the two cancel-from-late-state paths it legalises are never followed through to their
stock and money consequences. And the authentication cluster (§4.4) is the one area where the FR set
is knowingly incomplete: the PRD says so honestly in §11 Q9–Q10 and addendum §6, but Spec Kit will
still hit a wall there.

### Findings

- **high** Cancelling a `shipped` order restocks goods that have already left the shop (FR-18, §4.6).
  §4.6's diagram legalises `shipped → cancelled`, and FR-18 states restock "Áp dụng cho mọi trạng
  thái huỷ được, bất kể ai huỷ (chủ shop hay khách hàng)" with no exception. The result is a stock
  number that counts inventory in transit as sellable — which directly corrupts "tồn kho chính xác
  tại thời điểm đặt đơn" (§1), the one commitment the PRD says it would keep over everything else.
  §7.2 defers "quy trình trả hàng và hoàn tiền" to v2, so the goods have no modelled way back.
  Neither the PRD nor addendum §3 names this. *Fix:* either restrict automatic restock to
  `placed → cancelled` and `confirmed → cancelled` and require an explicit FR-27
  `manual_adjustment` for the `shipped` case, or remove `shipped → cancelled` from the diagram
  and say cancellation after dispatch is a v2 return. Both are one-paragraph changes; leaving it
  implicit is not.
- **high** No refund path for a `bank_transfer` order that was paid and then cancelled (FR-24,
  §4.6, §7.2). FR-24 makes the system record that the owner received money; §4.6 permits
  `confirmed → cancelled`; §7.2 defers refunds to v2. The combination leaves a real, reachable state
  — customer's money in the shop's account, order dead, system silent — and it is not listed as a
  non-goal, not flagged `[NOTE FOR PM]`, and not in §11. UJ-4's edge case covers only the opposite
  case (money never arrives). *Fix:* add a consequence to FR-24 or FR-18 requiring the order to
  record that a confirmed payment exists at cancellation time (so the owner can refund out of band),
  and add an explicit non-goal line in §7.2: "hoàn tiền cho đơn đã xác nhận thanh toán được xử lý
  ngoài hệ thống ở v1."
- **high** Authentication cannot be specified end to end from this PRD (§4.4, §11 Q9–Q10, addendum
  §6). There is no FR for password recovery at all, and the login identifier is still a choice
  between phone and email (FR-9 `[ASSUMPTION]`). Addendum §6 lays out three options and concludes
  "Không lựa chọn nào là hiển nhiên. Cần người quyết định chọn trước `/speckit-specify`" — correct,
  and honestly recorded, but §11 Q9 and Q10 are *not* marked `[CHẶN]` while §11's own rule is that
  `[CHẶN]` means "phải trả lời trước khi đóng băng baseline". An identifier choice determines the
  account data model, which is frozen. *Fix:* mark Q9 and Q10 `[CHẶN]`, and state in §4.4 that the
  FR set for this capability is knowingly incomplete so `/speckit-specify` does not treat FR-9–FR-11
  as the whole story.
- **medium** No bound anywhere on session lifetime, login rate-limiting or account lockout (§4.4 FR-10,
  §8, §9). §8 has no security subsection; §9.1's constraints cover personal data, card data, VND/VAT
  and stack freedom, and nothing else. FR-10's only security consequence is "Mật khẩu không bao giờ
  được lưu ở dạng có thể đọc lại được". For a system holding NĐ 13/2023/NĐ-CP personal data behind a
  phone-number login, this is the one NFR family that is missing rather than deliberately deferred —
  §7.2 excludes nothing of the sort, so a reader cannot tell whether it is out of scope or forgotten.
  *Fix:* three bullets in §8 — session expiry, failed-login throttling, and whether the owner's
  back-office session has a shorter lifetime than a customer's.
- **medium** FR-6 does not say whether a cart line quantity may exceed current stock. FR-5 gates
  add-to-cart only on stock > 0, FR-7 explicitly refuses reservation, and FR-6's consequences cover
  merging, zeroing and negatives but not the stock ceiling. So a customer can put 100 of a 3-stock
  item in the cart and discover it only at FR-14. That may well be the intended behaviour — it is
  consistent with §4.3's philosophy — but the implementer has to guess, and the guess changes the
  UX of the "khoảnh khắc UX nặng nhất" addendum §5 identifies. *Fix:* one consequence line in FR-6
  stating the choice either way.
- **medium** Products discontinued or repriced while sitting in a cart are unspecified (FR-25, FR-6,
  FR-14). FR-25 says "Sản phẩm ngừng bán không xuất hiện khi duyệt hay tìm kiếm, và không thêm được
  vào giỏ" — but says nothing about carts that already hold one, and FR-14 has no consequence for a
  discontinued line. The same gap applies to price: FR-14 copies the price at placement, so a cart
  showing "tổng tiền hàng" can differ from the order total, and no FR requires the customer be shown
  the change. *Fix:* add consequences to FR-14 for both cases — reject-with-named-line for
  discontinued products (reusing FR-14's existing out-of-stock rejection shape), and state whether a
  price change between cart and placement must be surfaced.
- **medium** Two consequences are bounded by adjectives in an otherwise numeric PRD. FR-3: "Kích
  thước trang mặc định cố định và có giới hạn trên" — no default, no ceiling. FR-28: "Định dạng và
  dung lượng tối đa được giới hạn và thực thi ở phía máy chủ" — no formats, no size. Everywhere else
  the PRD gives a number (400 ms, 1,0 s, 20.000, 300.000), so these two read as unfinished rather
  than deliberately deferred to architecture. *Fix:* name a default page size and cap, and name the
  accepted image formats and a maximum byte size.
- **low** FR-17 and FR-32 disagree on the status code for the same class of access. FR-17: "Huỷ đơn
  của người khác → HTTP 403 hoặc 404, và không tiết lộ đơn đó có tồn tại hay không." FR-32: "→ HTTP
  404 (không phải 403 — không tiết lộ đơn có tồn tại)." §8 lists cross-customer isolation as an
  invariant that must have a protecting test; an either/or makes that test ambiguous, and 403 leaks
  existence, which is exactly what both FRs say they want to avoid. *Fix:* delete "403 hoặc" from
  FR-17.

---

## Scope honesty — strong

Omissions are stated, not inferred. §6 opens by refusing the usual framing — "Đây không phải danh
sách việc chưa làm. Mỗi mục là một quyết định đã chốt" — and §7.2 gives each exclusion a reason
column rather than a date. The strongest move in the document is §6's treatment of the payment
gateway exclusion as a *security property*: "Hệ thống không bao giờ chạm vào dữ liệu thẻ… nó mất đi
ngay khi danh sách loại trừ bị phá vỡ." That tells a future reader what the out-list is protecting,
which is what makes an out-list hold.

Inference is tagged where it happens. Thirteen inline `[ASSUMPTION]` tags sit on exactly the things
discovery did not supply (search diacritics, out-of-stock display, login identifier, address
pre-fill, image requirement, admin account origin), each one naming *why* the PRD chose what it
chose rather than just flagging uncertainty. §9.3's anonymisation policy is the model case: the PRD
proposes a concrete 12-month rule, then immediately says "Chính sách này do PRD đề xuất, không phải
điều discovery đã chốt… Chưa có tư vấn pháp lý", and escalates it to `[CHẶN]` because it freezes the
order data model. §12 ends by listing what it inherited and could not fix — "không có số liệu về chi
phí hiện trạng… không có lý do build-vs-buy; không có nghiên cứu thị trường. Cả ba đều được nêu
nguyên trạng ở đây chứ không bị lấp bằng phỏng đoán" — which is the right way to close.

The permission-matrix delta handling deserves specific credit: §5 does not quietly add the
customer-cancel row, it flags it in bold, explains it, points at `.memlog.md`, carries a
`[NOTE FOR PM]` at FR-17, and raises it as `[CHẶN]` Q5 because the matrix is frozen. That is four
separate places, all consistent.

### Findings

- **low** Open-items density is 13 inline `[ASSUMPTION]` + 10 Open Questions + 3 `[NOTE FOR PM]` = 26
  open items against 33 FRs. For a demo / reference run this is fine and arguably correct — the three
  `[CHẶN]` markers are on the right items (anonymisation, owner-placed orders, customer cancel). It
  is worth stating explicitly in §0 or §11 that this density is a deliberate consequence of the
  agreed stakes, so a later reader does not mistake it for an unready PRD. *Fix:* one sentence in
  §11's preamble.

---

## Downstream usability — adequate

The scaffolding Spec Kit needs is there. FR-1…FR-33 are contiguous and unique; UJ-1…UJ-6 and
SM-1…SM-5 plus SM-C1/SM-C2 likewise; every `FR-n` cross-reference in the document resolves to a real
heading. Traceability runs both ways — feature groups and individual FRs cite the UJs they serve
("Thực hiện UJ-1, UJ-6"), and UJs cite the FRs that make them work (FR-8 in UJ-2, FR-24 in UJ-4,
FR-14 in UJ-6). Sections survive being pulled out alone: §5's matrix cites FR ids rather than "see
above", §8 binds each NFR to FRs in a dedicated column, §10 names the FRs each SM validates.
Upstream traceability is unusually clean — all eight of the brief addendum's §1 questions are
accounted for (Q1→§11 Q1, Q2/Q3→§11 Q2, Q4→§11 Q6, Q5→§9.3 + §11 Q3, Q6→resolved in FR-8,
Q7→§11 Q4, Q8→resolved in FR-18/FR-19/FR-24), and §8's numbers match
`docs/discovery/README.md` exactly.

What holds it at *adequate* is that the PRD introduces two concepts in passing that exist nowhere
else in the document, and leaves two load-bearing domain nouns out of the glossary that §3 itself
declares must be exhaustive. Each is small; together they are the class of thing `/speckit-specify`
resolves by inventing something.

### Findings

- **medium** "Danh mục đang hoạt động" (FR-1) implies a category active/inactive state that exists
  nowhere else. FR-1's first consequence is "Danh sách danh mục hiển thị mọi danh mục đang hoạt
  động", but FR-26 defines only create / rename / delete, §3's Danh mục entry has no state, and §5
  has no permission for changing one. Spec Kit will either invent a status field on Category or drop
  the qualifier — and the two produce different data models in a baseline that gets frozen.
  *Fix:* delete "đang hoạt động" from FR-1, or add the state to §3 and a consequence to FR-26.
- **medium** FR-5 cross-references a §8 that does not exist as described. "Tình trạng phản ánh con số
  tồn kho hiện tại, không phải giá trị cache quá thời hạn ở §8" — §8 contains performance, scale,
  reliability and invariants, and says nothing about caching or staleness bounds. This is a broken
  reference on the stock-display consequence of the product's central invariant, so it is the one
  place a dangling pointer actually costs something. *Fix:* either add a staleness bound to §8 (e.g.
  stock availability is read through, never cached) or rewrite FR-5's consequence to state the
  requirement directly without the reference.
- **low** Two load-bearing domain nouns are missing from §3, which declares itself binding ("Mọi FR,
  UJ, SM dùng đúng các từ này; đưa từ đồng nghĩa vào bất cứ đâu trong PRD là vi phạm kỷ luật tài
  liệu"). **"Tổng tiền hàng"** is a money field used in FR-6, FR-20, FR-21, FR-30 and FR-31 and is
  defined only implicitly, inside the *Tổng tiền đơn* entry. **"Ngừng bán"** is a product state used
  three times in FR-25 with browse, search and cart consequences, and appears in no glossary row.
  Both need to be copied into `docs/baseline/glossary.md` at freeze, per §3's own instruction.
  *Fix:* two rows in §3.
- **low** §5 is declared the frozen authz model but covers 16 of 33 FRs, and grants the owner a
  capability with no terminus. Row "Thêm vào giỏ hàng (FR-6) — Chủ shop ✓" coexists with FR-33's
  "Tài khoản chủ shop **không** đặt đơn được", so the owner may fill a cart they can never check out.
  FR-9/FR-10 (registration, login), FR-21 (customer sees updated total), FR-23 (transfer
  instructions) and FR-31's detail view have no rows at all. Because the matrix freezes, its gaps
  freeze too. *Fix:* either set the owner's FR-6 cell to "—" or footnote why it is "✓", and add rows
  for the authenticated-customer capabilities currently missing.

---

## Shape fit — strong

The shape matches the product. This is a two-sided system — a consumer storefront plus a
single-operator back office — so user journeys with named protagonists are load-bearing rather than
overhead, and §2.3 delivers exactly that: Chị Hằng, Anh Minh and Chị Lan each carry their context
inline ("đã mua ở shop này vài lần qua Zalo", "chưa từng mua ở đây, đến từ một bài Facebook", "chủ
shop, làm một mình"). Six UJs for 33 FRs is the right density — enough to cover both surfaces and the
one concurrency scenario the product exists for, not so many that they become a parallel
requirements list. Four of the six carry an explicit **Trường hợp biên**, which is where the UJ form
earns its keep.

Depth is calibrated for a greenfield chain-top PRD: §0 states its own boundary ("Nó mô tả **năng
lực**, không mô tả cách hiện thực: không có lựa chọn công nghệ, không có thiết kế bảng dữ liệu")
and holds it — mechanism discussion is pushed to `addendum.md`, correctly addressed at
`bmad-architecture` ("Đích đến: tài liệu kiến trúc") rather than left in the main line. The
addendum's "Khuynh hướng, không phải quyết định" framing on the oversell mechanisms is exactly right
for a PRD feeding an architecture phase: it stops the architect re-deriving four options from
scratch without pre-empting their decision. §0 also correctly identifies itself as a BMAD draft to
be curated into `docs/baseline/prd.md` at freeze (protocol §A9).

### Findings

- **low** The PRD is roughly three times its agreed depth. `.memlog.md` records "target depth ~5-8
  pages"; `prd.md` is ~9,700 words (~20+ pages) plus a ~1,800-word addendum. Most of the excess is
  the **Hệ quả kiểm chứng được** blocks, which is the part Spec Kit actually consumes, so the
  overshoot buys real downstream value rather than padding. Worth recording rather than fixing — but
  for a protocol reference run, the gap between the agreed calibration and the produced artifact is
  itself a data point about how `bmad-prd` behaves at these stakes. *Fix:* none needed to the PRD;
  note the deviation in `.memlog.md` so the protocol retrospective sees it.

---

## Mechanical notes

- **ID continuity — clean.** FR-1 … FR-33 contiguous, unique, no gaps or duplicates. UJ-1 … UJ-6,
  SM-1 … SM-5, SM-C1, SM-C2. Every `FR-n` cited in §2.3, §5, §8, §10 and the addendum resolves to a
  real `#### FR-n` heading.
- **Assumptions Index roundtrip — one one-way entry.** 13 inline `[ASSUMPTION]` tags; §12 lists 14
  rows. The extra row is "§1, §11 Q6 — Lộ trình sau v1 là suy đoán của brief, không phải ý định đã
  nêu", which has no inline tag anywhere: §1 carries no `[ASSUMPTION]`, and §1 does not in fact
  contain the post-v1 roadmap (it lives in the brief's §Vision). Either drop the §1 reference and
  cite the brief, or tag the claim inline where it is made.
- **Glossary drift — two omissions, no synonym drift.** "Tổng tiền hàng" and "ngừng bán" are used
  across multiple FRs without §3 entries (see Downstream usability). Against that, actual synonym
  drift is absent: "khách chưa đăng ký", "khách hàng" and "chủ shop" are used identically in §2,
  §4, §5, §8, §10 with no slippage into "guest"/"user"/"admin", and the five order statuses appear
  only in their backticked canonical forms.
- **Broken cross-reference — one.** FR-5 → "§8" for a cache staleness bound §8 does not define.
- **Internal inconsistency — one.** FR-17 "403 hoặc 404" vs FR-32 "404 (không phải 403)".
- **Undefined concept introduced in passing — one.** "Danh mục đang hoạt động" (FR-1).
- **UJ protagonist naming — clean.** All six UJs name a protagonist and carry their context inline;
  UJ-6 deliberately shares two (Chị Hằng and Anh Minh) because the journey is about contention, and
  states why.
- **Required sections — all present for a Track A chain-top PRD at these stakes.** Vision, users and
  non-users, UJs, glossary, features with FRs, authz matrix, non-goals, MVP scope in/out, NFRs,
  constraints and data governance, success metrics with counter-metrics, open questions, assumptions
  index. The `nfr-catalog.md` that the brief addendum §2 named as its destination was folded into §8
  instead; that is a reasonable call at this depth, but the brief's pointer now dangles.
- **Upstream traceability — verified clean.** §8's numbers match `docs/discovery/README.md` exactly;
  discovery's scope-OUT list is fully carried into §7.2 with reasons added; the two deviations from
  discovery's permission matrix are declared in §5 rather than smuggled; all eight brief-addendum
  open questions are resolved or carried with explicit `(Carry-over: …)` markers.

---

## Finding counts

| Severity | Count |
|---|---|
| critical | 0 |
| high | 3 |
| medium | 8 |
| low | 5 |
| **Total** | **16** |

All three `high` findings are in **Done-ness clarity** and should be closed before
`/speckit-specify`.
