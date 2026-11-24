import type { Page } from "@playwright/test"
import { gw } from "../support/api"
import { branches, catalog, suppliers, vnd } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F06.1 - F06.4 of flows/FLOWS.md, section 6 of flows/UI-INVENTORY.md: the supplier "Công ty TNHH Nông sản
 * Cầu Đất", a purchase order for 20 Robusta and its two receipts.
 *
 * Needs: 05 (the three products have stock in the main warehouse of "Chi nhánh chính", CN01). Leaves: the supplier
 * "Công ty TNHH Nông sản Cầu Đất" (ACTIVE) and a new, fully received PO per run; Robusta rises by 20 in the main
 * warehouse. The flow text's absolute numbers (36, then 44) assume 24 before this spec; other specs and earlier runs
 * of this file change that baseline, so every stock assertion here is a DELTA against a reading taken just before the
 * receipt (through the inventory API). The PO list grows on every run: each run creates a brand-new PO and matches it
 * by the code returned from the POST response, never by row position. The supplier is created only when missing;
 * an earlier run may have left it without a tax code/note, in which case setup puts those two values back through
 * the API before the edit flows prove the UI keeps them.
 *
 * Local constants (data.ts has no PO quantity/unit price, receipt splits, notes or edited phone): PO_QTY,
 * PO_UNIT_COST, PARTIAL_RECEIVE_QTY, FINAL_RECEIVE_QTY (all from the flow text) and the *_NOTE strings and
 * EDITED_SUPPLIER_PHONE. PO_TOTAL is derived, never hard-coded. Nothing here hard-codes a stock level.
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** F06.2 / F06.3: 20 bags ordered, 12 + 8 received (the flow text's numbers). */
const PO_QTY = 20
const PARTIAL_RECEIVE_QTY = 12
const FINAL_RECEIVE_QTY = 8
/** F06.2: 150.000 VND per bag, so the PO is worth 3.000.000 VND. */
const PO_UNIT_COST = 150000
const PO_TOTAL = PO_QTY * PO_UNIT_COST

/** F06.1: the phone we put in on one run and the data.ts phone we restore on the next, so "Sửa" always changes it. */
const EDITED_SUPPLIER_PHONE = "0263382299"

const SUPPLIER_NOTE = "Cung cấp hạt Robusta Buôn Ma Thuột cho quán, giao định kỳ đầu tháng."
const DUPLICATE_SUPPLIER_NAME = "Nhà cung cấp trùng mã (thử nghiệm)"
const PARTIAL_RECEIVE_NOTE = "Nhận đợt 1: 12 bao Robusta, còn lại 8 bao chưa giao."
const FINAL_RECEIVE_NOTE = "Nhận đợt 2: 8 bao Robusta, hoàn tất đơn mua."

const PAGE_HEADING = "Nhập hàng & nhà cung cấp"

/**
 * The modals of this page are plain <div><section> blocks, not role="dialog" (unlike the inventory forms), so they
 * are scoped by their uniquely named heading, the way spec 05 scopes its stocktake count form.
 */
const modal = (page: Page, title: string) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) })

const supplierRow = (page: Page) => page.getByRole("row").filter({ hasText: suppliers.caudat.code })
const poRow = (page: Page, code: string) => page.getByRole("row").filter({ hasText: code })
const supplierSearch = (page: Page) => page.getByPlaceholder("Tên hoặc mã NCC...")
const poSearch = (page: Page) => page.getByPlaceholder("Mã đơn mua, tên NCC...")

const poPath = "/inventory/api/v1/purchase-orders"
const poAction = (action: string) => new RegExp(`/inventory/api/v1/purchase-orders/[^/]+/${action}$`)

/** Both header buttons and local tabs exist; the tab is the last button with that name (the header one is first). */
async function selectTab(page: Page, tab: "purchases" | "suppliers") {
  await page.getByRole("button", { name: tab === "suppliers" ? "Nhà cung cấp" : "Đơn mua hàng", exact: true }).last().click()
  const header = tab === "suppliers" ? /^Nhà cung cấp$/i : /^Mã đơn$/i
  await expect(page.getByRole("columnheader", { name: header })).toBeVisible()
}

/** Open /suppliers on a tab. */
async function openSuppliers(page: Page, tab: "purchases" | "suppliers" = "purchases") {
  await page.goto("/suppliers")
  await settled(page)
  await expect(page.getByRole("heading", { name: PAGE_HEADING })).toBeVisible()
  await selectTab(page, tab)
}

/** Reload and re-open the tab: the local tab state resets on reload, and a reload is also our persistence proof. */
async function reloadSuppliers(page: Page, tab: "purchases" | "suppliers" = "purchases") {
  await page.reload()
  await settled(page)
  await expect(page.getByRole("heading", { name: PAGE_HEADING })).toBeVisible()
  await selectTab(page, tab)
}

async function filterSupplier(page: Page) {
  await supplierSearch(page).fill(suppliers.caudat.code)
  const row = supplierRow(page)
  await expect(row).toBeVisible()
  return row
}

async function filterPo(page: Page, code: string) {
  await poSearch(page).fill(code)
  const row = poRow(page, code)
  await expect(row).toBeVisible()
  return row
}

async function supplierPhone(): Promise<string> {
  const all = await gw<Array<{ code: string; phone: string | null }>>("/inventory/api/v1/suppliers")
  return all.find((s) => s.code === suppliers.caudat.code)?.phone ?? ""
}

type SupplierDetail = {
  id: string
  code: string
  phone: string | null
  taxCode: string | null
  note: string | null
}

/** The list omits taxCode/note; the detail endpoint is the form's source and our API oracle. */
async function readSupplier(): Promise<SupplierDetail> {
  const all = await gw<Array<{ id: string; code: string }>>("/inventory/api/v1/suppliers")
  const id = all.find((s) => s.code === suppliers.caudat.code)?.id
  expect(id, "the supplier NCC-CAUDAT exists (F06.1)").toBeTruthy()
  return gw<SupplierDetail>(`/inventory/api/v1/suppliers/${id}`)
}

/** Setup only: a run from before the form carried taxCode/note may have left the supplier without them. */
async function ensureSupplierTaxAndNote(): Promise<SupplierDetail> {
  const before = await readSupplier()
  const patch: { taxCode?: string; note?: string } = {}
  if (before.taxCode !== suppliers.caudat.taxCode) patch.taxCode = suppliers.caudat.taxCode
  if (before.note !== SUPPLIER_NOTE) patch.note = SUPPLIER_NOTE
  if (Object.keys(patch).length > 0) {
    await gw(`/inventory/api/v1/suppliers/${before.id}`, { method: "PATCH", body: patch })
  }
  const after = await readSupplier()
  expect(after.taxCode).toBe(suppliers.caudat.taxCode)
  expect(after.note).toBe(SUPPLIER_NOTE)
  return after
}

/** Main warehouse id and Robusta variant id, for reading stock through the inventory API. */
async function stockRefs() {
  const warehouses = await gw<Array<{ id: string; code: string }>>("/inventory/api/v1/warehouses")
  const main = warehouses.find((w) => w.code === branches.main.code)
  expect(main, "spec 04 created the main warehouse CN01").toBeTruthy()
  const variants = await gw<{ data: Array<{ variantId: string; skuCode: string }> }>(
    "/catalog/api/v1/variants?page=1&limit=100&status=active",
  )
  const robusta = variants.data.find((v) => v.skuCode === catalog.products.robusta.sku)
  expect(robusta, "spec 03 created the Robusta variant").toBeTruthy()
  return { warehouseId: main!.id, skuId: robusta!.variantId }
}

/** On-hand Robusta in the main warehouse; a missing balance row is a genuine zero. */
async function readRobustaOnHand(refs: { warehouseId: string; skuId: string }): Promise<number> {
  const stock = await gw<{ warehouses: Array<{ warehouseId: string; onHandQty: string }> }>(
    `/inventory/api/v1/stocks/${refs.skuId}`,
  )
  const row = stock.warehouses.find((w) => w.warehouseId === refs.warehouseId)
  return row ? Number(row.onHandQty) : 0
}

/** Create one brand-new PO through the UI; its code comes from the POST response, so re-runs never match an old row. */
async function createRobustaPo(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Tạo đơn mua", exact: true }).click()
  const form = modal(page, "Tạo đơn mua hàng (PO)")
  await expect(form).toBeVisible()
  await form.getByRole("combobox", { name: /^Nhà cung cấp/ }).selectOption({
    label: `${suppliers.caudat.name} (${suppliers.caudat.code})`,
  })
  await form.getByRole("combobox", { name: /^Kho nhận/ }).selectOption({
    label: `${branches.main.name} (${branches.main.code})`,
  })
  await form.getByPlaceholder("Điều khoản giao hàng, chiết khấu...").fill(suppliers.purchaseOrderNote)
  await form.getByRole("combobox", { name: /^Sản phẩm #1/ }).selectOption({
    label: `${catalog.products.robusta.name} (${catalog.products.robusta.sku})`,
  })
  await form.getByRole("spinbutton", { name: /^Số lượng/ }).fill(String(PO_QTY))
  // Selecting the product pre-fills 65% of its retail price; the flow's 150.000 must be typed explicitly.
  await form.getByRole("spinbutton", { name: /^Đơn giá nhập/ }).fill(String(PO_UNIT_COST))
  await expect(form.getByText(vnd(PO_TOTAL))).toBeVisible()

  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === poPath,
  )
  await form.getByRole("button", { name: "Tạo đơn mua", exact: true }).click()
  const res = await response
  expect(res.ok()).toBe(true)
  const created = (await res.json()) as { code: string; status: string; totalAmount: number }
  expect(created.status).toBe("DRAFT")
  expect(created.totalAmount).toBe(PO_TOTAL)
  expect(created.code).toBeTruthy()
  await expect(form).toHaveCount(0)
  return created.code
}

async function approvePo(page: Page, code: string) {
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && poAction("approve").test(new URL(r.url()).pathname),
  )
  await poRow(page, code).getByRole("button", { name: "Duyệt" }).click()
  expect((await response).ok()).toBe(true)
}

/** Receive `qty` of a PO; `expectedRemaining` is what the modal pre-fills from the PO's remaining quantity. */
async function receivePo(page: Page, code: string, qty: number, note: string, expectedRemaining: number) {
  await poRow(page, code).getByRole("button", { name: "Nhận hàng" }).click()
  const form = modal(page, `Nhận hàng từ đơn mua ${code}`)
  await expect(form).toBeVisible()
  const received = form.getByRole("spinbutton", { name: "SL nhận đợt này" })
  await expect(received).toHaveValue(String(expectedRemaining))
  await received.fill(String(qty))
  await form.getByPlaceholder("Số phiếu giao hàng của NCC, tình trạng kiện hàng...").fill(note)
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && poAction("receive").test(new URL(r.url()).pathname),
  )
  await form.getByRole("button", { name: "Xác nhận nhận hàng & Nhập kho" }).click()
  expect((await response).ok()).toBe(true)
  await expect(form).toHaveCount(0)
}

test("F06.1 Create the supplier, refuse a duplicate code, edit the phone and toggle its status", async ({ page, step }) => {
  await step("Open 'Nhà cung cấp' on the suppliers page", async () => {
    await openSuppliers(page, "suppliers")
  })

  // Another run of this file may already have left the supplier; never create a duplicate and never touch other data.
  if ((await supplierRow(page).count()) === 0) {
    await step("Fill every field of 'Thêm nhà cung cấp' and save", async () => {
      await page.getByRole("button", { name: "Nhà cung cấp", exact: true }).first().click()
      const form = modal(page, "Thêm nhà cung cấp")
      await expect(form).toBeVisible()
      await form.getByRole("textbox", { name: "Mã NCC *" }).fill(suppliers.caudat.code)
      await form.getByRole("textbox", { name: "Tên NCC *" }).fill(suppliers.caudat.name)
      await form.getByRole("textbox", { name: "Điện thoại" }).fill(suppliers.caudat.phone)
      await form.getByRole("textbox", { name: "Email" }).fill(suppliers.caudat.email)
      await form.getByRole("textbox", { name: "Địa chỉ" }).fill(suppliers.caudat.address)
      await form.getByRole("textbox", { name: "Mã số thuế" }).fill(suppliers.caudat.taxCode)
      await form.getByRole("textbox", { name: "Ghi chú" }).fill(SUPPLIER_NOTE)
      const response = page.waitForResponse(
        (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/inventory/api/v1/suppliers",
      )
      await form.getByRole("button", { name: "Lưu nhà cung cấp" }).click()
      expect((await response).ok()).toBe(true)
      await expect(form).toHaveCount(0)
    })
  } else {
    await step("A previous run left the supplier: keep it and restore the tax code/note it may have lost", async () => {
      await expect(supplierRow(page)).toContainText(suppliers.caudat.name)
      await ensureSupplierTaxAndNote()
    })
  }

  await step("Reload: the supplier is listed with its contact details", async () => {
    await reloadSuppliers(page, "suppliers")
    const row = await filterSupplier(page)
    await expect(row).toContainText(suppliers.caudat.name)
    await expect(row).toContainText(suppliers.caudat.email)
    await expect(row).toContainText(suppliers.caudat.address)
    await expect(row).toContainText(await supplierPhone())
    await expect(row).toContainText("Hoạt động")
  })

  await step("The same code a second time is refused with the server's conflict message", async () => {
    await page.getByRole("button", { name: "Nhà cung cấp", exact: true }).first().click()
    const form = modal(page, "Thêm nhà cung cấp")
    await form.getByRole("textbox", { name: "Mã NCC *" }).fill(suppliers.caudat.code)
    await form.getByRole("textbox", { name: "Tên NCC *" }).fill(DUPLICATE_SUPPLIER_NAME)
    await form.getByRole("button", { name: "Lưu nhà cung cấp" }).click()
    // apiError() renders the backend's message: 'Supplier code "NCC-CAUDAT" already exists' / SUPPLIER_CODE_CONFLICT.
    await expect(form.locator("p.text-red-600")).toContainText(/already exists|SUPPLIER_CODE_CONFLICT/i)
    await expect(form).toBeVisible()
    await form.getByRole("button", { name: "Hủy" }).click()
    await expect(form).toHaveCount(0)
    await expect(supplierRow(page)).toHaveCount(1)
  })

  const currentPhone = await supplierPhone()
  const editedPhone = currentPhone === EDITED_SUPPLIER_PHONE ? suppliers.caudat.phone : EDITED_SUPPLIER_PHONE

  await step("Edit the phone through 'Sửa': the form loads the full supplier and the new phone persists", async () => {
    await supplierRow(page).getByRole("button", { name: "Sửa" }).click()
    const form = modal(page, "Cập nhật nhà cung cấp")
    const code = form.getByRole("textbox", { name: "Mã NCC *" })
    await expect(code).toBeDisabled()
    await expect(code).toHaveValue(suppliers.caudat.code)
    // The dialog first shows "Đang tải nhà cung cấp...", then the full record (the list omits these two fields).
    await expect(form.getByRole("textbox", { name: "Mã số thuế" })).toHaveValue(suppliers.caudat.taxCode)
    await expect(form.getByRole("textbox", { name: "Ghi chú" })).toHaveValue(SUPPLIER_NOTE)
    await form.getByRole("textbox", { name: "Điện thoại" }).fill(editedPhone)
    await form.getByRole("button", { name: "Lưu nhà cung cấp" }).click()
    await expect(form).toHaveCount(0)
    await reloadSuppliers(page, "suppliers")
    await expect(await filterSupplier(page)).toContainText(editedPhone)
    const after = await readSupplier()
    expect(after.taxCode).toBe(suppliers.caudat.taxCode)
    expect(after.note).toBe(SUPPLIER_NOTE)
  })

  await step("'Ngừng' then 'Kích hoạt' moves the status label both ways, even after a reload", async () => {
    await expect(supplierRow(page)).toContainText("Hoạt động")
    await supplierRow(page).getByRole("button", { name: "Ngừng", exact: true }).click()
    await expect(supplierRow(page)).toContainText("Ngừng hoạt động")
    await reloadSuppliers(page, "suppliers")
    await expect(supplierRow(page)).toContainText("Ngừng hoạt động")
    await supplierRow(page).getByRole("button", { name: "Kích hoạt", exact: true }).click()
    await expect(supplierRow(page)).toContainText("Hoạt động")
    // Leave it ACTIVE: the PO form only offers active suppliers.
    await reloadSuppliers(page, "suppliers")
    await expect(supplierRow(page)).toContainText("Hoạt động")
  })
})

test("F06.1b Editing a supplier keeps its tax code and note", async ({ page, step }) => {
  let supplier!: SupplierDetail
  await step("Open the supplier list and make sure the tax code and note are there to lose", async () => {
    await openSuppliers(page, "suppliers")
    await expect(supplierRow(page)).toContainText(suppliers.caudat.name)
    supplier = await ensureSupplierTaxAndNote()
  })

  // F06.1 toggled the phone once; toggle it back so "Sửa" always changes a value on a re-run as well.
  const editedPhone = supplier.phone === EDITED_SUPPLIER_PHONE ? suppliers.caudat.phone : EDITED_SUPPLIER_PHONE

  await step("Open 'Sửa' from the row: the form loads the tax code and note from the full record", async () => {
    await filterSupplier(page)
    await supplierRow(page).getByRole("button", { name: "Sửa" }).click()
    const form = modal(page, "Cập nhật nhà cung cấp")
    await expect(form.getByRole("textbox", { name: "Mã NCC *" })).toHaveValue(suppliers.caudat.code)
    await expect(form.getByRole("textbox", { name: "Mã số thuế" })).toHaveValue(suppliers.caudat.taxCode)
    await expect(form.getByRole("textbox", { name: "Ghi chú" })).toHaveValue(SUPPLIER_NOTE)
    await expect(form.getByRole("textbox", { name: "Điện thoại" })).toHaveValue(supplier.phone ?? "")
  })

  await step("Change only the phone, save, reload: the list shows the new phone", async () => {
    const form = modal(page, "Cập nhật nhà cung cấp")
    await form.getByRole("textbox", { name: "Điện thoại" }).fill(editedPhone)
    await form.getByRole("button", { name: "Lưu nhà cung cấp" }).click()
    await expect(form).toHaveCount(0)
    await reloadSuppliers(page, "suppliers")
    await expect(await filterSupplier(page)).toContainText(editedPhone)
  })

  await step("Through the API the supplier still has its tax code and note, and the new phone", async () => {
    const after = await readSupplier()
    expect(after.id).toBe(supplier.id)
    expect(after.phone).toBe(editedPhone)
    expect(after.taxCode).toBe(suppliers.caudat.taxCode)
    expect(after.note).toBe(SUPPLIER_NOTE)
  })

  await step("Open 'Sửa' again: both values are still visible in the form fields", async () => {
    await supplierRow(page).getByRole("button", { name: "Sửa" }).click()
    const form = modal(page, "Cập nhật nhà cung cấp")
    await expect(form.getByRole("textbox", { name: "Mã số thuế" })).toHaveValue(suppliers.caudat.taxCode)
    await expect(form.getByRole("textbox", { name: "Ghi chú" })).toHaveValue(SUPPLIER_NOTE)
    await form.getByRole("button", { name: "Hủy" }).click()
    await expect(form).toHaveCount(0)
  })
})

test("F06.2 A PO of 20 Robusta is drafted with a 3.000.000 total, then approved", async ({ page, step }) => {
  await step("Open the suppliers page on 'Đơn mua hàng'", async () => {
    await openSuppliers(page)
  })

  let code = ""
  await step("Create a new PO for 20 Robusta at 150.000 VND with our supplier and main warehouse", async () => {
    code = await createRobustaPo(page)
  })

  await step("Reload: the new PO is a draft with the right supplier, warehouse and total", async () => {
    await reloadSuppliers(page)
    const row = await filterPo(page, code)
    await expect(row).toContainText(suppliers.caudat.name)
    await expect(row).toContainText(branches.main.name)
    await expect(row).toContainText(vnd(PO_TOTAL))
    await expect(row).toContainText("Nháp")
    await expect(row).toContainText("1 dòng hàng")
  })

  await step("'Duyệt' approves it: 'Đã duyệt', listed under the 'Chờ nhận' filter", async () => {
    await approvePo(page, code)
    await reloadSuppliers(page)
    await expect(await filterPo(page, code)).toContainText("Đã duyệt")
    // The flow text calls this status "Đã duyệt (Chờ nhận)": that is the filter option, while the row badge reads
    // "Đã duyệt". Prove both the badge and the filter show our PO.
    await page.getByRole("combobox").selectOption({ label: "Đã duyệt (Chờ nhận)" })
    await expect(poRow(page, code)).toBeVisible()
  })
})

test("F06.3 Receiving 12 then 8 raises the Robusta stock by exactly 12 and then 8", async ({ page, step }) => {
  let refs!: { warehouseId: string; skuId: string }
  let before = 0
  await step("Read the main warehouse's Robusta stock through the inventory API before receiving", async () => {
    await openSuppliers(page)
    refs = await stockRefs()
    before = await readRobustaOnHand(refs)
  })

  let code = ""
  await step("Create and approve a fresh PO of 20 Robusta for this receipt", async () => {
    code = await createRobustaPo(page)
    await reloadSuppliers(page)
    await filterPo(page, code)
    await approvePo(page, code)
    await reloadSuppliers(page)
    await expect(await filterPo(page, code)).toContainText("Đã duyệt")
  })

  await step("Receive 12 of the 20: 'Nhận một phần' and the stock rises by 12", async () => {
    await receivePo(page, code, PARTIAL_RECEIVE_QTY, PARTIAL_RECEIVE_NOTE, PO_QTY)
    await reloadSuppliers(page)
    await expect(await filterPo(page, code)).toContainText("Nhận một phần")
    expect(await readRobustaOnHand(refs)).toBe(before + PARTIAL_RECEIVE_QTY)
  })

  await step("Receive the remaining 8: 'Đã nhận đủ' and the stock rises by a further 8", async () => {
    await receivePo(page, code, FINAL_RECEIVE_QTY, FINAL_RECEIVE_NOTE, FINAL_RECEIVE_QTY)
    await reloadSuppliers(page)
    await expect(await filterPo(page, code)).toContainText("Đã nhận đủ")
    const after = await readRobustaOnHand(refs)
    expect(after).toBe(before + PARTIAL_RECEIVE_QTY + FINAL_RECEIVE_QTY)
    expect(after).toBe(before + PO_QTY)
  })
})

test("F06.4 A PO with no product line is refused before anything is created", async ({ page, step }) => {
  let posts = 0
  page.on("response", (r) => {
    if (r.request().method() === "POST" && new URL(r.url()).pathname === poPath) posts++
  })
  const validationMessage = () =>
    page.evaluate(() => {
      const el = document.activeElement as (HTMLInputElement | HTMLSelectElement) | null
      return el?.validationMessage ?? ""
    })

  await step("Open the PO form and leave its only line without a product", async () => {
    await openSuppliers(page)
    await page.getByRole("button", { name: "Tạo đơn mua", exact: true }).click()
    const form = modal(page, "Tạo đơn mua hàng (PO)")
    await expect(form).toBeVisible()
    await expect(form.getByRole("combobox", { name: /^Sản phẩm #1/ })).toHaveValue("")
  })

  await step("Submit: the form refuses it with a validation message and sends no PO", async () => {
    const form = modal(page, "Tạo đơn mua hàng (PO)")
    await form.getByRole("button", { name: "Tạo đơn mua", exact: true }).click()
    await expect(form).toBeVisible()
    // UX finding: the line inputs carry `required`, so the browser blocks the submit before the app's own
    // "Vui lòng chọn sản phẩm, số lượng (>0) và đơn giá hợp lệ cho mọi dòng." can render. The user still gets a
    // validation message on the focused control, and no document is created.
    expect((await validationMessage()).length).toBeGreaterThan(0)
    expect(posts).toBe(0)
  })

  await step("Choosing a supplier but still no product is refused as well", async () => {
    const form = modal(page, "Tạo đơn mua hàng (PO)")
    await form.getByRole("combobox", { name: /^Nhà cung cấp/ }).selectOption({
      label: `${suppliers.caudat.name} (${suppliers.caudat.code})`,
    })
    await form.getByRole("spinbutton", { name: /^Đơn giá nhập/ }).fill(String(PO_UNIT_COST))
    await form.getByRole("button", { name: "Tạo đơn mua", exact: true }).click()
    await expect(form).toBeVisible()
    expect((await validationMessage()).length).toBeGreaterThan(0)
    expect(posts).toBe(0)
  })

  await step("Cancel: no purchase order was added", async () => {
    const form = modal(page, "Tạo đơn mua hàng (PO)")
    await form.getByRole("button", { name: "Hủy" }).click()
    await expect(form).toHaveCount(0)
    await reloadSuppliers(page)
    expect(posts).toBe(0)
  })
})
