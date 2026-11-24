import type { Locator, Page } from "@playwright/test"
import { ensureStock, gw } from "../support/api"
import { branches, catalog, customers, pos, promotions, vnd } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F09.1 - F09.6 of flows/FLOWS.md: the POS counter (UI-INVENTORY section 9) - open a shift, sell at the
 * counter, print the receipt, use a real coupon against the stock, and count the drawer at close.
 *
 * Needs: 04 (stock), 07 (customers), 08 (coupon). Leaves: two completed cash sales in one CLOSED shift of the
 * main branch (335.000 VND to Trần Thị Bích Ngọc, then 58.500 VND with NOEL2026), and the shift closed with
 * 893.500 VND counted. Stock falls by the exact quantities sold; every stock assertion is a delta against a
 * reading taken just before the sale, because other workers change the same shared store at the same time.
 *
 * Re-runnable: F09.1 first closes, through the UI close dialog, an OPEN shift a previous run of this file left
 * behind (counting exactly the expected cash the dialog shows), so the shop is back to "no open shift". There is
 * no DELETE for shifts or orders, so this file never deletes anything; the two sales are simply new orders on
 * every run. F09.6 reloads the page before closing: without the reload the POS page keeps its stale local copy
 * of the shift and shows the opening float as the "expected cash" even after the sales.
 *
 * Two genuine app bugs are recorded as extra `test.fixme` entries: the POS total does not show a real coupon's
 * discount (only three hard-coded client presets are priced), and the count input's step="1000" refuses an exact
 * VND cash count such as 893.500. F09.6 uses a documented one-line DOM workaround for the latter so the real
 * close still happens with the exact amount; without it the browser blocks the submit before the app sees it.
 *
 * Local constants (not in data.ts): the invalid coupon SAIMA of F09.4, the shift notes, and the quantities of
 * the second (coupon) sale. All other numbers come from data.ts.
 */
asOwner()
test.describe.configure({ mode: "serial" })

// Stock is shared with the other specs and a failed earlier run may have used it up: have enough to sell
test.beforeAll(async () => {
  const branchId = await mainBranchId()
  await ensureStock(branchId, catalog.products.arabica.sku, 10)
  await ensureStock(branchId, catalog.products.phin.sku, 10)
})

/** The only invalid code in the flows text; data.ts only has the valid coupon. */
const INVALID_COUPON = "SAIMA"

const OPEN_NOTE = "Ca POS buổi sáng - thu ngân Hạt Mộc"
const CLOSE_NOTE = "Đã kiểm quỹ đủ tiền mặt cuối ca"

/** F09.4 sells one phin with a real coupon: 65.000 -> 58.500 at the program's 10%. */
const couponSale = { product: catalog.products.phin, qty: 1 }
const couponSaleSubtotal = couponSale.product.price * couponSale.qty
const couponSaleDiscount = Math.round((couponSaleSubtotal * promotions.program.percent) / 100)
const couponSaleTotal = couponSaleSubtotal - couponSaleDiscount

/** Opening float + the cash each of the two sales puts in the drawer (the server takes tendered - change). */
const expectedClosingCash = pos.openingCash + pos.total + couponSaleTotal

/** The three symbols of the for-sale products; used to read stock through the inventory API. */
type StockKey = "arabica" | "robusta" | "phin"
const stockKeys: StockKey[] = ["arabica", "robusta", "phin"]

type StockSnapshot = Record<StockKey, number>

const shiftButton = (page: Page) =>
  page.getByRole("button", {
    name: /^(Chưa có ca: mở ca để bán|Ca: .+ \(Đang mở\)|Ca .+ đang mở: bán vào ca này)$/,
  })

const shiftDialog = (page: Page) => page.getByRole("dialog")

/** "335.000 ₫" / "+1.234 ₫" -> 335000 / 1234 (money is printed with dots as thousand separators). */
function parseVnd(text: string): number {
  return Number(text.replace(/[^\d-]/g, ""))
}

/**
 * App bug workaround: the shift's "Tiền mặt thực đếm cuối ca" input has step="1000", so the browser refuses to
 * submit an exact VND count like 893.500 (stepMismatch) even though that is what the app says is in the drawer.
 * Relaxing the step on this one DOM input lets a cashier count exact VND; the form, the API call and the stored
 * amount are all still the app's own. See the test.fixme at the end of this file.
 */
async function fillExactCash(input: Locator, amount: number) {
  await input.evaluate((el) => el.setAttribute("step", "1"))
  await input.fill(String(amount))
}

/** The branch the store was created with: the POS page auto-selects it from GET /branches. */
async function mainBranchId(): Promise<string> {
  const list = await gw<{ data: { id: string; name: string }[] }>("/platform/api/v1/branches")
  const branch = list.data.find((b) => b.name === branches.main.name) ?? list.data[0]
  expect(branch, "the main branch exists (01)").toBeTruthy()
  return branch.id
}

/** Available stock, read through the same inventory API the POS page uses, for delta assertions. */
async function readStock(branchId: string): Promise<StockSnapshot> {
  const res = await gw<{ data: { sku: string; available: number }[] }>(
    `/inventory/api/v1/stock-levels?branchId=${branchId}`,
  )
  const result = {} as StockSnapshot
  for (const key of stockKeys) {
    const row = res.data.find((s) => s.sku === catalog.products[key].sku)
    expect(row, `${catalog.products[key].sku} has a stock row`).toBeTruthy()
    result[key] = row!.available
  }
  return result
}

/** Search by SKU and click the product card `qty` times; the catalog is loaded before the card appears. */
async function addProduct(page: Page, sku: string, qty: number) {
  const search = page.getByPlaceholder(
    "Tìm tên sản phẩm, mã SKU hoặc quét mã vạch (F2 để tìm, Enter thêm nhanh)...",
  )
  await search.fill(sku)
  const card = page.getByRole("button", { name: new RegExp(sku) })
  await expect(card).toBeVisible()
  for (let i = 0; i < qty; i += 1) await card.click()
  await search.fill("")
}

/** Pay the current cart with cash. The tender is passed in VND; the page's own button shows the client total. */
async function pay(page: Page, tendered: number) {
  const cash = page.getByText("Tiền khách đưa:").locator("..").getByRole("spinbutton")
  await cash.fill(String(tendered))
  await page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click()
}

/**
 * If a previous run left an OPEN shift, close it with its own expected cash so F09.1 starts from "no shift".
 * The page's shift button is in close mode exactly when the signed-in owner has an OPEN shift; an OPEN shift
 * belonging to someone else cannot be closed from this UI and would be reported by the next assertion.
 */
async function closeLeftoverShift(page: Page) {
  await expect(shiftButton(page)).toBeVisible()
  if (!(await shiftButton(page).innerText()).includes("(Đang mở)")) return
  await shiftButton(page).click()
  const dialog = shiftDialog(page)
  await expect(dialog.getByRole("heading", { name: "Kết ca & Bàn giao quỹ tiền mặt" })).toBeVisible()
  const expected = parseVnd(
    await dialog.getByText("Tiền kỳ vọng trong két:").locator("..").innerText(),
  )
  await fillExactCash(dialog.getByRole("spinbutton"), expected)
  await dialog.getByRole("button", { name: "Xác nhận kết ca" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(shiftButton(page)).toHaveText(/Chưa có ca/)
}

test("F09.1 Without an open shift, paying opens the shift dialog and refuses the sale", async ({ page, step }) => {
  await page.goto("/pos")
  await settled(page)

  await step("The POS page is open on the main branch with its catalog loaded", async () => {
    await expect(page.getByRole("heading", { name: "Bán tại quầy", level: 1 })).toBeVisible()
    await expect(page.getByText(/SKU còn hàng/)).toBeVisible()
  })

  await step("Close any shift an earlier run left open, counting its expected cash", async () => {
    await closeLeftoverShift(page)
  })

  await step("The header says no shift is open", async () => {
    await expect(shiftButton(page)).toHaveText("Chưa có ca: mở ca để bán")
  })

  await step("Put one phin in the cart and try to pay", async () => {
    await addProduct(page, catalog.products.phin.sku, 1)
    await expect(page.getByRole("button", { name: /^Thanh toán và tạo đơn/ })).toBeEnabled()
    await page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click()
  })

  await step("The shift dialog opens and the 'no open shift' message is shown", async () => {
    const dialog = shiftDialog(page)
    await expect(dialog.getByRole("heading", { name: "Mở ca thu ngân POS" })).toBeVisible()
    await expect(
      page.getByText("Chưa có ca thu ngân đang mở ở chi nhánh này. Hãy mở ca trước khi bán."),
    ).toBeVisible()
  })

  await step("Dismiss the dialog: the cart is untouched and no receipt was printed", async () => {
    await shiftDialog(page).getByRole("button", { name: "Đóng" }).click()
    await expect(shiftDialog(page)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(1 SP\)/ })).toBeVisible()
    await expect(page.getByText(/Hóa đơn bán lẻ K80/)).toHaveCount(0)
  })
})

test("F09.2 Open a QUAY-01 shift with 500.000 VND; a second open on the same register is refused", async ({
  page,
  step,
}) => {
  await page.goto("/pos")
  await settled(page)
  const branchId = await mainBranchId()

  await step("Open the shift dialog from the header button", async () => {
    await expect(shiftButton(page)).toHaveText("Chưa có ca: mở ca để bán")
    await shiftButton(page).click()
    await expect(shiftDialog(page).getByRole("heading", { name: "Mở ca thu ngân POS" })).toBeVisible()
  })

  await step(`Enter register ${pos.registerCode} and opening cash ${vnd(pos.openingCash)} VND`, async () => {
    const dialog = shiftDialog(page)
    await dialog.getByLabel("Mã máy thu ngân (Register)").fill(pos.registerCode)
    await dialog.getByLabel("Tiền mặt đầu ca (VND) *").fill(String(pos.openingCash))
    await dialog.getByPlaceholder("Ghi chú bàn giao ca...").fill(OPEN_NOTE)
  })

  await step("Submit: the header now shows the register as open", async () => {
    const dialog = shiftDialog(page)
    await dialog.getByRole("button", { name: "Mở ca bán hàng" }).click()
    await expect(dialog).toHaveCount(0)
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
  })

  await step("Reload: the shift is still open with the same register", async () => {
    await page.reload()
    await settled(page)
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
  })

  await step("The UI has no second 'open' action: the same button now offers the close form", async () => {
    await shiftButton(page).click()
    const dialog = shiftDialog(page)
    await expect(dialog.getByRole("heading", { name: "Kết ca & Bàn giao quỹ tiền mặt" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Mở ca bán hàng" })).toHaveCount(0)
    await dialog.getByRole("button", { name: "Đóng" }).click()
    await expect(dialog).toHaveCount(0)
  })

  await step("The backend refuses a second open on the same register (SHIFT_ALREADY_OPEN)", async () => {
    // UX finding: opening a second shift is only reachable through the API - the UI never offers that action
    // once a shift is open. We assert the backend's real refusal instead of faking a UI control.
    let failure = ""
    try {
      await gw("/sales/api/v1/pos/shifts/open", {
        method: "POST",
        body: { branchId, registerCode: pos.registerCode, openingCash: pos.openingCash, note: OPEN_NOTE },
      })
    } catch (e) {
      failure = String(e)
    }
    expect(failure).toContain("409")
    expect(failure).toContain("SHIFT_ALREADY_OPEN")
  })

  await step("Exactly one open QUAY-01 shift remains at the branch", async () => {
    const open = await gw<{ data: { register: { code: string } }[] }>(
      `/sales/api/v1/pos/shifts/available?branchId=${branchId}`,
    )
    expect(open.data.filter((s) => s.register.code === pos.registerCode)).toHaveLength(1)
  })
})

test("F09.3 Sell 2 Arabica and 1 Phin to Bích Ngọc for 335.000 VND cash", async ({ page, step }) => {
  const branchId = await mainBranchId()
  let before: StockSnapshot

  await step("Open the POS page and read the stock before the sale", async () => {
    await page.goto("/pos")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Bán tại quầy", level: 1 })).toBeVisible()
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
    before = await readStock(branchId)
    expect(before.arabica).toBeGreaterThanOrEqual(pos.cart[0].qty)
    expect(before.phin).toBeGreaterThanOrEqual(1)
  })

  await step("Add two Arabica and one phin from the catalog", async () => {
    await addProduct(page, catalog.products.arabica.sku, pos.cart[0].qty)
    await addProduct(page, catalog.products.phin.sku, 1)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(3 SP\)/ })).toBeVisible()
    await expect(page.getByText("Tạm tính (3 sản phẩm):").locator("..")).toContainText(vnd(pos.total))
  })

  await step("Name Bích Ngọc as the customer and hand over 500.000 VND cash", async () => {
    await page.getByPlaceholder("Khách lẻ (Bỏ trống nếu khách vãng lai)").fill(customers.ngoc.name)
    await page.getByText("Tiền khách đưa:").locator("..").getByRole("spinbutton").fill(String(pos.tendered))
    await expect(page.getByText("Tiền thừa trả khách:").locator("..")).toContainText(vnd(pos.change))
    await expect(page.getByRole("button", { name: `Thanh toán và tạo đơn (${vnd(pos.total)} ₫)` })).toBeVisible()
  })

  let orderId = ""
  await step("Pay: the sale is accepted and a receipt dialog opens", async () => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "POST" && new URL(r.url()).pathname.endsWith("/sales/api/v1/pos/checkout"),
      ),
      page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click(),
    ])
    expect(response.ok()).toBe(true)
    const body = (await response.json()) as { orderId: string; orderCode: string }
    orderId = body.orderId
    expect(body.orderCode).toBeTruthy()
    const dialog = shiftDialog(page)
    await expect(dialog.getByRole("heading", { name: new RegExp(`Hóa đơn bán lẻ K80 \\(${body.orderCode}\\)`) })).toBeVisible()
    await expect(dialog).toContainText(customers.ngoc.name)
    await expect(dialog).toContainText(`${catalog.products.arabica.sku} × ${pos.cart[0].qty}`)
    await expect(dialog).toContainText(`${catalog.products.phin.sku} × 1`)
    await expect(dialog.getByText("TỔNG THANH TOÁN:").locator("..")).toContainText(vnd(pos.total))
    await expect(dialog.getByText("Tiền thừa trả khách:").locator("..")).toContainText(vnd(pos.change))
  })

  await step("Close the receipt: the cart is empty", async () => {
    await shiftDialog(page).getByRole("button", { name: "Đóng" }).click()
    await expect(shiftDialog(page)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(0 SP\)/ })).toBeVisible()
    await expect(page.getByText("Chưa có sản phẩm trong Đơn #1")).toBeVisible()
  })

  await step("The order is stored with the right total, customer and three lines", async () => {
    const order = await gw<{
      totalAmount: number
      customerName: string | null
      itemCount: number
    }>(`/sales/api/v1/orders/${orderId}`)
    expect(order.totalAmount).toBe(pos.total)
    expect(order.customerName).toBe(customers.ngoc.name)
    expect(order.itemCount).toBe(pos.cart[0].qty + 1)
  })

  await step("Stock has fallen by exactly the two Arabica and the one phin sold", async () => {
    await expect
      .poll(async () => {
        const after = await readStock(branchId)
        return [after.arabica, after.robusta, after.phin]
      })
      .toEqual([before.arabica - pos.cart[0].qty, before.robusta, before.phin - 1])
  })
})

test("F09.4 An invalid coupon is refused; NOEL2026 takes 10% off a 65.000 VND phin", async ({ page, step }) => {
  const branchId = await mainBranchId()
  let before: StockSnapshot
  let usedBefore = 0

  await step("Open the POS page and read the stock and the coupon usage before the sale", async () => {
    await page.goto("/pos")
    await settled(page)
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
    before = await readStock(branchId)
    expect(before.phin).toBeGreaterThanOrEqual(couponSale.qty)
    const coupons = await gw<{ code: string; usedCount: number }[]>("/sales/api/v1/coupons")
    usedBefore = coupons.find((c) => c.code === promotions.coupon.code)?.usedCount ?? 0
  })

  await step(`Add one phin (${vnd(couponSaleSubtotal)} VND) to a fresh cart`, async () => {
    await addProduct(page, couponSale.product.sku, couponSale.qty)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(1 SP\)/ })).toBeVisible()
    await expect(page.getByText("Tạm tính (1 sản phẩm):").locator("..")).toContainText(vnd(couponSaleSubtotal))
  })

  await step(`The unknown code ${INVALID_COUPON} is refused by the server`, async () => {
    await page.getByPlaceholder("SALE10, VIP50K...").fill(INVALID_COUPON)
    await page.getByRole("button", { name: "Đưa đủ", exact: true }).click()
    const [badResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "POST" && new URL(r.url()).pathname.endsWith("/sales/api/v1/pos/checkout"),
      ),
      page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click(),
    ])
    expect(badResponse.status()).toBe(409)
    expect(((await badResponse.json()) as { errorCode: string }).errorCode).toBe("COUPON_INVALID")
    await expect(page.getByText("Mã giảm giá không hợp lệ hoặc đã hết hiệu lực.")).toBeVisible()
    await expect(page.getByText(/Hóa đơn bán lẻ K80/)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(1 SP\)/ })).toBeVisible()
  })

  let orderId = ""
  await step(`Replace it with ${promotions.coupon.code} and pay the discounted total`, async () => {
    await page.getByPlaceholder("SALE10, VIP50K...").fill(promotions.coupon.code)
    await expect(page.getByRole("button", { name: /^Thanh toán và tạo đơn/ })).toBeVisible()
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "POST" && new URL(r.url()).pathname.endsWith("/sales/api/v1/pos/checkout"),
      ),
      page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click(),
    ])
    expect(response.ok()).toBe(true)
    orderId = ((await response.json()) as { orderId: string }).orderId
    const dialog = shiftDialog(page)
    await expect(dialog.getByRole("heading", { name: /Hóa đơn bán lẻ K80/ })).toBeVisible()
  })

  await step("The server priced the order at 58.500 VND with a 6.500 VND coupon discount", async () => {
    const order = await gw<{ totalAmount: number; discountAmount?: number }>(`/sales/api/v1/orders/${orderId}`)
    expect(order.totalAmount).toBe(couponSaleTotal)
    expect(order.discountAmount).toBe(couponSaleDiscount)
    const coupons = await gw<{ code: string; usedCount: number }[]>("/sales/api/v1/coupons")
    expect(coupons.find((c) => c.code === promotions.coupon.code)?.usedCount).toBe(usedBefore + 1)
  })

  await step("Close the receipt: the cart is empty again", async () => {
    await shiftDialog(page).getByRole("button", { name: "Đóng" }).click()
    await expect(shiftDialog(page)).toHaveCount(0)
    await expect(page.getByRole("heading", { name: /Đơn #1 \(0 SP\)/ })).toBeVisible()
  })

  await step("The phin stock has fallen by exactly one", async () => {
    await expect
      .poll(async () => (await readStock(branchId)).phin)
      .toBe(before.phin - couponSale.qty)
  })
})

test("F09.4 (UI) Entering NOEL2026 should show the 10% discount before paying", async ({ page, step }) => {
  test.fixme(
    true,
    "App bug: PosPage.tsx only prices the three hard-coded client presets (SALE10, VIP50K, OMNI20K) in its " +
      "discountAmount memo; a real coupon such as NOEL2026 is only sent to the server. The order and the shift " +
      "are priced correctly (58.500 VND, asserted in F09.4), but 'Khách phải trả', the pay button and the printed " +
      "receipt keep showing 65.000 VND. Remove this line when the POS calls the coupon evaluation endpoint for " +
      "the visible total.",
  )

  await page.goto("/pos")
  await settled(page)

  await step("Put one phin in the cart and enter the real coupon", async () => {
    await addProduct(page, couponSale.product.sku, couponSale.qty)
    await page.getByPlaceholder("SALE10, VIP50K...").fill(promotions.coupon.code)
  })

  await step("The visible total drops from 65.000 to 58.500 VND", async () => {
    await expect(page.getByText("Khách phải trả").locator("..")).toContainText(vnd(couponSaleTotal))
    await expect(page.getByRole("button", { name: `Thanh toán và tạo đơn (${vnd(couponSaleTotal)} ₫)` })).toBeVisible()
  })

  await step("The receipt prints the discounted total too", async () => {
    await page.getByRole("button", { name: "Đưa đủ", exact: true }).click()
    await page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click()
    const dialog = shiftDialog(page)
    await expect(dialog.getByText("TỔNG THANH TOÁN:").locator("..")).toContainText(vnd(couponSaleTotal))
  })
})

test("F09.5 Adding more than the available stock is blocked with the stock message", async ({ page, step }) => {
  const branchId = await mainBranchId()
  let key: StockKey = "arabica"
  let available = 0
  let stockBefore: StockSnapshot
  let product = catalog.products.arabica
  let card = page.getByRole("button", { name: product.sku })

  await step("Open a fresh POS cart and pick the for-sale product with the least stock", async () => {
    await page.goto("/pos")
    await settled(page)
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
    stockBefore = await readStock(branchId)
    key = stockBefore.arabica <= stockBefore.phin ? "arabica" : "phin"
    expect(stockBefore[key], "there is a product with stock to sell").toBeGreaterThan(0)
    product = catalog.products[key]
    card = page.getByRole("button", { name: new RegExp(product.sku) })
    await expect(card).toBeVisible()
  })

  await step("Fill the cart up to the stock shown on the product card", async () => {
    // "Tồn: N" on the card is the number the client uses to cap the cart
    const shown = (await card.innerText()).match(/Tồn:\s*(\d+)/)
    expect(shown, "the product card shows its available stock").toBeTruthy()
    available = Number(shown![1])
    expect(available).toBeGreaterThan(0)
    for (let i = 0; i < available; i += 1) await card.click()
    await expect(page.getByText(`Trong giỏ: ${available}`)).toBeVisible()
    await expect(page.getByRole("heading", { name: new RegExp(`Đơn #1 \\(${available} SP\\)`) })).toBeVisible()
  })

  await step("One more click is refused: the cart stays at the available stock", async () => {
    await card.click()
    await expect(page.getByText(`Sản phẩm ${product.sku} chỉ còn ${available} sản phẩm khả dụng.`)).toBeVisible()
    await expect(page.getByText(`Trong giỏ: ${available}`)).toBeVisible()
    await expect(page.getByRole("heading", { name: new RegExp(`Đơn #1 \\(${available} SP\\)`) })).toBeVisible()
    await expect(page.getByText(/Hóa đơn bán lẻ K80/)).toHaveCount(0)
  })

  await step("The stock itself did not change: nothing was sold", async () => {
    await expect.poll(async () => (await readStock(branchId))[key]).toBe(stockBefore[key])
    await page.getByRole("button", { name: "Xóa giỏ hàng" }).click()
    await expect(page.getByRole("heading", { name: /Đơn #1 \(0 SP\)/ })).toBeVisible()
  })
})

test("F09.6 Close the shift counting exactly 893.500 VND", async ({ page, step }) => {
  const branchId = await mainBranchId()

  await step("Reload: the shift's expected cash now includes both sales", async () => {
    // without the reload the POS page keeps the stale local shift it got when the shift was opened
    await page.goto("/pos")
    await settled(page)
    await page.reload()
    await settled(page)
    await expect(page.getByRole("heading", { name: "Bán tại quầy", level: 1 })).toBeVisible()
    await expect(page.getByText(/SKU còn hàng/)).toBeVisible()
    await expect(shiftButton(page)).toHaveText(`Ca: ${pos.registerCode} (Đang mở)`)
    await shiftButton(page).click()
    const dialog = shiftDialog(page)
    await expect(dialog.getByRole("heading", { name: "Kết ca & Bàn giao quỹ tiền mặt" })).toBeVisible()
    await expect(dialog.getByText("Tiền kỳ vọng trong két:").locator("..")).toContainText(vnd(expectedClosingCash))
  })

  await step("The backend agrees: opening float + 335.000 + 58.500 = 893.500 VND", async () => {
    expect(pos.openingCash + pos.total + couponSaleTotal).toBe(expectedClosingCash)
    const list = await gw<{
      data: { id: string; registerCode: string; status: string; expectedCash: number }[]
    }>(`/sales/api/v1/pos/shifts?branchId=${branchId}&limit=10`)
    const shift = list.data.find((s) => s.registerCode === pos.registerCode && s.status === "OPEN")
    expect(shift, "the QUAY-01 shift is OPEN").toBeTruthy()
    expect(shift!.expectedCash).toBe(expectedClosingCash)
  })

  await step("Count exactly the expected cash: the variance is zero", async () => {
    const dialog = shiftDialog(page)
    const shownExpected = parseVnd(await dialog.getByText("Tiền kỳ vọng trong két:").locator("..").innerText())
    expect(shownExpected).toBe(expectedClosingCash)
    await fillExactCash(dialog.getByRole("spinbutton"), expectedClosingCash)
    await expect(dialog.getByText("Chênh lệch kiểm quỹ:").locator("..")).toContainText(vnd(0))
    await expect(dialog.getByRole("button", { name: "Xác nhận kết ca" })).toBeEnabled()
  })

  await step("Confirm the close: the dialog closes and the header says there is no shift", async () => {
    await shiftDialog(page).getByRole("button", { name: "Xác nhận kết ca" }).click()
    await expect(shiftDialog(page)).toHaveCount(0)
    await expect(shiftButton(page)).toHaveText("Chưa có ca: mở ca để bán")
    await expect(page.getByText("Đã gửi kết ca. Chênh lệch vượt dung sai nên ca chờ quản lý (quyền duyệt kết ca) xác nhận.")).toHaveCount(0)
  })

  await step("Reload: the shift is still closed and the cash count was stored", async () => {
    await page.reload()
    await settled(page)
    await expect(shiftButton(page)).toHaveText("Chưa có ca: mở ca để bán")
    const list = await gw<{
      data: { id: string; registerCode: string; status: string; expectedCash: number; actualCash: number | null }[]
    }>(`/sales/api/v1/pos/shifts?branchId=${branchId}&limit=10`)
    const closed = list.data.find((s) => s.registerCode === pos.registerCode && s.status === "CLOSED")
    expect(closed, "the QUAY-01 shift is CLOSED").toBeTruthy()
    expect(closed!.expectedCash).toBe(expectedClosingCash)
    expect(closed!.actualCash).toBe(expectedClosingCash)
    expect(list.data.filter((s) => s.registerCode === pos.registerCode && s.status === "OPEN")).toHaveLength(0)
  })
})

test("F09.6 (UI) Counting an exact VND amount should be accepted by the form", async ({ page, step }) => {
  test.fixme(
    true,
    "App bug: the close form's 'Tiền mặt thực đếm cuối ca' is <input type=number step=1000>. A shift whose " +
      "expected cash ends in 500 (e.g. 558.500 after one 58.500 coupon sale) cannot be counted exactly: the " +
      "browser reports stepMismatch and never submits, so 'Xác nhận kết ca' does nothing. Worked around in " +
      "F09.6 by relaxing the step on that DOM input; remove this line when the field accepts whole VND.",
  )

  await page.goto("/pos")
  await settled(page)

  await step("Open a shift and make one coupon sale so the expected cash ends in 500", async () => {
    await shiftButton(page).click()
    const modal = shiftDialog(page)
    await modal.getByLabel("Mã máy thu ngân (Register)").fill(pos.registerCode)
    await modal.getByLabel("Tiền mặt đầu ca (VND) *").fill(String(pos.openingCash))
    await modal.getByRole("button", { name: "Mở ca bán hàng" }).click()
    await expect(modal).toHaveCount(0)
    await addProduct(page, couponSale.product.sku, couponSale.qty)
    await page.getByPlaceholder("SALE10, VIP50K...").fill(promotions.coupon.code)
    await page.getByRole("button", { name: "Đưa đủ", exact: true }).click()
    await page.getByRole("button", { name: /^Thanh toán và tạo đơn/ }).click()
    await expect(shiftDialog(page).getByRole("heading", { name: /Hóa đơn bán lẻ K80/ })).toBeVisible()
    await shiftDialog(page).getByRole("button", { name: "Đóng" }).click()
    // F09.6 needs the reload to see the server's expected cash instead of the stale local shift
    await page.reload()
    await settled(page)
  })

  await step("Count the exact expected cash and close the shift", async () => {
    const expected = pos.openingCash + couponSaleTotal
    await shiftButton(page).click()
    const modal = shiftDialog(page)
    await expect(modal.getByText("Tiền kỳ vọng trong két:").locator("..")).toContainText(vnd(expected))
    await modal.getByRole("spinbutton").fill(String(expected))
    await modal.getByRole("button", { name: "Xác nhận kết ca" }).click()
    await expect(modal).toHaveCount(0)
    await expect(shiftButton(page)).toHaveText("Chưa có ca: mở ca để bán")
  })
})
