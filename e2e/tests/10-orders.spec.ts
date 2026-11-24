import type { Page } from "@playwright/test"
import { ensureStock, gw } from "../support/api"
import { branches, catalog, customers, pos, promotions, vnd } from "../support/data"
import { asOwner, expect, test } from "../support/fixtures"
import { readWorld } from "../support/world"

/**
 * Flows F10.1 - F10.4 of flows/FLOWS.md: the multi-channel orders page (UI-INVENTORY section 8). Spec 09 has
 * already made POS sales in this shared store: a 335.000 VND sale of 2 Arabica + 1 Phin to Trần Thị Bích Ngọc and
 * a 58.500 VND coupon sale of 1 Phin. Every run of 09 adds two more, so order counts here are always ">= 1".
 * F10.3 returns one Phin (restock, cash refund) from a 335.000 order of Bích Ngọc; the +1 stock is a delta against
 * a reading taken with `gw()` just before the return, because other workers move the same shared stock concurrently.
 *
 * Re-runnable: orders are never deleted. Every run picks a 335.000 Bích Ngọc order whose Phin line is not returned
 * yet (GET /sales/api/v1/orders/{id}/details exposes returnedQty), and if all of them have been returned it makes
 * one fresh 335.000 sale through the POS API only (the Orders page has no create screen). A cash refund needs the
 * caller's own OPEN shift at the branch (409 SHIFT_REQUIRED otherwise), so F10.3 opens one on its own register via
 * the API (setup, not the flow under test) and closes exactly that shift in a finally block. Nothing that belongs
 * to 09 or to another worker is edited or deleted.
 *
 * Local constants (data.ts has no return reason, no "no match" query and no fallback register code): RETURN_REASON,
 * NO_MATCH_QUERY, RETURN_SHIFT_NOTE and fallbackRegisterCode(). All money/quantity numbers come from data.ts.
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** What the cashier writes in the return form (data.ts has no return reason). */
const RETURN_REASON = "Phin nhôm bị lỗi, khách đổi và hoàn tiền tại quầy"

/** A search string that cannot match any order, for the empty-state assertion of F10.4. */
const NO_MATCH_QUERY = "Không có đơn hàng mã K10-KHONG-TON-TAI"

/** Note of the shift opened only to let this spec's cash refund leave the drawer. */
const RETURN_SHIFT_NOTE = "Ca thu ngân để hoàn tiền trả hàng đơn hàng (kiểm thử F10.3)"

/** One Phin with NOEL2026: 65.000 - 10% = 58.500 (spec 09's second sale). */
const couponSaleTotal =
  catalog.products.phin.price -
  Math.round((catalog.products.phin.price * promotions.program.percent) / 100)

/** Unique register: the backend allows one OPEN shift per register, so this never collides with QUAY-01 of 09. */
const fallbackRegisterCode = () => `ORD10-${readWorld().runId}`

const searchBox = (page: Page) => page.getByPlaceholder("Tìm số đơn, mã sàn, tên KH, SKU...")
const statusFilter = (page: Page) => page.getByLabel("Lọc trạng thái đơn hàng")
const dialog = (page: Page) => page.getByRole("dialog")

/** The order card is an <article> (not a table row); find it by the code printed in its header. */
const cardOf = (page: Page, code: string) =>
  page.getByRole("article").filter({ has: page.getByRole("button", { name: code, exact: true }) })

type OrderApi = {
  id: string
  code: string
  totalAmount: number
  customerName: string | null
  status: string
  allowedActions?: string[]
}

/** GET /sales/api/v1/orders/{id}/details is a bare object with raw items, unlike GET /orders/{id}. */
type OrderDetailsApi = {
  items: Array<{ id: string; sku: string; quantity: number; returnedQty?: string; refundedAmount?: number }>
  refundedAmount?: number
  warehouseId?: string | null
}

/** GET /sales/api/v1/returns?orderId=... is a bare array of these. */
type ReturnSummary = {
  id: string
  orderId: string
  code: string
  status: string
  totalRefundAmount: number
  note: string | null
  inventoryReceiptId: string | null
}

/** GET /sales/api/v1/returns/{id} adds the lines and the refund requests. */
type ReturnDetail = ReturnSummary & {
  items: Array<{
    orderItemId: string
    returnQty: string
    disposition: string
    refundAmount: number
  }>
  refundRequests: Array<{ method: string; amount: number; status: string }>
}

type StockLevels = { data: Array<{ sku: string; variantId: string; available: number }> }

/** The branch the store was created with; the POS page in 09 auto-selects the same one. */
async function mainBranchId(): Promise<string> {
  const list = await gw<{ data: Array<{ id: string; name: string }> }>("/platform/api/v1/branches")
  const branch = list.data.find((b) => b.name === branches.main.name) ?? list.data[0]
  expect(branch, "the main branch exists (01)").toBeTruthy()
  return branch.id
}

/** Available stock read through the inventory API, for the return's +1 delta assertion. */
async function readStock(branchId: string): Promise<StockLevels> {
  return gw<StockLevels>(`/inventory/api/v1/stock-levels?branchId=${branchId}`)
}

function phinAvailable(levels: StockLevels): number {
  const row = levels.data.find((s) => s.sku === catalog.products.phin.sku)
  expect(row, "the phin has a stock row").toBeTruthy()
  return row!.available
}

/**
 * Find a sale of F09.3 whose Phin has not been returned yet, newest first. GET /orders/{id} deliberately hides
 * returnedQty, so use /orders/{id}/details; a previous run of this spec (or another worker) may have returned it.
 */
async function findReturnableOrder(): Promise<OrderApi | null> {
  const list = await gw<{ data: OrderApi[] }>("/sales/api/v1/orders?page=1&limit=100")
  const candidates = list.data.filter(
    (o) => o.totalAmount === pos.total && o.customerName === customers.ngoc.name,
  )
  for (const candidate of candidates) {
    const detail = await gw<OrderDetailsApi>(`/sales/api/v1/orders/${candidate.id}/details`)
    const phin = detail.items?.find((i) => i.sku === catalog.products.phin.sku)
    if (phin && Number(phin.returnedQty ?? 0) < phin.quantity) return candidate
  }
  return null
}

/**
 * Last resort when all existing 335.000 orders have had their Phin returned: make one more sale through the POS
 * API only. The branch's open shift is shared, so use it if there is one; only a shift opened here is closed here.
 */
async function makeSaleViaPosApi(): Promise<OrderApi> {
  const branchId = await mainBranchId()
  await ensureStock(branchId, catalog.products.arabica.sku, pos.cart[0].qty)
  await ensureStock(branchId, catalog.products.phin.sku, 1)

  const available = await gw<{ data: Array<{ id: string }> }>(
    `/sales/api/v1/pos/shifts/available?branchId=${branchId}`,
  )
  let shiftId = available.data[0]?.id
  let closeAfter = false
  if (!shiftId) {
    shiftId = await openOwnShift(branchId)
    closeAfter = true
  }

  try {
    const variantId = async (sku: string) =>
      (await gw<{ variant: { id: string } }>(`/catalog/api/v1/products/lookup?sku=${encodeURIComponent(sku)}`))
        .variant.id
    const checkout = await gw<{ orderId: string }>("/sales/api/v1/pos/checkout", {
      method: "POST",
      body: {
        branchId,
        shiftId,
        customerName: customers.ngoc.name,
        lines: [
          { variantId: await variantId(catalog.products.arabica.sku), qty: pos.cart[0].qty },
          { variantId: await variantId(catalog.products.phin.sku), qty: 1 },
        ],
        paymentMethod: "CASH",
        tenderedCash: pos.tendered,
        note: "Đơn tạo mới để kiểm thử luồng đổi trả đơn hàng",
      },
    })
    const detail = await gw<OrderApi>(`/sales/api/v1/orders/${checkout.orderId}`)
    expect(detail.totalAmount).toBe(pos.total)
    expect(detail.customerName).toBe(customers.ngoc.name)
    return detail
  } finally {
    if (closeAfter) await closeOwnShift(branchId, shiftId)
  }
}

/** Own OPEN shift: the backend picks the refund drawer by staffId, so another cashier's shift cannot be used. */
async function openOwnShift(branchId: string): Promise<string> {
  const shift = await gw<{ id: string }>("/sales/api/v1/pos/shifts/open", {
    method: "POST",
    body: {
      branchId,
      registerCode: fallbackRegisterCode(),
      openingCash: pos.openingCash,
      note: RETURN_SHIFT_NOTE,
    },
  })
  return shift.id
}

/** Close only the shift this spec opened, counting exactly the cash the backend expects (zero variance). */
async function closeOwnShift(branchId: string, shiftId: string) {
  const list = await gw<{ data: Array<{ id: string; expectedCash: number }> }>(
    `/sales/api/v1/pos/shifts?branchId=${branchId}&limit=20`,
  )
  const shift = list.data.find((s) => s.id === shiftId)
  expect(shift, "the shift opened for this return is listed").toBeTruthy()
  await gw(`/sales/api/v1/pos/shifts/${shiftId}/close`, {
    method: "POST",
    body: { actualCash: shift!.expectedCash, note: "Đã hoàn tiền trả hàng, kết ca kiểm thử" },
  })
}

/** Open the orders page and set the channel filter, proving the page has finished loading its data. */
async function openOrders(page: Page, channelTab = "Tất cả") {
  await page.goto("/orders")
  await expect(page.getByRole("heading", { name: "Đơn hàng", level: 1 })).toBeVisible()
  if (channelTab !== "Tất cả") {
    await page
      .getByRole("button", { name: new RegExp(`^${channelTab} \\(\\d+\\)$`) })
      .click()
  }
  await expect(page.getByRole("article").first()).toBeVisible()
}

/** Open the detail dialog of one order by its code; its items arrive from getOrder on click. */
async function openDetail(page: Page, code: string) {
  await cardOf(page, code).getByRole("button", { name: code, exact: true }).click()
  const detail = dialog(page)
  await expect(detail.getByRole("heading", { name: `Số đơn hàng: ${code}` })).toBeVisible()
  return detail
}

test("F10.1 The POS sales are on the 'Tại cửa hàng' tab and the KPI counts them", async ({ page, step }) => {
  await step("Open /orders and filter to the in-store channel", async () => {
    await openOrders(page, "Tại cửa hàng")
    await expect(page.getByRole("button", { name: /^Tại cửa hàng \(\d+\)$/ })).toBeVisible()
  })

  await step("The 335.000 VND sale to Bích Ngọc and the 58.500 VND coupon sale are both listed", async () => {
    const cards = page.getByRole("article")
    // Other workers/runs add more sales, so count only our two kinds of order and assert "at least one" each.
    const big = cards.filter({ hasText: vnd(pos.total) }).filter({ hasText: customers.ngoc.name })
    const small = cards.filter({ hasText: vnd(couponSaleTotal) })
    await expect(big.first()).toBeVisible()
    await expect(small.first()).toBeVisible()
    expect(await big.count(), "at least one 335.000 sale of Bích Ngọc").toBeGreaterThanOrEqual(1)
    expect(await small.count(), "at least one 58.500 coupon sale").toBeGreaterThanOrEqual(1)
  })

  await step("Search by the customer's name finds her 335.000 VND sale", async () => {
    await searchBox(page).fill(customers.ngoc.name)
    const found = page
      .getByRole("article")
      .filter({ hasText: customers.ngoc.name })
      .filter({ hasText: vnd(pos.total) })
    await expect(found.first()).toBeVisible()
    expect(await found.count()).toBeGreaterThanOrEqual(1)
  })

  await step("The 'Tổng đơn hàng hôm nay' KPI is at least 2", async () => {
    const value = page.getByText("Tổng đơn hàng hôm nay").locator("xpath=../..").locator("p").nth(1)
    await expect.poll(async () => Number((await value.innerText()).replace(/[^\d]/g, ""))).toBeGreaterThanOrEqual(2)
  })

  await step("Reload: both sales survive the reload", async () => {
    await page.reload()
    await expect(page.getByRole("heading", { name: "Đơn hàng", level: 1 })).toBeVisible()
    const cards = page.getByRole("article")
    await expect(
      cards.filter({ hasText: vnd(pos.total) }).filter({ hasText: customers.ngoc.name }).first(),
    ).toBeVisible()
    await expect(cards.filter({ hasText: vnd(couponSaleTotal) }).first()).toBeVisible()
  })
})

test("F10.2 The detail dialog of the 335.000 VND order shows the customer, payment and both lines", async ({
  page,
  step,
}) => {
  const order = (await findReturnableOrder()) ?? (await makeSaleViaPosApi())

  await step("Find the 335.000 VND sale of Bích Ngọc in the list", async () => {
    await openOrders(page)
    await searchBox(page).fill(customers.ngoc.name)
    const card = cardOf(page, order.code)
    await expect(card).toBeVisible()
    await expect(card).toContainText(vnd(pos.total))
  })

  await step("Open its detail dialog from the order number", async () => {
    const detail = await openDetail(page, order.code)
    await expect(detail).toContainText(customers.ngoc.name)
    // "CASH" is the payment method printed by the dialog; the POS sale of 09 paid cash
    await expect(detail.getByText("CASH", { exact: true })).toBeVisible()
    await expect(detail.getByText("Tổng cộng").locator("..")).toContainText(vnd(pos.total))
  })

  await step("The two lines are Arabica (x2) and Phin (x1), with their data.ts prices", async () => {
    const detail = dialog(page)
    await expect(detail.getByRole("heading", { name: "Sản phẩm trong đơn (2)" })).toBeVisible()
    await expect(detail).toContainText(catalog.products.arabica.sku)
    await expect(detail).toContainText(catalog.products.phin.sku)
    await expect(detail).toContainText(vnd(catalog.products.arabica.price))
    await expect(detail).toContainText(vnd(catalog.products.phin.price))
  })

  await step("Close the dialog and reload: the order is still in the list", async () => {
    await dialog(page).getByRole("button", { name: "Đóng", exact: true }).click()
    await expect(dialog(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole("heading", { name: "Đơn hàng", level: 1 })).toBeVisible()
    await searchBox(page).fill(order.code)
    await expect(cardOf(page, order.code)).toBeVisible()
  })
})

test("F10.3 Return one Phin with restock and a cash refund", async ({ page, step }) => {
  const branchId = await mainBranchId()
  const order = (await findReturnableOrder()) ?? (await makeSaleViaPosApi())
  const details = await gw<OrderDetailsApi>(`/sales/api/v1/orders/${order.id}/details`)
  const phinItem = details.items.find((i) => i.sku === catalog.products.phin.sku)
  expect(phinItem, "the order has a Phin line to return").toBeTruthy()
  expect(Number(phinItem!.returnedQty ?? 0), "its Phin has not been returned yet").toBeLessThan(phinItem!.quantity)

  // Setup, not the flow under test: a cash refund needs a shift opened by this very caller (409 SHIFT_REQUIRED).
  const shiftId = await openOwnShift(branchId)
  try {
    await step("Open the detail of the 335.000 VND order of Bích Ngọc", async () => {
      await openOrders(page)
      await searchBox(page).fill(order.code)
      await openDetail(page, order.code)
    })

    await step("Start the return from the detail dialog", async () => {
      await dialog(page).getByRole("button", { name: /Đổi trả \/ Hoàn tiền/ }).click()
      const modal = dialog(page)
      await expect(modal.getByText(/Đổi trả hàng & Hoàn tiền \(Tại cửa hàng\)/)).toBeVisible()
      await expect(modal.getByRole("heading", { name: new RegExp(`Đơn hàng ${order.code}`) })).toBeVisible()
      await expect(modal).toContainText(catalog.products.arabica.sku)
      await expect(modal).toContainText(catalog.products.phin.sku)
    })

    await step("Return only 1 Phin: set the Arabica quantity to zero", async () => {
      const modal = dialog(page)
      const qtyOf = (sku: string) =>
        modal
          .getByText(new RegExp(`SKU: ${sku}`))
          .locator("xpath=../..")
          .getByRole("spinbutton", { name: /SL trả/ })
      await qtyOf(catalog.products.arabica.sku).fill("0")
      await expect(qtyOf(catalog.products.phin.sku)).toHaveValue(String(1))
      // the dialog prices the refund itself from the quantity and the unit price
      await expect(modal.getByText("Tổng tiền hoàn trả cho khách:").locator("..")).toContainText(
        vnd(catalog.products.phin.price),
      )
    })

    await step("Choose cash at the counter, keep restock on and give a reason", async () => {
      const modal = dialog(page)
      await modal.getByLabel("Phương thức hoàn tiền").selectOption({ label: "Tiền mặt tại quầy" })
      await modal.getByLabel("Lý do trả hàng").fill(RETURN_REASON)
      const restock = modal.getByRole("checkbox", { name: /Nhập lại hàng trả vào tồn kho khả dụng/ })
      await expect(restock).toBeChecked()
    })

    let before: StockLevels
    await step("Read the phin stock through the API just before confirming", async () => {
      before = await readStock(branchId)
      expect(phinAvailable(before)).toBeGreaterThan(0)
    })

    await step("Confirm: the backend accepts the return and the page shows one SKU restocked", async () => {
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.request().method() === "POST" &&
            /\/sales\/api\/v1\/orders\/[^/]+\/returns$/.test(new URL(r.url()).pathname),
        ),
        dialog(page).getByRole("button", { name: "Xác nhận Trả hàng & Hoàn tiền" }).click(),
      ])
      const body = (await response.json()) as {
        items: Array<{ orderItemId: string; quantity: number }>
        refundAmount: number
      }
      expect(response.ok(), `the backend accepted the return: ${JSON.stringify(body)}`).toBe(true)
      expect(body.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ orderItemId: phinItem!.id, quantity: 1 })]),
      )
      expect(body.refundAmount).toBe(catalog.products.phin.price)
      await expect(dialog(page)).toHaveCount(0)
      const banner = page.getByText(/Đã tạo phiếu trả hàng cho đơn/)
      await expect(banner).toContainText(order.code)
      await expect(banner).toContainText(vnd(catalog.products.phin.price))
      await expect(banner).toContainText("Đã nhập lại kho")
      // the UI marks the card 'Đã hoàn trả' in local state as soon as the return is created
      await expect(cardOf(page, order.code)).toContainText("Đã hoàn trả")
    })

    await step("The API stored a completed, restocked return with one Phin and a cash refund", async () => {
      await expect
        .poll(async () => (await gw<ReturnSummary[]>(`/sales/api/v1/returns?orderId=${order.id}`)).length, {
          timeout: 20_000,
        })
        .toBeGreaterThanOrEqual(1)
      const returns = await gw<ReturnSummary[]>(`/sales/api/v1/returns?orderId=${order.id}`)
      const stored = returns.find((r) => r.totalRefundAmount === catalog.products.phin.price)
      expect(stored, "the 65.000 VND return of this order is listed").toBeTruthy()
      expect(stored!.status).toBe("COMPLETED")
      expect(stored!.note).toBe(RETURN_REASON)
      expect(stored!.inventoryReceiptId, "the returned goods were received into stock").toBeTruthy()

      const full = await gw<ReturnDetail>(`/sales/api/v1/returns/${stored!.id}`)
      expect(full.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            orderItemId: phinItem!.id,
            returnQty: "1.000",
            disposition: "RESTOCK",
            refundAmount: catalog.products.phin.price,
          }),
        ]),
      )
      expect(full.refundRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "CASH",
            amount: catalog.products.phin.price,
            status: "CONFIRMED",
          }),
        ]),
      )
    })

    await step("The order's detail shows the Phin returned and the refund recorded", async () => {
      await expect
        .poll(async () => {
          const d = await gw<OrderDetailsApi>(`/sales/api/v1/orders/${order.id}/details`)
          return d.items.find((i) => i.id === phinItem!.id)?.returnedQty
        })
        .toBe("1.000")
      const after = await gw<OrderDetailsApi>(`/sales/api/v1/orders/${order.id}/details`)
      expect(after.refundedAmount).toBe(catalog.products.phin.price)
    })

    await step("The stock of Phin has risen by exactly one in the inventory API", async () => {
      await expect.poll(async () => phinAvailable(await readStock(branchId))).toBe(phinAvailable(before) + 1)
    })

    await step("Reload: the order and the new stock level are still there", async () => {
      // NB: a PARTIAL return does not change the order's server-side status, so the local 'Đã hoàn trả' label
      // of the card goes away on reload; persistence is proved by the return record and the stock delta above.
      await page.reload()
      await expect(page.getByRole("heading", { name: "Đơn hàng", level: 1 })).toBeVisible()
      await searchBox(page).fill(order.code)
      await expect(cardOf(page, order.code)).toBeVisible()
      expect(phinAvailable(await readStock(branchId))).toBeGreaterThanOrEqual(phinAvailable(before) + 1)
    })
  } finally {
    await closeOwnShift(branchId, shiftId)
  }
})

test("F10.3b A return the server refuses is reported as refused", async ({ step }) => {
  test.fixme(
    true,
    "App + backend bug: OrderReturnModal wraps createOrderReturn in .catch(() => null) and always shows 'Đã tạo phiếu trả hàng', " +
      "so a cash return refused with 409 SHIFT_REQUIRED (the cashier has no open shift) looks successful; the backend also " +
      "keeps a COMPLETED return with restock but no refund request in that case. Remove this line when the modal shows the " +
      "server's refusal and the backend makes the return and its refund one unit.",
  )
  await step("A cash return with no open shift shows the refusal and creates no return", async () => {
    // Needs a closed shift for the owner and a returnable order: see F10.3 for how both are arranged
  })
})

test("F10.4 Cancelled filter and an unmatched search show no orders", async ({ page, step }) => {
  await step("Filter by 'Đã hủy' and search for Bích Ngọc: none of our sales is cancelled", async () => {
    await openOrders(page)
    await searchBox(page).fill(customers.ngoc.name)
    await statusFilter(page).selectOption({ label: "Đã hủy" })
    await expect(page.getByText("Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.")).toBeVisible()
    expect(await page.getByRole("article").count()).toBe(0)
  })

  await step("With the status back to 'Tất cả', a search with no match shows the empty state", async () => {
    await statusFilter(page).selectOption({ label: "Tất cả trạng thái" })
    await searchBox(page).fill(NO_MATCH_QUERY)
    await expect(page.getByText("Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.")).toBeVisible()
    expect(await page.getByRole("article").count()).toBe(0)
  })

  await step("Clear the search: the POS sales are listed again after a reload", async () => {
    await searchBox(page).fill("")
    await expect(page.getByRole("article").first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { name: "Đơn hàng", level: 1 })).toBeVisible()
    await expect(page.getByRole("article").first()).toBeVisible()
  })
})
