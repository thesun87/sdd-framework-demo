---
type: reconcile
pass: ux -> architecture-spine
input:
  - '../../../ux-designs/ux-sdd-framework-demo-2026-09-18/DESIGN.md'
  - '../../../ux-designs/ux-sdd-framework-demo-2026-09-18/EXPERIENCE.md'
  - '../../../ux-designs/ux-sdd-framework-demo-2026-09-18/.memlog.md'
spine: '../ARCHITECTURE-SPINE.md'
date: '2026-09-19'
verdict: 'KHONG DAT — 3 CRITICAL, 7 HIGH. Spine chua cap duong di cho mot so cam ket UX rang buoc cung.'
---

# Reconcile UX → Architecture Spine

**Pham vi cua pass nay.** Day **khong** phai review chat luong spine. Day la mot cau hoi duy nhat:
*cai gi UX doi hoi, ham y, hoac rang buoc — ma spine da im lang bo qua, hoac da chon mot thu
lam no khong xay duoc?*

Quyet dinh kien truc duoc kiem doi chieu: React 19 + Vite 8 SPA · **hai Vite build tach biet**
(storefront / admin) · **gio hang hoan toan o localStorage** · **mot origin sau reverse proxy** ·
**khong SSR** · **font he thong**.

Ket qua: font he thong va mot-origin **tuong thich hoan toan** voi UX. Gio hang localStorage,
SPA khong SSR, va luat huong phu thuoc giua module **pha vo hoac bo trong** mot so be mat UX.

Danh so: `R<n>`. Tag: `[CRITICAL]` = mot be mat/hanh vi UX **khong xay duoc** nhu da viet ·
`[HIGH]` = cam ket UX khong co duong di, se bi hien thuc hoa sai · `[MEDIUM]` = khoang trong
that, se sinh ra quyet dinh khong ai ky · `[LOW]` = nen ghi mot dong.

---

## CRITICAL

### R1 `[CRITICAL]` — Man "Don chua dat duoc": AD-3 khong the san sinh du lieu ma man hinh nay cam ket hien

**UX doi gi** (`EXPERIENCE.md` UJ-6 + IA §"Trang ban hang — 11 surface" + State Patterns):
man hinh phai neu **cu the dong gio hang nao khong du** (so nhieu — "neu cu the dong gio hang
nao khong du va so luong con ban duoc") va, cho **tung dong do**, **so luong con lai chinh xac**:

> · Binh giu nhiet Lock&Lock 500ml — ban dat **2**, con **1**.

**Spine chon gi** (AD-1, AD-3):
- AD-1: tru kho bang `UPDATE ... SET quantity = quantity - :n WHERE ... AND quantity >= :n`,
  **tin hieu duy nhat la so dong bi anh huong = 0**. Cau lenh nay **khong tra ve so ton con lai**.
- AD-3: cac dong xu ly theo `product_id` tang dan, **"bat ky dong nao tru kho that bai thi toan
  bo transaction rollback"**.

**Hai vet ra khong the vuot bang implementation "cho kheo":**

1. **Chi biet duoc mot dong.** Rollback o dong that bai dau tien nghia la server chi biet **mot**
   dong khong du — va la dong co `product_id` nho nhat trong so cac dong thieu, tuc la mot dong
   **ngau nhien ve mat nguoi dung**. UX viet man hinh nay o dang danh sach. Neu gio co 3 dong
   thieu, khach phai quay lai dat don **3 lan** de phat hien het — dung cai vong lap ma UJ-6
   ("nguoi do tu quyet dinh giam so luong hay xoa dong, roi tu dat lai") duoc thiet ke de tranh.
2. **Khong biet duoc con bao nhieu.** `rowCount = 0` khong mang gia tri. De hien "con **1**",
   server phai doc `stock.quantity` **sau** khi rollback (doc trong transaction da rollback la
   vo nghia). Spine khong cap phep, khong mo ta, va AD-1 con cam ro "khong duong nao duoc doc-roi-ghi"
   — mot nguoi xay se doc dong cam do la cam luon ca doc-de-bao-cao, roi bo con so khoi man hinh.

**Ngoai ra:** `Consistency Conventions → Hinh dang loi` chi khai **"mot envelope duy nhat"**.
Man nay can mot payload **co kieu**, mang danh sach dong + so con lai — khong phai mot chuoi loi.
Spine khong co cho cho no.

**Can gi tu spine:** mot AD moi noi ro (a) kiem tra **tat ca** cac dong truoc khi dung —
hoac thu thap moi dong that bai roi moi rollback; (b) duong doc hop phap de lay `available_qty`
cho **rieng** cac dong that bai; (c) day la **ngoai le duy nhat duoc phep lo con so ton kho**
cho Khach hang (xem R4).

---

### R2 `[CRITICAL]` — Khoa chong trung khi Dat don: UX tuyen bo bat buoc, spine khong co khai niem nay

**UX doi gi** (`EXPERIENCE.md` §"Chong bam doi khi dat don", va `A5` trong bang ASSUMPTION):
ba lop, **"ca ba deu bat buoc"**. Lop 2 la mot hop dong server:

> Bieu mau Dat don mang mot **khoa chong trung** sinh khi mo man hinh; gui lai cung khoa do
> **tra ve chinh don hang da tao**, khong tao don hang thu hai.

UX tu ghi no la he qua **bat buoc** cua FR-14 + muc tieu p95 dat don ≤ 1,0 s. Cung nguyen tac
duoc ap cho **Xac nhan thanh toan** va **chuyen trang thai** trong Trang quan tri — ca hai la
hanh dong mot chieu khong thu hoi duoc.

**Spine chon gi:** khong gi ca. AD-3 dam bao *atomicity trong mot request*; no khong noi gi ve
*hai request giong nhau*. `ORDER` trong so do thuc the khong co truong nao cho viec nay,
`Consistency Conventions → Khoa chinh` chi noi ve `order_code`. AD-14 bat moi chuyen trang thai
di qua mot ham, nhung khong noi ham do idempotent.

**Vi sao khong the day xuong "chi tiet schema":** spine tu tuyen bo *"Spine chi co dinh quyen so
huu va bat bien"* — **idempotency la mot bat bien**, khong phai kieu cot. Voi SPA khong SSR,
retry tu tang mang (proxy timeout, nguoi dung tai lai tab, 4G doi song) la binh thuong; khong
co khoa nay thi **tru kho hai lan** — dung dieu FR-14 ton tai de chan.

---

### R3 `[CRITICAL]` — "Don chuyen khoan da xac nhan thanh toan thi khong huy duoc" doi `ordering` doc `payment`, ma luat huong phu thuoc cam dieu do

**UX doi gi:**
- `EXPERIENCE.md` State Patterns → *Don hang khong huy duoc*: "Don hang chuyen khoan **da duoc
  xac nhan thanh toan**: nut huy bien mat **o moi trang thai**".
- Component Patterns → *Nut chuyen trang thai*: voi chuyen khoan **chua** xac nhan thanh toan,
  nut sang **Da xac nhan** **bi khoa kem ly do**, khong bi an (UJ-4 buoc 1, nhac lai o
  Accessibility Floor: "nut bi vo hieu hoa phai noi ly do bang chu").

**Spine chon gi:** so do huong phu thuoc o §Design Paradigm khai `payment --> ordering`, va noi
thang: *"Khong module nao goi nguoc chieu mui ten."* Khong co mui ten `ordering --> payment`.

Nhung AD-14 dat **toan bo luat vong doi** — ke ca FR-24 — vao **mot ham duy nhat trong `ordering`**.
Ham do phai tra loi cau hoi *"don nay da duoc xac nhan thanh toan chua?"* de quyet dinh cho phep
`cancelled` hay khong, va de quyet dinh mo/khoa `confirmed`. **Trang thai xac nhan thanh toan
thuoc `payment`.** Ham o `ordering` **khong duoc phep doc no**.

Ba loi thoat, deu phai do spine chon, khong phai do task chon:
(a) trang thai xac nhan thanh toan thuc ra thuoc `ordering` va `payment` chi la lop nghiep vu →
phai viet ra; (b) `payment` day trang thai xuong `ordering` (inversion) → phai viet ra;
(c) doi mui ten. Spine khong chon cai nao, nen moi task se tu chon mot cai khac nhau.

---

## HIGH

### R4 `[HIGH]` — FR-5 ("khong bao gio lo con so ton kho") khong co bat bien nao bao ve, va AD-10 lam ro ri thanh duong de nhat

**UX doi gi** (`EXPERIENCE.md`, nhac 4 lan):
- Nhan tinh trang ton kho: **"Khong bao gio hien con so"** cho Khach chua dang ky va Khach hang.
- **"Gia tri nay khong duoc cache — ke ca khi phan con lai cua trang duoc cache (FR-5)"**.
- Trang thai Dang tai: **"Nhan tinh trang ton kho khong duoc hien gia tri cu trong luc tai"** —
  o do de trong cho toi khi co du lieu that.
- Anti-pattern: bac bo "chi con 2 san pham!" — con so **khong duoc lo**.

**Spine chon gi:** `Capability → Architecture Map` gan FR-5 cho `catalog ← inventory`, **governed
by AD-2, AD-5**. Ca AD-2 lan AD-5 chi noi ve **quyen so huu bang**, khong mot chu nao ve
**khong duoc serialize con so ra client**. Khong co AD nao cho FR-5.

Hai duong ro ri cu the ma spine dang mo:
1. **AD-10** bat moi hinh dang qua bien HTTP dinh nghia **mot lan** trong `packages/shared`, va
   cam FE khai lai. Trang quan tri **phai** thay con so ton kho that (IA: "thay con so ton kho that").
   Duong it khang cu nhat la **mot** `ProductDto` mang `stock`, dung chung — va no di thang vao
   bundle khach. AD-10 (mot nguon su that) va FR-5 (hai hinh dang khac nhau theo vai tro) **keo
   nguoc nhau**, spine khong phan xu.
2. **AD-16** cho phep ro rang *"Cache ... chay trong tien trinh NestJS"*. UX **cam** cache rieng
   gia tri con/het hang. Khong co ngoai le nao duoc ghi. Mot task toi uu p95 ≤ 400 ms se cache
   dung cai duy nhat khong duoc cache.

### R5 `[HIGH]` — "Phi giao hang — chu shop cap nhat luc 07:42" khong co nguon du lieu nao

**UX doi gi** (`EXPERIENCE.md` §"Song khong co thong bao" quy tac 3; Component Patterns →
*Dau hieu phi giao hang da cap nhat*; UJ-5 buoc 2): dong phi giao hang trong **Chi tiet don hang
cua toi** mang mot dau hieu cap dong **kem thoi diem Chu shop cap nhat**. Day khong phai trang
tri — UX goi no la cach **duy nhat** he thong "de lai dau vet doc duoc" khi khong co kenh gui
(FR-21), va no la ban le cua UJ-5.

**Spine chon gi:**
- `Ghi vet` trong Consistency Conventions liet ke **dung hai** duong: `stock_ledger` va
  `order_status_event`.
- AD-14 ghi `order_status_event` **cho moi lan chuyen trang thai**. Nhung UX va UJ-3 deu chot:
  **nhap phi giao hang KHONG doi trang thai** ("trang thai van la Da dat"). Nen **khong dong nao
  duoc ghi**.
- So do thuc the khong co truong thoi diem nao tren `ORDER` ngoai ngam dinh; AD-12 chi noi phi
  giao hang la mot trong hai duong duoc phep sua don sau khi tao.

=> Man hinh phai hien mot thoi diem **khong ton tai o dau ca**. Can `shipping_fee_updated_at`
(+ tai khoan thuc hien, neu muon nhat quan voi cac ghi vet khac) duoc spine cong nhan la du lieu
**bat buoc**, khong phai "chi tiet schema do code so huu".

### R6 `[HIGH]` — WCAG 2.1 AA: UX goi la rang buoc cung; spine khong co mot chu nao — va SPA vua xoa mat ranh gioi tai trang ma no dua vao

**UX doi gi** (`EXPERIENCE.md` §Accessibility Floor — mo dau bang *"muc nay do phien UX dat ra va
la rang buoc, khong phai mong muon"*). Nhung diem co he qua kien truc that:
- Ban phim di het moi luong; `Esc` luon dong hop thoai; thu tu Tab bam thu tu doc.
- **"Thay doi khong do nguoi dung chu dong gay ra phai duoc thong bao cho trinh doc man hinh"** —
  ke ra dich danh: ket qua tim kiem cap nhat, so luong dong gio hang doi, va **noi dung trang
  "Don chua dat duoc" khi vua mo**.
- Loi bieu mau lien ket voi truong de trinh doc man hinh doc ra khi focus.
- Chu phong 200% van dung duoc; bang cuon ngang trong khung rieng.

**Spine chon gi:** `ARCHITECTURE-SPINE.md` **khong chua tu nao ve accessibility**. Ba he qua:
1. **SPA khong SSR xoa mat ranh gioi tai trang.** Trong SPA, dieu huong route **khong** la mot
   page load — trinh doc man hinh **khong tu thong bao** tieu de trang moi va **khong tu dat lai
   focus**. UX viet "trang rieng Don chua dat duoc" va "thay the muc lich su trinh duyet bang
   Xac nhan don" nhu the do la nhung lan chuyen trang that. Voi SPA, quan ly focus + thong bao
   route la **code phai viet**, va khong AD nao yeu cau no ton tai.
2. **Hai build tach biet = hai lan hien thuc hoa.** AD-9 cam import cheo giua storefront va admin;
   `packages/shared` duoc mo ta **chi** la "schema + type ... cho DTO". Khong co nha cho primitive
   a11y dung chung (dialog focus-trap, live region, lien ket loi ↔ truong). Hai app se lech nhau,
   va Trang quan tri — noi co ba hanh dong mot chieu — la ben de bi bo qua hon.
3. **Khong co cong kiem chung.** `Consistency Conventions → Kiem chung` chot "cac lenh trong
   `docs/baseline/verification.md`, chay nguyen van". Neu file do khong co kiem tra a11y thi
   "san WCAG 2.1 AA" khong co gi chan no truot.

### R7 `[HIGH]` — Hop dong reverse proxy thieu SPA history fallback, ma UX dat dieu huong len URL

**UX doi gi:**
- §Phan trang: **"So trang nam trong duong dan de chia se duoc va de nut Quay lai hoat dong dung."**
- §Giu trang thai khi quay lai (A6): giu so trang + danh muc + tu khoa (storefront), bo loc +
  so trang (admin) khi quay lai.
- IA: *"Moi man hinh truoc Tuong dang ky truy cap duoc ma khong can dang nhap, va truy cap khong
  co phien tra **HTTP 200** — khong redirect sang dang nhap (FR-1, FR-11)."*

**Spine chon gi:** AD-8 va so do trien khai mo ta Caddy la `/` → static, `/admin` → static,
`/api` → NestJS. **Mot static file server, dung nhu the, tra 404 cho moi deep link**
(`/danh-muc/binh-giu-nhiet?trang=3`, `/don-hang/DH-2026-000412`, `/admin/don-hang/123`).
Quy tac rewrite "moi duong khong khop file → `index.html` cua **dung** app" **khong duoc viet ra**,
va voi **hai** bundle no la **hai** quy tac fallback khac nhau phai khong dam len nhau
(`/admin/*` → admin index; con lai → storefront index) — dong thoi khong duoc nuot `/api` va
duong anh san pham (AD-15 phuc vu anh qua chinh proxy nay).

Day la mot dong cau hinh, nhung neu no sai thi **chia se link chet, nut Quay lai chet, va FR-1
"tra 200" chet** — ba cam ket UX cung luc.

### R8 `[HIGH]` — Bang don hang Trang quan tri phai hien "tinh trang xac nhan thanh toan" tren tung dong — cung be tac huong phu thuoc nhu R3, o quy mo danh sach

**UX doi gi** (IA §"Trang quan tri — 12 surface" + Component Patterns → *Bang don hang*):
moi dong mang ma don, thoi diem, ten nguoi nhan, tong tien don, phuong thuc thanh toan, trang thai,
**va voi chuyen khoan them tinh trang xac nhan thanh toan**. Kem phan trang **bat buoc** va bo loc
theo 5 trang thai.

**Spine chon gi:** `ORDER` thuoc `ordering`; xac nhan thanh toan thuoc `payment`; mui ten chi cho
`payment --> ordering`. AD-5 con cam `JOIN` qua bien module o repository. Vay mot trang 24 dong
**da loc va phan trang o phia `ordering`** khong co cach hop phap nao gan them cot cua `payment`
— tru khi FE goi hai lan roi tu ghep, dieu nay pha vo phan trang phia server (khong biet truoc
24 id nao se ra truoc khi truy van) va them mot round trip vao p95 ≤ 400 ms.

Cung goc voi R3, nhung day la **be mat doc**, nen no khong the giai bang "inversion khi ghi".

### R9 `[HIGH]` — So cai ton kho: be mat doi ghep 4 module, spine cam JOIN va so do thuc the tu mau thuan voi luat huong phu thuoc

**UX doi gi** (IA + Component Patterns → *Bang so cai ton kho*, A10): chi doc, **phan trang**,
moi nhat truoc. Moi dong: thoi diem · gia tri truoc → sau · nguyen nhan (don hang duoc dat / don
hang bi huy / dieu chinh tay) · **ma don hang neu co, bam duoc sang Chi tiet don hang** · tai
khoan thuc hien.

**Spine chon gi:**
- AD-2: `stock_ledger` thuoc `inventory`, khong module nao khac cham vao.
- AD-5: **khong `JOIN` qua bien module**, truy cap cheo chi qua service cong khai.
- §Design Paradigm noi thang: **"`inventory` khong biet `ordering` ton tai"**.
- Nhung so do ER lai ve **`ORDER ||--o{ STOCK_LEDGER : "gay ra"`** — tuc la `stock_ledger`
  (thuoc `inventory`) mang mot khoa ngoai tro **nguoc len** `ordering`.

Hai cau tren **mau thuan voi nhau ngay trong spine**, va be mat UX lam no lo ra: mot bang phan
trang can `stock_ledger` (inventory) + ten san pham (catalog) + `order_code` (ordering) + ten tai
khoan (identity), sap xep va phan trang **o tang du lieu**. Khong co quy tac nao cho **read model
vuot bien** trong spine, nen task se hoac lam N+1 (pha p95), hoac `JOIN` len (pha AD-5), hoac bo
cot `order_code` bam duoc (pha UX).

### R10 `[HIGH]` — AD-17 khong chi lam FR-8 rong nghia; no lam **cao trao cua UJ-2** va mot chuoi UI cu the thanh loi noi doi

Spine **da** neu xung dot AD-17 ↔ FR-8 trong §Deferred — tot. Nhung no mo ta hau qua o muc
"FR-8 gan nhu rong nghia". Hau qua **ve phia UX** nang hon va chua duoc ghi o dau:

- **UJ-2 buoc 6 la "cao trao" cua ca hanh trinh:** *"hai dong gio hang duoc **gop nguyen ven**
  vao tai khoan vua tao (FR-8) — khong dong nao mat, so luong khong doi"*.
- **Bien cua UJ-2** yeu cau hanh vi gop **that**: *"anh dang nhap vao mot tai khoan **da co san
  gio hang** → hai gio hang duoc gop, san pham trung **cong don so luong**"*, kem chuoi hien thi
  nguyen van: **"Gio hang tren may nay da duoc gop vao tai khoan cua ban."**
- §Giu trang thai khi quay lai liet ke gio hang la thu **"Giu nguyen tuyet doi"**.

Voi gio chi o `localStorage`, **khong bao gio ton tai "gio hang cua tai khoan"** de gop vao, nen
nhanh bien cua UJ-2 khong xay duoc va cau thong bao tren la mot khang dinh sai. Ngoai ra khach
doi thiet bi (dien thoai → may tinh, dung cai ma UX lo o N9) **mat sach gio** ma khong mot man
hinh nao trong EXPERIENCE.md noi ve viec do.

Yeu cau: khi nguoi curate baseline giai xung dot FR-8, quyet dinh do phai **quay nguoc lai UJ-2
va bang State Patterns**, khong chi sua mot dong FR.

---

## MEDIUM

### R11 `[MEDIUM]` — So dem tren muc danh muc o sidebar: khong chu so huu, khong quy tac tinh, khong quy tac lam moi

**UX doi gi** (`.memlog.md` ghi day la y **duoc lay lai co chu dich** tu anh chuan; `DESIGN.md`
→ `nav-item`; `EXPERIENCE.md` IA + Component Patterns → *Sidebar danh muc*):
- Con so la **so san pham dang ban** cua danh muc do — **dem san pham, khong phai ton kho**.
- San pham **het hang van duoc dem** (vi van hien duoc); san pham **Ngung ban khong duoc dem**.
- **Danh muc rong van hien va mang so `0`**.
- UX tu bien ho: vi dem san pham nen **khong pham FR-5**.

**Spine noi gi:** khong gi ca. Hau qua:
1. **Rui ro FR-5 that.** Khong co dong nao trong spine noi con so nay thuoc `catalog` va **khong
   duoc** lay tu `inventory`. Mot nguoi xay doc "so luong con ban duoc" o cho khac rat de hien
   thuc hoa no thanh "so san pham **con hang**" — **do la lo du lieu ton kho**, dung dieu UX da
   can than tranh.
2. **Chi phi doc.** Sidebar co dinh, xuat hien tren **moi** be mat danh sach cua Trang ban hang.
   Voi 20.000 san pham, day la mot aggregate `COUNT ... GROUP BY category` tren moi lan tai.
   AD-16 cam moi ha tang ngoai tien trinh (khong Redis), AD-11 chi lo index cho tim kiem. Khong
   co quyet dinh nao ve index / materialize / cache trong tien trinh cho con so nay, trong khi
   p95 doc ≤ 400 ms la NFR duoc AD-4 va AD-11 vien dan.
3. **Tuoi du lieu trong SPA.** Sidebar duoc render mot lan roi song suot phien. Khong quy tac nao
   noi khi nao no duoc lay lai. Khac voi nhan ton kho (UX cam cache tuyet doi), o day UX **khong**
   cam cache — nhung cung khong ai quyet dinh, nen no se thanh mot quyet dinh ngam.

### R12 `[MEDIUM]` — Man Gio hang can mot duong doc ma spine khong co: tra ve **ca san pham Ngung ban**

`localStorage` chi giu `product_id` + so luong (AD-17, dung). Nhung man Gio hang phai hien: ten,
gia, tong tien hang, **va ba trang thai canh bao cap dong**: (a) vuot ton kho — **neu so luong
con ban duoc**; (b) **san pham ngung ban** — neu khong mua duoc; (c) binh thuong.

Dieu do doi mot endpoint doc **theo lo id** co hai tinh chat ma cac duong doc storefront khac
**khong duoc phep co**:
- no phai tra ve ca san pham **Ngung ban** (moi duong doc storefront con lai deu loai chung ra),
- no phai tra ve **so luong con ban duoc** cho dong vuot ton — lai cham vao ranh gioi FR-5 o R4,
  va lai la mot ngoai le khong ai ky.

Spine khong mo ta endpoint nay o dau, va `Capability → Architecture Map` gan ca cum FR-6–8 cho
`storefront (localStorage)` — nhu the be mat nay khong can server, trong khi no can.

### R13 `[MEDIUM]` — Design token la mot hop dong cho **ca hai** be mat, nhung hai build tach biet khong co nguon su that chung

`DESIGN.md` noi thang: *"Hai be mat — Trang ban hang va Trang quan tri — **dung chung mot bang
mau**"*, *"Giu chieu cao dieu khien dung 38 / 35px. Hai be mat trong cung mot he nho nhung hang
so nay"*, va frontmatter la mot bang token day du (25 mau, 9 vai tro chu, spacing, 10 component).
Tai lieu tu tuyen bo **no la hop dong**, mock chi minh hoa.

**Spine:** AD-9 cam moi import cheo giua hai app, *"thu dung chung di qua `packages/shared`"* —
nhung `packages/shared` duoc dinh nghia **chi** la "schema + type dung chung — NGUON SU THAT DUY
NHAT cho DTO (AD-10)", va cay nguon khong co package nao khac. Khong co nha cho token/CSS dung
chung => **hai ban token, troi khoi nhau**, va AD-9 (mot quyet dinh dung dan) tra gia bang chinh
tinh nhat quan thi giac ma DESIGN.md ton tai de bao ve. Can mot dong: token o dau, va no la
`packages/*` thu hai hay mot file trong `packages/shared`.

### R14 `[MEDIUM]` — Trang "Khong tim thay" (A9) va 404 cua AD-13 khong cung mot tang

AD-13 (dung, va quan trong): truy cap don cua khach khac tra **404**, khong phai 403. UX A9 dung
**mot trang "Khong tim thay" dung chung** cho san pham khong ton tai va don khong thuoc ve nguoi
dang xem — chuoi: "Khong tim thay don hang."

Voi SPA khong SSR, **tai lieu HTML luon tra 200**; chi loi goi `/api` moi la 404. Neu
`docs/baseline/verification.md` (hoac test cua FR-32) kiem "truy cap URL don cua nguoi khac tra
404", no se **that bai o tang trang** trong khi hanh vi that ra dung. Spine nen noi ro: 404 la
hop dong cua `/api`; tang trang tra 200 + render trang "Khong tim thay". Mot dong, nhung no chan
mot vong tranh cai o luc verify.

### R15 `[MEDIUM]` — Trang thai Ngoai tuyen (A4) doi hanh vi toan app o **ca hai** bundle, spine khong noi gi

UX A4: dai thong bao co dinh — *"Mat ket noi. Tinh trang ton kho tren trang nay co the khong con
dung."* — **moi nut gui bi khoa** cho toi khi co ket noi lai; **khong co hang doi ghi ngoai tuyen**
(UX lap luan: voi FR-14 thi mot hang doi la loi hua he thong khong giu duoc — lap luan nay
**trung khop hoan toan** voi AD-1/AD-3, nen day la thu spine nen **cung co**, khong phai bo qua).
Ban quan tri them: bang dang mo van doc duoc nhung danh dau *"Du lieu tinh den {thoi diem}"*.

Day la mot quy tac cat ngang moi lenh goi ghi, o hai app, khong co nha dung chung (xem R13).
Spine nen it nhat ghi nhan "khong hang doi ghi ngoai tuyen" nhu mot he qua cua AD-1.

### R16 `[MEDIUM]` — Gioi han so lan dang nhap: UX cam ket mot hanh vi cu the, spine khong co co che

UX (State Patterns → Loi): *"Ban da thu dang nhap qua nhieu lan. Ban thu lai sau 15 phut."* —
va **khong khoa tai khoan vinh vien**. Day la mot cam ket **co trang thai**, co thoi han.

AD-16 cam moi phu thuoc ngoai tien trinh (khong Redis). Vay bo dem nam trong bo nho tien trinh
(mat sach moi lan deploy/restart — mot ke tan cong chi can doi mot lan deploy) hoac trong
PostgreSQL (mot bang, mot quyet dinh so huu: `identity`). Spine khong chon, va `identity` trong
cay nguon chi liet ke "account, phien, doi + dat lai mat khau".

### R17 `[MEDIUM]` — p95 ≤ 1,5 s va "phan lon luot khong bao gio thay skeleton" khong duoc kien truc do

UX (State Patterns → Dang tai, A3): skeleton hien sau **300 ms**, va *"muc tieu p95 tai trang
≤ 1,5 s ... nghia la **phan lon luot khong bao gio thay skeleton** — khong thiet ke skeleton nhu
mot man hinh chinh thuc"*.

Spine **da** neu rui ro nay o §Deferred ("Ngan sach kich thuoc bundle ... la cho ngan sach nay
chet") va day xuong `/speckit-plan` — dung tham quyen. Ghi o day vi day la cho **cam ket UX bi
treo**: voi SPA client-render, lan vao dau tien la HTML + bundle JS + it nhat mot round trip API
**truoc khi** co du lieu; tren 4G dien thoai (luu luong chinh theo N9) ngan sach 1,5 s gan nhu
chac chan vo, va khi do skeleton **tro thanh** man hinh chinh thuc — dung dieu UX bao dung thiet
ke cho no. `/speckit-plan` can biet no dang tra loi mot cam ket UX, khong chi mot con so NFR.

### R18 `[MEDIUM]` — AD-9 (y dinh) va AD-10 (co che) keo nguoc nhau, va nan nhan la chinh y dinh UX

AD-9 co mot muc tieu UX rat ro: *"khach khong bao giờ thay Trang quan tri ton tai"* — route, ten
truong, luong nghiep vu khong duoc doc duoc trong DevTools. AD-9 con bac bo lazy chunk vi
*"chunk van nam trong manifest cua bundle khach"* — mot lap luan chat.

Nhung AD-10 bat **moi** hinh dang qua bien HTTP nam trong `packages/shared`, va storefront import
tu do. Cac DTO chi cua Trang quan tri (bang chuyen trang thai, so cai ton kho, thong tin ngan
hang, dat lai mat khau khach) song trong cung package. Tree-shaking **khong** dam bao loai bo
ten truong/enum khi chung duoc dung trong schema runtime (Zod-style) thay vi type thuan. Spine
nen noi: `packages/shared` phan vung theo doi tuong su dung (public / admin-only), va bundle
khach khong duoc import vung admin.

---

## LOW

- **R19 `[LOW]`** — UX chot *"Truy cap `/admin` khong co phien → bieu mau dang nhap Trang quan tri"*.
  Khong tai lieu nao (UX lan spine) noi **phien Khach hang** cham `/admin` thi thay gi. Voi mot
  origin + mot cookie (AD-8), day la mot truong hop that. UX noi khach "khong bao gio thay no ton
  tai" → cau tra loi hop y dinh la 404, khong phai bieu mau dang nhap. Can mot dong.
- **R20 `[LOW]`** — AD-8 chon cookie phien (dung), nhung spine khong noi gi ve CSRF, trong khi UX
  co **ba** hanh dong mot chieu khong thu hoi (Da giao, Xac nhan thanh toan, Xoa danh muc).
  `SameSite=Lax` chan phan lon, nhung "phan lon" khong phai mot quyet dinh duoc ghi.
- **R21 `[LOW]`** — Vai rang buoc hanh vi UX khong co cho bam trong spine, tung cai nho nhung
  deu la luat: tran phan trang 100 va *"yeu cau > 100 xu ly nhu 100, **khong bao loi**"*;
  `order_status_event` phai mang **truoc → sau + thoi diem + tai khoan thuc hien** (AD-14 chi noi
  "ghi mot dong"); anh san pham **bat buoc ≥ 1, anh dau tien la anh dai dien, khong xoa duoc anh
  cuoi**; nut xoa san pham co **hai hanh vi** tuy san pham da tung xuat hien trong don hang chua.

---

## Nhung gi UX doi va spine **da** cap dung — ghi de khong ai di sua lai

- **Font he thong** (`DESIGN.md`: "tai tuc thi, khong ton request nao, dau tieng Viet hien dung"):
  khong xung dot, va con tro cho ngan sach tai trang.
- **Mot origin + cookie httpOnly (AD-8)**: khop voi mo hinh hai be mat cua UX va **manh hon** cai
  UX yeu cau; dac biet no lam "gio hang song qua Tuong dang ky" hoat dong tu nhien.
- **AD-9 hai bundle tach biet**: la hien thuc hoa **dung** y dinh IA cua UX ("khong lien ket nao
  tu Trang ban hang tro toi"), va lap luan bac bo lazy chunk la chinh xac. (Gia phai tra: R13, R18.)
- **AD-13 tra 404 thay vi 403**: khop nguyen van State Patterns → *Khong co quyen*.
- **AD-12 don hang sao chep, khong tham chieu**: do dung ba yeu cau UX cung luc — gia tai thoi
  diem dat, dia chi copy vao don (thay cho so dia chi bi bac bo), va phuong thuc thanh toan chi doc.
- **AD-11 chuan hoa luc ghi**: do dung "tim kiem khop ca khi bo dau" cua UJ-2 o quy mo 20.000 san pham.
- **`Thoi gian`: luu UTC, hien theo `Asia/Ho_Chi_Minh`**; **`Tien`: so nguyen VND** — khop dinh
  dang `330.000 ₫` va moc "07:42, 19/09/2026" cua UJ-5.
- **AD-16 khong ha tang ngoai tien trinh**: trung khop voi lap luan "khong hang doi ghi ngoai
  tuyen" cua UX A4.
- **AD-7 mat khau tam, doi o lan dang nhap ke tiep, huy moi phien**: **vuot** muc UX yeu cau cho
  surface "Dat lai mat khau khach hang", theo huong dung.

## Trang thai cac cau hoi mo cua UX doi voi spine

| UX | Spine xu ly |
|---|---|
| N1 email la dinh danh | **Da nhan** — AD-6 bien no thanh bat bien ("khong bao gio la dia chi gui"). Tot hon UX yeu cau. |
| N2/N3 dat lai mat khau + ma tran quyen | **Da nhan** — AD-7 + Deferred ("ma tran ... 15 dong, phai thanh 16"). |
| N4 khach tu huy don (FR-17) | **Da nhan** — Deferred, chan o PRD Q5. |
| N5 chu shop dat don ho | **Da nhan** — Deferred, chan o PRD Q4. |
| N6 an danh hoa 12 thang | **Da nhan** — Deferred, chan o PRD Q3; spine con them mot canh bao rieng ve `account.email`. |
| N7 phi giao hang doi sau khi dat | **CHUA** — xem **R5**: spine de o Deferred ve mat *quyet dinh*, nhung khong cap *du lieu* cho dau hieu cap dong ma UX da chot. |
| N8 don chuyen khoan da xac nhan thi ket | **CHUA** — xem **R3**: khong co duong hop phap de `ordering` biet dieu do. |
| N9 desktop-first vs khach dung dien thoai | **Da nhan mot nua** — Deferred (ngan sach bundle, OG preview). Xem **R17**. |
| N10 5 thuat ngu chua co trong glossary | **CHUA** — spine bat moi dinh danh phai co trong `docs/baseline/glossary.md` (`Consistency Conventions`, `CLAUDE.md §4`) va **Trang ban hang / Trang quan tri / Tuong dang ky / Dat don / Xac nhan don deu chua co dong nao**. Spine se tu chan chinh no o task dau tien. Nen dua vao Deferred canh ba muc con lai. |
| A5 khoa chong trung | **CHUA** — xem **R2**, muc CRITICAL. |
| A4 ngoai tuyen · A6 giu trang thai · A9 trang 404 · A12 a11y | **CHUA** — R15 · R7 · R14 · R6. |
