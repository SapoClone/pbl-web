# E2E flows of the tenant web app

One spec file per section below, run in this order against the real local backend (docker compose stack behind the
KrakenD gateway). Every test is recorded on video; the HTML report (`npm run report`) lists them by these titles.
UI texts, labels and API calls are in [UI-INVENTORY.md](UI-INVENTORY.md). Test data is in `support/data.ts`: a coffee
shop "Cửa hàng Cà Phê Hạt Mộc" with named people and products. Never inline a name, SKU or price in a spec: add it to
`data.ts` and import it.

## Rules for every spec

1. **The flow is the requirement.** Each test is one user goal, from start to the visible end result, written as
   `step("…", async () => {…})` calls in plain Vietnamese or English that read like a script. The step title is
   burned into the video as a caption.
2. **Assert what a person would check**: a row appears, a number changes, a status label changes, an error message
   shows, the data is still there after `page.reload()`. A test that only clicks and asserts nothing is wrong.
   Prove persistence with a reload for every create/edit/delete.
3. **Exact numbers.** Stock, totals and change are computed from `data.ts` constants, not read back from the page and
   compared with themselves.
4. **Negative paths are flows too**: the validation message, the server's refusal, the empty state.
5. **No sleeping.** Use web-first assertions (`expect(locator).toBeVisible()`, `expect.poll`). For data that arrives
   through events (reports, overview, stock after a sale) use `expect.poll` with a reload and a generous timeout.
6. **Selectors**: role and accessible name or visible text from UI-INVENTORY.md; never CSS classes. The app has
   almost no `data-testid`; do not edit the app to add some without telling the reviewer.
7. **Setup through the API** (`support/api.ts`) only for things that are not the subject of the flow. The thing under
   test is always done through the UI.
8. **Each spec is independent of the others' UI but not of their data**: it may rely on data created by an earlier
   spec in this list (named in "Needs"), nothing else. It must not break data a later spec needs (see "Leaves").
9. Browser dialogs (`confirm`, `prompt`) are handled with `page.once("dialog", …)` before the click.
10. Use `asOwner()` from `support/fixtures.ts` (the session saved by spec 01) except where the flow is about signing in.
11. If a flow cannot work because the backend or the UI lacks the feature, do **not** fake it: `test.fixme(true, "why")`
    with the reason, and say so in your report.

## 01 — Sign-up, store creation and sign-in  (`tests/01-auth-and-onboarding.spec.ts`)

Needs: nothing. Leaves: the owner account, the store, and `.auth/owner.json` (a signed-in session).

- F01.1 A visitor who is not signed in opens /orders and is sent to the sign-in page.
- F01.2 Registration refuses a wrong confirmation ("Mật khẩu xác nhận không khớp.") and a password with characters the
  server does not allow, and shows no account was created.
- F01.3 The owner registers (Nguyễn Minh Anh) and, with no store yet, lands on "Tạo cửa hàng của bạn".
- F01.4 The access-code field cleans what is typed (upper case and spaces become lower case and "-", other characters
  are dropped); the owner creates "Cửa hàng Cà Phê Hạt Mộc" and lands on the overview; the sidebar store card shows the
  store name, "Gói …" and "1 chi nhánh". The session is saved as `.auth/owner.json`.
- F01.5 Sign out from the sidebar returns to sign-in, and /products now redirects to sign-in.
- F01.6 Signing in with a wrong password shows the error and stays on the page.
- F01.7 Signing in with the right password opens the overview with the same store.
- F01.8 "Quên mật khẩu?" → the neutral confirmation message, whatever the email.

## 02 — Store settings, branches and plan  (`tests/02-settings-and-plan.spec.ts`)

Needs: 01. Leaves: store phone/address changed (new values in `store.newPhone/newAddress`), one branch.

- F02.1 The owner edits phone and address under "Thông tin cửa hàng", saves, reloads: the new values are still there;
  the access code field is read-only.
- F02.2 Invalid phone is refused by the form (nothing saved).
- F02.3 "Gói dịch vụ" shows the current plan (the badge "Đang dùng: …"), the plan card tagged "Gói hiện tại", and the
  usage lines (branches 1, users 1) against the plan's limits; it says plan changes are done by the system admin.
- F02.4 The branch list shows the one branch created with the store. Editing its address persists after reload.
- F02.5 Adding a second branch on the Free plan (limit: 1 branch) is refused: an error is shown and the list still has
  one branch. (The local Free plan allows 1 branch and 3 users. If the stack's Free plan differs, `test.fixme` with the
  actual limits.)

## 03 — Catalog: categories, brands, products, variants, price list  (`tests/03-catalog.spec.ts`)

Needs: 01. Leaves: category "Cà phê rang xay", brand "Hạt Mộc", three active products each with one variant (SKU and
price from `data.ts`), the price list. Combos are **skipped** (the backend has no combo-items endpoints yet).

- F03.1 Create a category and a brand in "Quản lý danh mục & thương hiệu"; both appear; renaming the category works;
  an empty name shows the validation message.
- F03.2 Create the three products from "Thêm mới" (name, category, brand, description, status "Đang bán"); each shows
  in the table; submitting with an empty name shows "Vui lòng nhập tên sản phẩm."
- F03.3 For each product add a variant (SKU, price) from "Xem biến thể"; the price shows in the list formatted in VND;
  a duplicate SKU is refused with an error.
- F03.4 Search by SKU "CF-ARA-250" finds exactly the Arabica product; the status filter "Lưu nháp" shows none of them;
  "Không tìm thấy sản phẩm" shows for a search with no match.
- F03.5 Edit the Arabica description; it persists after reload.
- F03.6 Create a throwaway product "Sản phẩm thử xóa", delete it (confirm), it is gone after reload; the others stay.
- F03.7 Price list: create "Bảng giá sỉ cho quán cà phê", open its matrix, set a price for Arabica, save; reopening the
  matrix shows the saved price; the KPI "Bảng giá Đa kênh" counts it.

## 04 — Stock: receipts, issues, ledger, thresholds  (`tests/04-stock.spec.ts`)

Needs: 03. Leaves: stock Arabica 40, Robusta 25, Phin 60 at the main branch's warehouse **after** this spec (the numbers
in `inventory.openingStock`), a reduction of the stock by a posted issue is part of the flow but must be re-added so the
final stock equals `openingStock`.

- F04.1 Create a receipt with the three products and the quantities of `openingStock` with "Tạo & Ghi sổ ngay": it
  appears under "Phiếu nhập" as posted, and the stock tab for the main branch shows exactly those quantities.
- F04.2 Receipt approval path: create a draft receipt (1 phin), "Gửi duyệt", then "Duyệt" (and "Ghi sổ" if the UI
  needs it): status moves through the labels, and the stock of the phin rises by 1 only when it is posted.
  (After this the phin stock is 61; the issue below brings it back to 60.)
- F04.3 Issue: create an issue "Hàng hỏng" for 1 phin, post it: stock phin is 60 again; the issue shows posted.
- F04.4 The ledger/"Sổ kho" and "Biến động kho" show the movements of the three products (receipt lines, the issue).
- F04.5 Thresholds: set a threshold for Arabica, reload, it is still there.
- F04.6 Validation: a receipt with no product, and with quantity 0, is refused with the messages from the inventory.

## 05 — Warehouses, transfers and stocktake  (`tests/05-warehouses-transfers-stocktake.spec.ts`)

Needs: 04. Leaves: warehouse "Kho Quận 3"; stock at the main warehouse unchanged in total (a transfer out of 5 Arabica
and back in is not required, the 5 stay in "Kho Quận 3" and the specs after this one must account for it: **Arabica at
the main warehouse is 35 afterwards**). Say so in your spec header.

- F05.1 Create the warehouse "KHO-Q3 / Kho Quận 3" (kind: central warehouse); it is listed; the code field upper-cases.
- F05.2 Transfer 5 Arabica from the main warehouse to Kho Quận 3: create, dispatch, receive; status labels move; the
  stock of Arabica is 35 at the main and 5 in Kho Quận 3 (balances by warehouse tab).
- F05.3 Stocktake of the main warehouse: create, enter a counted number for Robusta of 24 (one fewer), approve; the
  stock of Robusta becomes 24 and the adjustment appears in the ledger. (Robusta is 24 afterwards.)

## 06 — Suppliers and purchase orders  (`tests/06-suppliers-purchase-orders.spec.ts`)

Needs: 05. Leaves: supplier "Công ty TNHH Nông sản Cầu Đất"; Robusta stock 24 + 20 = 44 afterwards.

- F06.1 Create the supplier (all fields); it shows in the list; the same code again is refused; edit the phone; it
  persists after reload; "Ngừng" then "Kích hoạt" changes its status label.
- F06.2 Create a purchase order for 20 Robusta at 150.000 VND for the main warehouse; it shows as draft with the right
  total (3.000.000); approve it ("Duyệt"): status "Đã duyệt (Chờ nhận)".
- F06.3 Receive 12 of 20: status "Nhận một phần", stock of Robusta is 36; receive the remaining 8: "Đã nhận đủ", stock 44.
- F06.4 Validation: a PO without lines is refused with the message.

## 07 — Customers, groups and loyalty  (`tests/07-customers.spec.ts`)

Needs: 01. Leaves: group "Khách thân thiết" (5%), customers Trần Thị Bích Ngọc (in the group) and Lê Quốc Bảo.

- F07.1 Create the group; it lists with its discount; a discount over 100% is refused.
- F07.2 Create customer Bích Ngọc in the group and Quốc Bảo without; both are listed with their phone; creating another
  with the same phone is refused ("Số điện thoại đã tồn tại…").
- F07.3 Search by phone finds one; the group filter "Khách thân thiết" shows only Bích Ngọc; both survive a reload.
- F07.4 Open the details drawer of Bích Ngọc: add 100 points ("+ Cộng điểm", reason "Quà sinh nhật"), the available
  points show 100 and the ledger lists the adjustment; subtracting more than the balance is refused.
- F07.5 Add a delivery address in the drawer; it persists; the debt tab shows the empty state.
- F07.6 Loyalty tab: add a membership tier (code "GOLD", name "Hạng Vàng") and it lists.
- F07.7 Edit Quốc Bảo's name suffix, save (toast), reload; then delete a throwaway customer (create "Khách thử xóa"
  first), confirm, gone after reload.

## 08 — Promotions and coupons  (`tests/08-promotions.spec.ts`)

Needs: 01. Leaves: program "KM-THANG-12" (10%, all branches, all channels) and coupon "NOEL2026". Editing a program or
coupon (PATCH) and the "Kiểm thử áp mã" simulator (`POST /coupons/evaluate`) are **skipped**: those backend endpoints
are missing. Use `test.fixme` entries for them so they show in the report.

- F08.1 Create the program (auto-generated code replaced by `promotions.program.code`); validation: 0% refused, 150% refused,
  start after end refused; created program shows with status "Đang áp dụng".
- F08.2 Issue the coupon "NOEL2026" with a usage cap for that program; it lists with status.
- F08.3 Filters: by status "Đang áp dụng" the program shows; by "Tạm ngưng" it does not.

## 09 — POS: shift, sale, receipt, close shift  (`tests/09-pos.spec.ts`)

Needs: 04 (stock), 07 (customer), 08 (coupon). Leaves: one completed cash sale of 335.000 VND to Bích Ngọc, the
shift closed. Stock afterwards: **Arabica 33 at the main warehouse, Phin 59.**

- F09.1 Without an open shift, paying shows the "Chưa có ca thu ngân đang mở…" message and opens the shift dialog.
- F09.2 Open the shift: register "QUAY-01", opening cash 500.000; the button reads "Ca … (Đang mở)"; opening a second
  one on the same register is refused (SHIFT_ALREADY_OPEN message).
- F09.3 Sell 2 Arabica + 1 Phin to Bích Ngọc, cash, tendered 500.000: total 335.000, change 165.000, the receipt
  dialog shows the total; the cart is empty afterwards.
- F09.4 An invalid coupon code "SAIMA" is refused with "Mã giảm giá không hợp lệ hoặc đã hết hiệu lực."; with the
  valid "NOEL2026" the total drops by 10% (a second sale of 1 Phin: 65.000 → 58.500; stock Phin 58 → account for it:
  **Phin 58 afterwards** — update the numbers above in your header).
- F09.5 Selling more than the stock of a product is refused or blocked with the insufficient-stock message.
- F09.6 Close the shift counting exactly the expected cash (500.000 + 335.000 + 58.500 = 893.500): "Xác nhận kết ca",
  shift closed, the status button reads "Chưa có ca…".

## 10 — Orders  (`tests/10-orders.spec.ts`)

Needs: 09. Leaves: the sale of F09.3 returned in part (1 Phin), restocked.

- F10.1 The list shows the two POS orders on the "Tại cửa hàng" tab with the right totals; the search by customer name
  finds the first; the KPI "Tổng đơn hàng hôm nay" is at least 2.
- F10.2 Open the detail dialog of the first order: customer, payment, total 335.000 and the two lines are shown.
- F10.3 Return 1 Phin with restock, refund method cash: the order shows as returned/updated and the stock of Phin
  rises by 1 (**Phin 59** afterwards).
- F10.4 Filters: status "Đã hủy" shows none of our orders; a search with no match shows the empty state.

## 11 — Staff, roles and what a role can see  (`tests/11-staff-and-roles.spec.ts`)

Needs: 01 (and 02 for the branch name). Registers the cashier account through the API first (the app only adds existing
accounts). Leaves: custom role "Thu ngân ca sáng", member Lê Hoàng Nam with that role, one weekly shift for him.

- F11.1 Roles: create the role with the permission matrix cells in `roles.cashier.cells` ticked; the diff bar says what
  changed; save; reload; the cells are still ticked; a duplicate name is refused ("Tên vai trò đã tồn tại…").
- F11.2 Members: add Nam by email with the role and the branch scope; he is listed with the role name; adding an
  unregistered email is refused with the message.
- F11.3 Shifts: schedule Nam "Ca sáng" 07:00-12:00 on Monday to Friday as cashier ("Thu ngân"); the weekly grid shows
  it; an overlapping second shift for him is refused (S001 message); end before start is refused.
- F11.4 What the cashier sees: sign in as Nam in a fresh browser context: the sidebar shows POS, Orders, Customers (and
  Promotions, which uses `orders.view`) but not Staff, Reports, Products; opening /staff directly shows "Bạn chưa có
  quyền mở trang này"; he cannot see "Thêm nhân viên".
- F11.5 Lock and unlock Nam from the owner's list: while locked his sign-in is refused; after unlock it works.
- F11.6 Remove Nam (confirm): he disappears; the owner cannot be removed (no action on the owner row).

## 12 — Overview and reports  (`tests/12-overview-and-reports.spec.ts`)

Needs: 09. Read-only.

- F12.1 The overview shows today's date and the four KPIs; the revenue KPI shows at least 393.500 (335.000 + 58.500)
  once the sale has propagated (poll with reload, up to 60 s); the recent orders list names the orders.
- F12.2 Reports, "Bán hàng theo Kênh": the "Tại cửa hàng" channel appears with revenue; changing the range chip changes
  the request; choosing the main branch keeps the figure.
- F12.3 Reports, products tab: Arabica is in the top SKUs with quantity 2; the SKU filter narrows to it.
- F12.4 Reports, inventory tab: the main warehouse row shows the SKU count 3 and the stock valuation.
- F12.5 "Xuất CSV tab hiện tại" downloads a file whose first line has the table's headers.

## 13 — Navigation and layout  (`tests/13-navigation.spec.ts`)

Needs: 01. Read-only.

- F13.1 Each sidebar item opens its page: the breadcrumb title and the page heading match (see UI-INVENTORY.md section 0).
- F13.2 Collapsing the sidebar persists after reload (`omni_sidebar_collapsed`) and expanding restores it.
- F13.3 The store card menu lists the store, offers "Quản lý chi nhánh & gói cước" (goes to /settings).
- F13.4 Channels page (no marketplace connected): the empty state "Chưa có gian hàng Lazada nào được kết nối."; the
  connect dialog opens; submitting without a branch/token shows the validation messages; closing leaves nothing created.
  Real Lazada/Shopee connection is **skipped** (external service).

## Known gaps, recorded as `test.fixme` where a spec exists for the area

Combos (no backend endpoints), promotion/coupon edit, coupon simulator, SKU auto-match, integration connection edit,
product image upload (needs S3), marketplace OAuth, customer CSV import/merge (dead code), demo mode.
