import type { Page, Response } from "@playwright/test"
import { branches, catalog, inventory } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F05.1 - F05.3 of flows/FLOWS.md, section 5 of flows/UI-INVENTORY.md: the extra warehouse, the internal
 * transfer and the stocktake of "Cửa hàng Cà Phê Hạt Mộc".
 *
 * Needs: 04 (Arabica 40, Robusta 25, Phin 60 in the main warehouse of "Chi nhánh chính"). Leaves: the warehouse
 * "Kho Quận 3" (KHO-Q3). The first run leaves Arabica 35 in the main warehouse (five are now in Kho Quận 3) and
 * Robusta 24; a re-run performs the same flows again, so those absolute numbers drift and the specs after this one
 * must work with deltas (as agreed for the shared, re-runnable store).
 *
 * Re-runnable: KHO-Q3 is created only when it is missing (the create form is still opened so the upper-casing of the
 * code is proved on every run), every document is new and identified by the code returned from its POST, and every
 * stock expectation is a delta against a quantity read just before the action. The flow text's absolute numbers are
 * asserted as well, but only on a first run where the "before" reading is still inventory.openingStock.
 *
 * Local constants (data.ts has no transfer quantity, note texts or stocktake adjustment): TRANSFER_ARABICA_QTY is
 * the five bags of F05.2, STOCKTAKE_SHORTFALL is the "one fewer" of F05.3, and the two *_NOTE strings are the
 * human-readable notes typed into the documents. Nothing here hard-codes a stock level: the first-run expectations
 * are computed from inventory.openingStock.
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** F05.2: the five Arabica bags moved from the main warehouse to Kho Quận 3. */
const TRANSFER_ARABICA_QTY = 5

/** F05.2: note of the transfer (no such note exists in data.ts). */
const TRANSFER_NOTE = "Chuyển Arabica về kho Quận 3 để bán tại quầy, đối soát cuối ngày"

/** F05.3: the stocktake counts one unit fewer than the on-hand quantity (25 -> 24 on a first run). */
const STOCKTAKE_SHORTFALL = 1

/** F05.3: note of the stocktake. */
const STOCKTAKE_NOTE = "Kiểm kho cuối ngày, đối chiếu số đếm thực tế của Robusta"

const arabica = catalog.products.arabica
const robusta = catalog.products.robusta

/** Both the toolbar select and the document forms print warehouses as "name (code)". */
const mainWarehouse = { label: `${branches.main.name} (${branches.main.code})`, code: branches.main.code }
const q3Warehouse = { label: `${inventory.warehouse.name} (${inventory.warehouse.code})`, code: inventory.warehouse.code }

const docRow = (page: Page, code: string) => page.getByRole("row").filter({ hasText: code })
const transferPath = /\/inventory\/api\/v1\/stock-transfers$/
const transferAction = (action: string) => new RegExp(`/inventory/api/v1/stock-transfers/[^/]+/${action}$`)
const stocktakePath = /\/inventory\/api\/v1\/stocktakes$/
const stocktakeAction = (action: string) => new RegExp(`/inventory/api/v1/stocktakes/[^/]+/${action}$`)

/** "40" / "1.000" as printed by the tables -> a number, so we can compare with data.ts. */
function parseQty(text: string): number {
  return Number(text.replace(/\./g, "").replace(/[^\d-]/g, ""))
}

/** The created document's code comes back in the POST response and finds its row after a reload. */
async function createdCode(response: Response): Promise<string> {
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { code: string }
  expect(body.code).toBeTruthy()
  return body.code
}

/** Both toolbar selects are set explicitly: a reload resets them to their placeholders/defaults. */
async function selectBranchAndWarehouse(page: Page, warehouse: { label: string; code: string }) {
  const branch = page.getByRole("combobox", { name: /^Chi nhánh/ })
  await expect(branch).toBeVisible()
  await branch.selectOption({ label: mainWarehouse.label })
  const select = page.getByRole("combobox", { name: /^Kho thao tác/ })
  await expect(select).toBeVisible()
  await select.selectOption({ label: warehouse.label })
}

/** Open /inventory on a tab. A reload resets the toolbar, so always re-select afterwards. */
async function openInventory(page: Page, tab: string) {
  await page.goto(`/inventory?tab=${tab}`)
  await settled(page)
  await expect(page.getByRole("heading", { name: "Tồn kho", level: 1 })).toBeVisible()
  await selectBranchAndWarehouse(page, mainWarehouse)
}

const selectTab = (page: Page, name: string) => page.getByRole("tab", { name }).click()

/**
 * Select a warehouse in the toolbar. React Query keeps the balances of an already visited warehouse in its cache
 * (switching back to the main warehouse sends no new request), so `settled()` - not a response wait - is the sync
 * point: it waits for the refetch of a new warehouse and for the cached rows of an old one to be ready.
 */
async function selectBalanceWarehouse(page: Page, warehouse: { label: string; code: string }) {
  await page.getByRole("combobox", { name: /^Kho thao tác/ }).selectOption({ label: warehouse.label })
  await settled(page)
}

/**
 * Read one SKU's on-hand ("Tồn") cell on the "Tồn theo kho" tab for the given warehouse. The row is matched by both
 * SKU and warehouse code so cached rows of the previously selected warehouse can never be read by mistake. A
 * warehouse with no balance row yet (Kho Quận 3 before the transfer is received) is a genuine zero, not a missing
 * element.
 */
async function readBalance(page: Page, warehouse: { label: string; code: string }, sku: string): Promise<number> {
  await expect(page.getByRole("tab", { name: "Tồn theo kho" })).toHaveAttribute("aria-selected", "true")
  await selectBalanceWarehouse(page, warehouse)
  const row = page.getByRole("row").filter({ hasText: sku }).filter({ hasText: warehouse.code })
  const empty = page.getByText("Chưa có dữ liệu.", { exact: true })
  await expect.poll(async () => (await row.count()) > 0 || (await empty.isVisible())).toBe(true)
  if ((await row.count()) === 0) return 0
  return parseQty(await row.first().getByRole("cell").nth(2).innerText())
}

/** Read a document's note through "Chi tiết" (an extra persistence proof), then close the modal. */
async function expectNote(page: Page, code: string, note: string) {
  await docRow(page, code).getByRole("button", { name: "Chi tiết" }).click()
  const modal = page.locator("section").filter({ has: page.getByRole("heading", { name: `Chi tiết phiếu ${code}` }) })
  await expect(modal).toContainText(note)
  // these modals have an unlabelled X button; it is the first button in the section
  await modal.getByRole("button").first().click()
  await expect(modal).toHaveCount(0)
}

/** Reload, re-open the tab/warehouse used by a document flow and find its (possibly new) row again. */
async function reloadDocument(page: Page, tab: string, code: string, warehouse = mainWarehouse) {
  await page.reload()
  await settled(page)
  await selectBranchAndWarehouse(page, warehouse)
  await selectTab(page, tab)
  const row = docRow(page, code)
  await expect(row).toBeVisible()
  return row
}

test("F05.1 The central warehouse 'Kho Quận 3' is listed and its code is upper-cased", async ({ page, step }) => {
  await step("Open 'Danh sách kho' in the inventory", async () => {
    await page.goto("/inventory?tab=warehouses")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Tồn kho", level: 1 })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Danh sách kho" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("row").filter({ hasText: branches.main.code })).toBeVisible()
  })

  const existing = await docRow(page, inventory.warehouse.code).count()

  await step("Open 'Thêm kho' and type the code in lower case: the field upper-cases it", async () => {
    await page.getByRole("button", { name: "Thêm kho" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Thêm kho mới" })).toBeVisible()
    const code = dialog.getByRole("textbox", { name: /^Mã kho/ })
    await code.fill(inventory.warehouse.code.toLowerCase())
    await expect(code).toHaveValue(inventory.warehouse.code)
  })

  if (existing === 0) {
    await step("Fill the name, choose 'Kho trung tâm' and create the warehouse", async () => {
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox", { name: /^Tên kho/ }).fill(inventory.warehouse.name)
      await dialog.getByRole("combobox", { name: "Loại kho" }).selectOption({ label: "Kho trung tâm" })
      const response = page.waitForResponse(
        (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/inventory/api/v1/warehouses",
      )
      await dialog.getByRole("button", { name: "Tạo kho" }).click()
      expect((await response).ok()).toBe(true)
      await expect(dialog).toBeHidden()
    })
  } else {
    await step("A previous run already created it: close the form without making a duplicate", async () => {
      await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click()
      await expect(page.getByRole("dialog")).toBeHidden()
    })
  }

  await step("Reload: the warehouse is listed as a central, active, non-default warehouse", async () => {
    await page.reload()
    await settled(page)
    await expect(page.getByRole("tab", { name: "Danh sách kho" })).toHaveAttribute("aria-selected", "true")
    const row = docRow(page, inventory.warehouse.code)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(inventory.warehouse.name)
    await expect(row).toContainText("Trung tâm")
    await expect(row).toContainText("Hoạt động")
    await expect(row).toContainText("Không")
  })

  await step("It is offered in the toolbar's warehouse selector for the next flows", async () => {
    await expect(page.getByRole("combobox", { name: /^Kho thao tác/ })).toContainText(q3Warehouse.label)
  })
})

test("F05.2 Five Arabica are dispatched from the main warehouse and received in Kho Quận 3", async ({ page, step }) => {
  let mainBefore = 0
  let q3Before = 0
  await step("Read the Arabica balance of both warehouses before the transfer", async () => {
    await openInventory(page, "balances")
    q3Before = await readBalance(page, q3Warehouse, arabica.sku)
    mainBefore = await readBalance(page, mainWarehouse, arabica.sku)
  })

  let code = ""
  await step("Create a draft transfer of five Arabica from the main warehouse to Kho Quận 3", async () => {
    await selectBranchAndWarehouse(page, mainWarehouse)
    await selectTab(page, "Chuyển kho")
    await page.getByRole("button", { name: "Tạo phiếu chuyển" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Tạo phiếu chuyển kho" })).toBeVisible()
    await dialog.getByRole("combobox", { name: /^Kho xuất/ }).selectOption({ label: mainWarehouse.label })
    await dialog.getByRole("combobox", { name: /^Kho nhận/ }).selectOption({ label: q3Warehouse.label })
    await dialog
      .getByRole("combobox", { name: /^Sản phẩm #1/ })
      .selectOption({ label: `${arabica.name} (${arabica.sku})` })
    await dialog.getByRole("spinbutton", { name: /^Số lượng/ }).first().fill(String(TRANSFER_ARABICA_QTY))
    await dialog.getByPlaceholder("Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...").fill(TRANSFER_NOTE)
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && transferPath.test(new URL(r.url()).pathname),
    )
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    code = await createdCode(await response)
    await expect(dialog).toBeHidden()
  })

  await step("Reload: the transfer is a 'Nháp' with our note and the right warehouse route", async () => {
    const row = await reloadDocument(page, "Chuyển kho", code)
    await expect(row).toContainText("Nháp")
    await expect(row).toContainText(`${branches.main.name} → ${inventory.warehouse.name}`)
    await expectNote(page, code, TRANSFER_NOTE)
  })

  await step("'Xuất chuyển' moves it to 'Đang chuyển'", async () => {
    const row = docRow(page, code)
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && transferAction("dispatch").test(new URL(r.url()).pathname),
    )
    await row.getByRole("button", { name: "Xuất chuyển" }).click()
    expect((await response).ok()).toBe(true)
    const reloaded = await reloadDocument(page, "Chuyển kho", code)
    await expect(reloaded).toContainText("Đang chuyển")
  })

  await step("'Nhận hàng' receives the five bags and moves the transfer to 'Đã nhận'", async () => {
    await docRow(page, code).getByRole("button", { name: "Nhận hàng" }).click()
    const modal = page.locator("section").filter({ has: page.getByRole("heading", { name: `Nhận chuyển kho ${code}` }) })
    await expect(modal).toBeVisible()
    // The form pre-fills the whole in-transit amount (e.g. "5.000"), which the flow expects to be received.
    await expect(modal.getByRole("spinbutton", { name: "Thực nhận" })).toHaveValue(
      TRANSFER_ARABICA_QTY.toFixed(3),
    )
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && transferAction("receive").test(new URL(r.url()).pathname),
    )
    await modal.getByRole("button", { name: "Xác nhận nhận hàng" }).click()
    expect((await response).ok()).toBe(true)
    await expect(modal).toHaveCount(0)
    const reloaded = await reloadDocument(page, "Chuyển kho", code)
    await expect(reloaded).toContainText("Đã nhận")
  })

  await step("Balances by warehouse: the main lost five and Kho Quận 3 gained five", async () => {
    await selectTab(page, "Tồn theo kho")
    const q3After = await readBalance(page, q3Warehouse, arabica.sku)
    const mainAfter = await readBalance(page, mainWarehouse, arabica.sku)
    expect(mainAfter).toBe(mainBefore - TRANSFER_ARABICA_QTY)
    expect(q3After).toBe(q3Before + TRANSFER_ARABICA_QTY)
    if (mainBefore === inventory.openingStock.arabica) {
      // First run: 40 - 5 = 35 at the main warehouse, 0 + 5 = 5 in Kho Quận 3 (the flow text's numbers).
      expect(mainAfter).toBe(inventory.openingStock.arabica - TRANSFER_ARABICA_QTY)
      expect(q3After).toBe(TRANSFER_ARABICA_QTY)
    }
  })
})

test("F05.3 A stocktake of the main warehouse counts Robusta one short and posts the adjustment", async ({ page, step }) => {
  let before = 0
  await step("Read the Robusta balance of the main warehouse before the stocktake", async () => {
    await openInventory(page, "balances")
    before = await readBalance(page, mainWarehouse, robusta.sku)
  })
  // One fewer than the quantity just read: 24 on a first run (25 - 1), always a real variance to post.
  const counted = before - STOCKTAKE_SHORTFALL

  let code = ""
  await step("Create a draft stocktake for the main warehouse, scoped to Robusta", async () => {
    await selectBranchAndWarehouse(page, mainWarehouse)
    await selectTab(page, "Kiểm kho")
    await page.getByRole("button", { name: "Tạo phiếu kiểm" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Tạo phiếu kiểm kho" })).toBeVisible()
    await dialog.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: mainWarehouse.label })
    await dialog
      .getByRole("checkbox", { name: new RegExp(`${robusta.name} \\(${robusta.sku}\\)`) })
      .check()
    await dialog.getByPlaceholder("Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...").fill(STOCKTAKE_NOTE)
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && stocktakePath.test(new URL(r.url()).pathname),
    )
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    code = await createdCode(await response)
    await expect(dialog).toBeHidden()
  })

  await step("Reload: the stocktake is a 'Nháp' with our note", async () => {
    const row = await reloadDocument(page, "Kiểm kho", code)
    await expect(row).toContainText("Nháp")
    await expectNote(page, code, STOCKTAKE_NOTE)
  })

  await step("'Nhập số đếm' records the counted quantity and moves the stocktake to 'Đang kiểm'", async () => {
    await docRow(page, code).getByRole("button", { name: "Nhập số đếm" }).click()
    // UX finding: this count form (InventoryForms.StocktakeCountForm) is a plain <div><form> - unlike the create
    // form it has no role="dialog" - so scope it by the form containing its uniquely named heading.
    const modal = page.locator("form").filter({ has: page.getByRole("heading", { name: `Ghi nhận kiểm kho ${code}` }) })
    await expect(modal).toBeVisible()
    await modal.getByRole("spinbutton", { name: new RegExp(robusta.sku) }).fill(String(counted))
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && stocktakeAction("counts").test(new URL(r.url()).pathname),
    )
    await modal.getByRole("button", { name: "Lưu số đếm" }).click()
    expect((await response).ok()).toBe(true)
    await expect(modal).toHaveCount(0)
    const reloaded = await reloadDocument(page, "Kiểm kho", code)
    await expect(reloaded).toContainText("Đang kiểm")
  })

  await step("'Duyệt' approves it: status 'Đã duyệt' and the Robusta balance falls by one", async () => {
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && stocktakeAction("approve").test(new URL(r.url()).pathname),
    )
    await docRow(page, code).getByRole("button", { name: "Duyệt" }).click()
    expect((await response).ok()).toBe(true)
    const reloaded = await reloadDocument(page, "Kiểm kho", code)
    await expect(reloaded).toContainText("Đã duyệt")
    await selectTab(page, "Tồn theo kho")
    const after = await readBalance(page, mainWarehouse, robusta.sku)
    expect(after).toBe(before - STOCKTAKE_SHORTFALL)
    expect(after).toBe(counted)
    if (before === inventory.openingStock.robusta) {
      // First run: 25 - 1 = 24, the flow text's final Robusta number.
      expect(after).toBe(inventory.openingStock.robusta - STOCKTAKE_SHORTFALL)
    }
  })

  await step("'Sổ kho' shows the shortfall as a 'Kiểm kho' adjustment for this document", async () => {
    await selectTab(page, "Sổ kho")
    const adjustment = page
      .getByRole("row")
      .filter({ hasText: robusta.sku })
      .filter({ hasText: "Kiểm kho" })
      .filter({ hasText: `-${STOCKTAKE_SHORTFALL}` })
      .filter({ hasText: code })
    await expect(adjustment.first()).toBeVisible()
  })
})
