import type { Locator, Page, Response } from "@playwright/test"
import { branches, catalog, inventory } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F04.1 - F04.6 of flows/FLOWS.md: the stock of "Cửa hàng Cà Phê Hạt Mộc" - the opening receipt, the
 * submit/approve path, the damaged-goods issue, the ledger/movements, the thresholds and the form validations.
 *
 * Needs: 03 (the three active products with one variant each). Leaves: the main warehouse's stock is exactly
 * inventory.openingStock (Arabica 40, Robusta 25, Phin 60): F04.1 adds the opening quantities, F04.2 adds one phin
 * and F04.3 issues that same phin again, so the net effect of F04.2 + F04.3 is zero.
 *
 * Re-runnable on the shared store: F04.1 only posts the opening receipt when the stock is still empty. A second run
 * finds the 40/25/60 already there, skips that one posting (with the exact assertion in it), and proves the existing
 * posted receipt instead. Every other quantity assertion is a delta against a single reading taken just before the
 * action, so another run adds +1 phin and then takes it back without drifting the opening stock.
 *
 * Local constants (data.ts has no notes or threshold value for this section): DRAFT_RECEIPT_NOTE, ISSUE_NOTE and
 * ARABICA_MIN_THRESHOLD (derived from inventory.openingStock, never a hard-coded stock number).
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** Note of the small draft receipt of F04.2 (no such note exists in data.ts). */
const DRAFT_RECEIPT_NOTE = "Nhập bổ sung 1 phin nhôm, chờ duyệt kho"

/** Note of the damaged-goods issue of F04.3. */
const ISSUE_NOTE = "Phin nhôm bị móp khi vận chuyển, xuất hủy"

/** The minimum stock we require for Arabica in F04.5: a quarter of its opening stock (40 / 4 = 10). */
const ARABICA_MIN_THRESHOLD = Math.floor(inventory.openingStock.arabica / 4)

type StockKey = keyof typeof inventory.openingStock
const stockKeys: StockKey[] = ["arabica", "robusta", "phin"]

/** The branch/warehouse the store was created with; both toolbar selects print "name (code)". */
const mainOption = `${branches.main.name} (${branches.main.code})`

const productRow = (page: Page, sku: string) => page.getByRole("row").filter({ hasText: sku })
const docRow = (page: Page, code: string) => page.getByRole("row").filter({ hasText: code })
const receiptPath = /\/inventory\/api\/v1\/stock-receipts$/
const postToReceipt = (action: string) =>
  new RegExp(`/inventory/api/v1/stock-receipts/[^/]+/${action}$`)

/** "40" / "1.000" as printed by the tables -> a number, so we can compare with data.ts. */
function parseQty(text: string): number {
  return Number(text.replace(/\./g, "").replace(/[^\d-]/g, ""))
}

/** Both toolbar selects are set explicitly: stock and document queries need the main branch and its warehouse. */
async function selectBranchAndWarehouse(page: Page) {
  const branch = page.getByRole("combobox", { name: /^Chi nhánh/ })
  await expect(branch).toBeVisible()
  await branch.selectOption({ label: mainOption })
  const warehouse = page.getByRole("combobox", { name: /^Kho thao tác/ })
  await expect(warehouse).toBeVisible()
  await warehouse.selectOption({ label: mainOption })
}

/** Open /inventory on a tab. A reload resets the toolbar to its placeholder, so always re-select afterwards. */
async function openInventory(page: Page, tab: string) {
  await page.goto(`/inventory?tab=${tab}`)
  await settled(page)
  await expect(page.getByRole("heading", { name: "Tồn kho", level: 1 })).toBeVisible()
  await selectBranchAndWarehouse(page)
}

const selectTab = (page: Page, name: string) => page.getByRole("tab", { name }).click()

/**
 * Read the three on-hand quantities from the "Tồn kho" tab in one go. On a fresh store the stock table has no rows
 * at all ("Chưa có dữ liệu..."), which is a genuine zero, not a missing element.
 */
async function readStock(page: Page): Promise<Record<StockKey, number>> {
  const previous = await page.getByRole("tab", { selected: true }).innerText()
  await selectTab(page, "Tồn kho")
  const empty = page.getByText("Chưa có dữ liệu trong phân hệ này")
  await expect(empty.or(page.getByRole("row").nth(1)).first()).toBeVisible()
  const result = {} as Record<StockKey, number>
  for (const key of stockKeys) {
    const row = productRow(page, catalog.products[key].sku)
    result[key] = (await row.count()) === 0 ? 0 : parseQty(await row.getByRole("cell").nth(2).innerText())
  }
  if (previous !== "Tồn kho") await selectTab(page, previous)
  return result
}

/** Fill `Sản phẩm #n` and `Số lượng` of each line of a document form (receipt unit costs are left optional). */
async function fillLines(
  dialog: Locator,
  lines: Array<{ product: { name: string; sku: string }; qty: number }>,
) {
  for (const [index, line] of lines.entries()) {
    if (index > 0) await dialog.getByRole("button", { name: "Thêm dòng SKU" }).click()
    await dialog
      .getByRole("combobox", { name: new RegExp(`^Sản phẩm #${index + 1}`) })
      .selectOption({ label: `${line.product.name} (${line.product.sku})` })
    await dialog.getByRole("spinbutton", { name: /^Số lượng/ }).nth(index).fill(String(line.qty))
  }
}

/** The created document's code comes back in the POST response and is used to find its row after a reload. */
async function createdCode(response: Response): Promise<string> {
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { code: string }
  expect(body.code).toBeTruthy()
  return body.code
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

test("F04.1 An opening receipt is posted and the stock tab shows the opening quantities", async ({ page, step }) => {
  await step("Open the inventory and set the main branch and its warehouse", async () => {
    await openInventory(page, "stock")
  })

  let before: Record<StockKey, number>
  await step("Read the stock once, before the receipt, for all three products", async () => {
    before = await readStock(page)
  })

  // The only exact stock assertion in this file. On a re-run the opening receipt and its 40/25/60 are already in the
  // store; posting them again would double the stock and break 05, 06, 09 and 10, so we skip both the posting and the
  // exact assertion and only prove the old receipt is still there. "before" is then already openingStock.
  const firstRun = stockKeys.every((key) => before[key] === 0)
  let openingCode = ""

  if (firstRun) {
    await step("Create the receipt for all three products with 'Tạo & Ghi sổ ngay'", async () => {
      await selectTab(page, "Nhập kho")
      await page.getByRole("button", { name: "Tạo phiếu nhập" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByRole("heading", { name: "Tạo phiếu nhập kho" })).toBeVisible()
      await dialog.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: mainOption })
      await fillLines(
        dialog,
        stockKeys.map((key) => ({ product: catalog.products[key], qty: inventory.openingStock[key] })),
      )
      await dialog
        .getByPlaceholder("Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...")
        .fill(inventory.receiptNote)
      await dialog.getByRole("checkbox", { name: /Ghi sổ ngay sau khi tạo phiếu/ }).check()
      const submit = dialog.getByRole("button", { name: "Tạo & Ghi sổ ngay" })
      await expect(submit).toBeVisible()
      const response = page.waitForResponse((r) => r.request().method() === "POST" && receiptPath.test(new URL(r.url()).pathname))
      await submit.click()
      openingCode = await createdCode(await response)
      await expect(dialog).toBeHidden()
    })

    await step("Reload: the receipt is listed as 'Đã ghi sổ' with our note", async () => {
      await page.reload()
      await settled(page)
      await selectBranchAndWarehouse(page)
      await selectTab(page, "Nhập kho")
      const row = docRow(page, openingCode)
      await expect(row).toBeVisible()
      await expect(row).toContainText("Đã ghi sổ")
      await expect(row).toContainText("3 dòng hàng")
      await expectNote(page, openingCode, inventory.receiptNote)
    })
  } else {
    await step("Re-run: the opening receipt is already posted - do not post it a second time", async () => {
      await selectTab(page, "Nhập kho")
      // the first run left one posted receipt with three lines and our note; find it, don't create another one
      const posted = page.getByRole("row").filter({ hasText: "3 dòng hàng" }).filter({ hasText: "Đã ghi sổ" })
      await expect(posted.first()).toBeVisible()
      const code = (await posted.first().getByRole("cell").first().innerText()).split("\n")[0].trim()
      await expectNote(page, code, inventory.receiptNote)
    })
  }

  await step("The stock tab shows exactly the opening stock of each product", async () => {
    const after = await readStock(page)
    for (const key of stockKeys) {
      // numbers come from data.ts: 0 + 40, 0 + 25, 0 + 60 on the first run
      expect(after[key]).toBe(before[key] + (firstRun ? inventory.openingStock[key] : 0))
      if (firstRun) expect(after[key]).toBe(inventory.openingStock[key])
    }
  })
})

test("F04.2 A draft receipt goes through 'Gửi duyệt' and 'Duyệt' and only posting raises the stock", async ({ page, step }) => {
  let before: Record<StockKey, number>
  await step("Open the inventory and read the stock before the draft", async () => {
    await openInventory(page, "receipts")
    before = await readStock(page)
  })

  let code = ""
  await step("Create a draft receipt for one phin, without 'Ghi sổ ngay'", async () => {
    await selectTab(page, "Nhập kho")
    await page.getByRole("button", { name: "Tạo phiếu nhập" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: mainOption })
    await fillLines(dialog, [{ product: catalog.products.phin, qty: 1 }])
    await dialog
      .getByPlaceholder("Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...")
      .fill(DRAFT_RECEIPT_NOTE)
    const response = page.waitForResponse((r) => r.request().method() === "POST" && receiptPath.test(new URL(r.url()).pathname))
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    code = await createdCode(await response)
    await expect(dialog).toBeHidden()
  })

  await step("Reload: the new receipt is a 'Nháp' and the stock has not moved", async () => {
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Nhập kho")
    await expect(docRow(page, code)).toContainText("Nháp")
    const unchanged = await readStock(page)
    for (const key of stockKeys) expect(unchanged[key]).toBe(before[key])
  })

  await step("'Gửi duyệt' moves it to 'Chờ duyệt' without touching the stock", async () => {
    await selectTab(page, "Nhập kho")
    const response = page.waitForResponse((r) => r.request().method() === "POST" && postToReceipt("submit").test(new URL(r.url()).pathname))
    await docRow(page, code).getByRole("button", { name: "Gửi duyệt" }).click()
    expect((await response).ok()).toBe(true)
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Nhập kho")
    await expect(docRow(page, code)).toContainText("Chờ duyệt")
    const unchanged = await readStock(page)
    for (const key of stockKeys) expect(unchanged[key]).toBe(before[key])
  })

  await step("'Duyệt' posts it: status 'Đã ghi sổ' and the phin stock is before + 1", async () => {
    // approving a pending receipt posts the stock in this backend; no separate "Ghi sổ" button exists in that state
    await selectTab(page, "Nhập kho")
    const response = page.waitForResponse((r) => r.request().method() === "POST" && postToReceipt("approve").test(new URL(r.url()).pathname))
    await docRow(page, code).getByRole("button", { name: "Duyệt" }).click()
    expect((await response).ok()).toBe(true)
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Nhập kho")
    await expect(docRow(page, code)).toContainText("Đã ghi sổ")
    const after = await readStock(page)
    expect(after.phin).toBe(before.phin + 1)
    expect(after.arabica).toBe(before.arabica)
    expect(after.robusta).toBe(before.robusta)
    // from the opening stock this is 61; F04.3 removes exactly this one phin again
  })
})

test("F04.3 A 'Hàng hỏng' issue for one phin is posted and takes that phin back out", async ({ page, step }) => {
  let before: Record<StockKey, number>
  await step("Open the issues tab and read the stock before the issue", async () => {
    await openInventory(page, "issues")
    before = await readStock(page)
  })

  let code = ""
  await step("Create a draft issue with reason 'Hàng hỏng' for one phin", async () => {
    await selectTab(page, "Xuất kho")
    await page.getByRole("button", { name: "Tạo phiếu xuất" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Tạo phiếu xuất kho" })).toBeVisible()
    await dialog.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: mainOption })
    await dialog.getByRole("combobox", { name: /^Lý do xuất/ }).selectOption({ label: "Hàng hỏng" })
    await fillLines(dialog, [{ product: catalog.products.phin, qty: 1 }])
    await dialog
      .getByPlaceholder("Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...")
      .fill(ISSUE_NOTE)
    const response = page.waitForResponse((r) => r.request().method() === "POST" && /\/inventory\/api\/v1\/stock-issues$/.test(new URL(r.url()).pathname))
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    const body = (await (await response).json()) as { code: string; reasonCode: string }
    expect(body.reasonCode).toBe("DAMAGED")
    code = body.code
    await expect(dialog).toBeHidden()
  })

  await step("Reload: the issue is a 'Nháp' with our note", async () => {
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Xuất kho")
    await expect(docRow(page, code)).toContainText("Nháp")
    await expectNote(page, code, ISSUE_NOTE)
  })

  await step("'Ghi sổ' posts it: status 'Đã ghi sổ' and the phin stock is before - 1", async () => {
    const response = page.waitForResponse((r) => r.request().method() === "POST" && /\/inventory\/api\/v1\/stock-issues\/[^/]+\/post$/.test(new URL(r.url()).pathname))
    await docRow(page, code).getByRole("button", { name: "Ghi sổ" }).click()
    expect((await response).ok()).toBe(true)
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Xuất kho")
    await expect(docRow(page, code)).toContainText("Đã ghi sổ")
    const after = await readStock(page)
    // F04.2 added one phin to this same baseline, so this restores inventory.openingStock.phin (60)
    expect(after.phin).toBe(before.phin - 1)
    expect(after.arabica).toBe(before.arabica)
    expect(after.robusta).toBe(before.robusta)
  })
})

test("F04.4 The ledger and the stock movements show the receipt lines and the issue", async ({ page, step }) => {
  await step("Open 'Sổ kho' for the main branch", async () => {
    await openInventory(page, "ledger")
    await expect(page.getByRole("row").filter({ hasText: "Nhập kho" }).first()).toBeVisible()
  })

  await step("The three opening receipt lines are in the ledger with their data.ts quantities", async () => {
    for (const key of stockKeys) {
      const product = catalog.products[key]
      // there are several "Nhập kho" rows for the phin (the +1 of F04.2), so match the delta as well
      const row = productRow(page, product.sku)
        .filter({ hasText: "Nhập kho" })
        .filter({ hasText: `+${inventory.openingStock[key]}` })
      await expect(row.first()).toBeVisible()
    }
  })

  await step("The damaged-goods issue is in the ledger as 'Xuất kho' with -1", async () => {
    const row = productRow(page, catalog.products.phin.sku)
      .filter({ hasText: "Xuất kho" })
      .filter({ hasText: "-1" })
    await expect(row.first()).toBeVisible()
  })

  await step("'Biến động kho' shows the same movements per warehouse", async () => {
    await selectTab(page, "Biến động kho")
    for (const key of stockKeys) {
      const row = productRow(page, catalog.products[key].sku)
        .filter({ hasText: "MANUAL_RECEIPT" })
        .filter({ hasText: `+${inventory.openingStock[key]}` })
      await expect(row.first()).toBeVisible()
    }
    const issue = productRow(page, catalog.products.phin.sku)
      .filter({ hasText: "MANUAL_ISSUE" })
      .filter({ hasText: "-1" })
    await expect(issue.first()).toBeVisible()
  })
})

test("F04.5 A minimum threshold for Arabica is saved and survives a reload", async ({ page, step }) => {
  await step("Open 'Theo kho' under the 'Định mức' tab", async () => {
    await openInventory(page, "thresholds")
    await page.getByRole("button", { name: "Theo kho" }).click()
    const form = page.locator("section").filter({ has: page.getByRole("heading", { name: "Thiết lập định mức tồn" }) })
    await expect(form).toBeVisible()
  })

  await step("Set a minimum of a quarter of the opening stock for Arabica", async () => {
    const form = page.locator("section").filter({ has: page.getByRole("heading", { name: "Thiết lập định mức tồn" }) })
    await form.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: `${branches.main.name}` })
    await form
      .getByRole("combobox", { name: /^Sản phẩm/ })
      .selectOption({ label: `${catalog.products.arabica.name} (${catalog.products.arabica.sku})` })
    await form.getByRole("spinbutton", { name: "Tồn tối thiểu" }).fill(String(ARABICA_MIN_THRESHOLD))
    await form.getByRole("button", { name: "Lưu định mức" }).click()
    await expect(form).toHaveCount(0)
  })

  await step("The threshold table shows the new minimum", async () => {
    const row = productRow(page, catalog.products.arabica.sku)
    await expect(row).toBeVisible()
    await expect(row).toContainText(String(ARABICA_MIN_THRESHOLD))
  })

  await step("Reload: the threshold is still there (the PUT is an upsert, so re-runs are safe)", async () => {
    await page.reload()
    await settled(page)
    await selectBranchAndWarehouse(page)
    await selectTab(page, "Định mức")
    const row = productRow(page, catalog.products.arabica.sku)
    await expect(row).toBeVisible()
    await expect(row).toContainText(String(ARABICA_MIN_THRESHOLD))
  })
})

test("F04.6 A receipt with no product or a zero quantity is refused", async ({ page, step }) => {
  // Count actual POSTs: none of the refused attempts may reach the backend.
  let created = 0
  page.on("response", (response) => {
    if (response.request().method() === "POST" && receiptPath.test(new URL(response.url()).pathname)) created++
  })

  await step("Open the receipt form with a warehouse selected", async () => {
    await openInventory(page, "receipts")
    await page.getByRole("button", { name: "Tạo phiếu nhập" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("combobox", { name: /^Kho/ }).selectOption({ label: mainOption })
  })

  await step("Submitting without a product shows the inventory's validation message", async () => {
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    await expect(dialog.getByText("Vui lòng chọn sản phẩm và nhập số lượng dương cho tất cả các dòng.")).toBeVisible()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })

  await step("A quantity of 0 is blocked by the form's 0.001 minimum", async () => {
    await page.getByRole("button", { name: "Tạo phiếu nhập" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("combobox", { name: /^Sản phẩm #1/ }).selectOption({
      label: `${catalog.products.arabica.name} (${catalog.products.arabica.sku})`,
    })
    const qty = dialog.getByRole("spinbutton", { name: /^Số lượng/ }).first()
    await qty.fill("0")
    await expect.poll(() => qty.evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow)).toBe(true)
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    // UX finding: the native min=0.001 stops the submit before the app's own "số lượng dương" message can show
    await expect(dialog).toBeVisible()
    await expect(qty).toBeFocused()
  })

  await step("Clearing the quantity shows the inventory's own message; no receipt was created", async () => {
    const dialog = page.getByRole("dialog")
    const qty = dialog.getByRole("spinbutton", { name: /^Số lượng/ }).first()
    await qty.fill("")
    await dialog.getByRole("button", { name: "Tạo phiếu", exact: true }).click()
    await expect(dialog.getByText("Vui lòng chọn sản phẩm và nhập số lượng dương cho tất cả các dòng.")).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(created).toBe(0)
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })
})
