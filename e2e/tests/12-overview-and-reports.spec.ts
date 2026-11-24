import fs from "node:fs"
import type { Page } from "@playwright/test"
import { gw } from "../support/api"
import { branches, catalog, customers, pos, promotions, vnd } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F12.1 - F12.5 of flows/FLOWS.md: the overview (UI-INVENTORY section 3) and the report tabs (section 12).
 *
 * Needs: 09 (the POS sales in the shared store). Read-only: this file only navigates, polls, filters and downloads;
 * it creates/edits/deletes nothing, so it is re-runnable on the same store even while other workers add data.
 *
 * Every money/quantity figure is asserted at least >= what 09 leaves behind (335.000 + 58.500 = 393.500 VND) and is
 * cross-checked against the very gateway endpoints the pages call, read with gw():
 *   /insight/api/v1/sales-summary/daily                 (overview revenue KPI)
 *   /insight/api/v1/insight/reports/sales/by-channel    (channel tab)
 *   /insight/api/v1/insight/reports/sales/by-product    (product tab)
 *   /insight/api/v1/insight/reports/inventory/valuation (inventory tab)
 * Report rows arrive through event projections: the first appearance is polled with page.reload() for up to 60 s.
 * Because the store is shared, each poll re-reads the UI and the API together instead of comparing with a frozen value.
 *
 * Local constants (data.ts has no report CSV header, KPI list or tab labels): the four KPI labels, the channel CSV
 * header, the price of the coupon sale (derived from catalog + promotions) and the "today" date format. All other
 * numbers come from data.ts (pos, catalog, promotions, branches, customers).
 *
 * UX finding: the flow calls the in-store channel "Tại cửa hàng" (the label Orders and POS use), but Reports prints
 * "POS Tại quầy" for that same POS channel. The assertion accepts either wording; the discrepancy is reported.
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** The second sale of 09: one phin at 65.000 VND less the program's 10% = 58.500 VND. */
const couponSaleTotal =
  catalog.products.phin.price -
  Math.round((catalog.products.phin.price * promotions.program.percent) / 100)

/** 09 creates these two sales on every run; later runs (and other workers) only add more revenue. */
const minRevenue = pos.total + couponSaleTotal

const KPI_LABELS = [
  "Doanh thu 7 ngày",
  "Đơn hàng trong kỳ",
  "Giá trị đơn trung bình",
  "SKU chạm ngưỡng / hết tồn",
] as const

/** First line written by handleExportCurrentTabCsv for the channels tab (source: ReportsPage.tsx). */
const CHANNELS_CSV_HEADER =
  "Kênh bán,Số đơn,Đơn hoàn tất,Đơn hủy,Doanh thu gộp,Chiết khấu,Doanh thu thuần,Lợi nhuận gộp,AOV,Tỷ trọng (%)"

const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

/** The same UTC 7-day window the overview and the reports default to. */
function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - 6)
  return { from: toDateInput(from), to: toDateInput(to) }
}

/** Today as the browser (timezoneId Asia/Ho_Chi_Minh, locale vi-VN) prints it in DashboardHeader. */
function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())
}

type DailySales = { totals: { revenue: number; orderCount: number } }
type ChannelReport = {
  data: { channelType: string; netSalesRevenue: number; returnsAmount?: number }[]
}
type ProductReport = {
  data: { skuCode: string; unitsSold: string | number }[]
}
type ValuationReport = {
  // Backend quirk: `branchId` holds the warehouse id here (equal to `warehouseId`), not the platform branch id
  warehouses: { warehouseId: string; branchId?: string | null; skuCount: number; totalValuation: number }[]
}
type OrderList = {
  data: { code: string; customerName: string | null; totalAmount: number }[]
}

const channelPath = "/insight/api/v1/insight/reports/sales/by-channel"
const productPath = "/insight/api/v1/insight/reports/sales/by-product"
const valuationPath = "/insight/api/v1/insight/reports/inventory/valuation"

async function dailyRevenue(): Promise<number> {
  const { from, to } = defaultRange()
  const res = await gw<DailySales>(`/insight/api/v1/sales-summary/daily?from=${from}&to=${to}`)
  return res.totals.revenue
}

async function mainBranchId(): Promise<string> {
  const list = await gw<{ data: { id: string; name: string }[] }>("/platform/api/v1/branches")
  const branch = list.data.find((b) => b.name === branches.main.name) ?? list.data[0]
  expect(branch, "the main branch exists (01)").toBeTruthy()
  return branch!.id
}

/** The default warehouse of the main branch: the id the valuation report uses for its row. */
async function mainWarehouseId(branchId: string): Promise<string> {
  const res = await gw<{ id: string; isDefault?: boolean }[] | { data: { id: string; isDefault?: boolean }[] }>(
    `/inventory/api/v1/warehouses?branchId=${branchId}`,
  )
  const list = Array.isArray(res) ? res : res.data
  const warehouse = list.find((w) => w.isDefault) ?? list[0]
  expect(warehouse, "the main branch has a warehouse").toBeTruthy()
  return warehouse!.id
}

/** The value paragraph of a MetricCard, reached through its label paragraph. */
const kpiValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("xpath=../..").locator("p").nth(1)

/** "3.089.500 ₫" / "58.500đ" / "12" -> 3089500 / 58500 / 12. */
const parseMoney = (text: string) => Number(text.replace(/[^\d-]/g, ""))

const reportTab = (page: Page, label: string | RegExp) => page.getByRole("tab", { name: label })

/** The channel table's in-store row; reports labels POS "POS Tại quầy", Orders labels it "Tại cửa hàng". */
const inStoreRow = (page: Page) =>
  page
    .locator("table")
    .filter({ has: page.getByRole("columnheader", { name: "Kênh bán" }) })
    .getByRole("row")
    .filter({ hasText: /(POS )?Tại (quầy|cửa hàng)/ })

const isPosChannel = (channelType: string) => ["POS", "IN_STORE"].includes(channelType.toUpperCase())

test("F12.1 The overview shows today, four KPIs, at least 393.500 VND revenue and the recent orders", async ({
  page,
  step,
}) => {
  await step("Open the overview with the owner's session", async () => {
    await page.goto("/")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Tổng quan kinh doanh", level: 1 })).toBeVisible()
  })

  await step("The header shows today's date", async () => {
    await expect(page.getByText(`Hôm nay · ${todayLabel()}`)).toBeVisible()
  })

  await step("All four KPI cards have real values, not loading skeletons", async () => {
    for (const label of KPI_LABELS) {
      await expect(kpiValue(page, label)).toBeVisible()
      expect((await kpiValue(page, label).innerText()).trim()).not.toBe("")
    }
  })

  await step("Poll with reload until revenue is >= 393.500 VND and equals the daily-sales API", async () => {
    await expect
      .poll(
        async () => {
          await page.reload()
          await settled(page)
          const shown = parseMoney(await kpiValue(page, "Doanh thu 7 ngày").innerText())
          const api = await dailyRevenue()
          return shown >= minRevenue && shown === api
        },
        {
          timeout: 60_000,
          message: `Revenue KPI never reached ${vnd(minRevenue)} VND / never matched /sales-summary/daily`,
        },
      )
      .toBe(true)
  })

  await step("The recent orders table names the POS orders from the orders API", async () => {
    const table = page
      .locator("table")
      .filter({ has: page.getByRole("columnheader", { name: "Đơn hàng / Mã sàn" }) })
    await expect(page.getByRole("heading", { name: "Đơn hàng gần đây" })).toBeVisible()
    await expect(table).toBeVisible()

    await expect
      .poll(
        async () => {
          await page.reload()
          await settled(page)
          const api = await gw<OrderList>("/sales/api/v1/orders?page=1&limit=4")
          const rows = await table.getByRole("row").allInnerTexts()
          return api.data.length >= 2 && api.data.every((o) => rows.some((r) => r.includes(o.code)))
        },
        { timeout: 60_000, message: "The newest orders never appeared in 'Đơn hàng gần đây'" },
      )
      .toBe(true)

    await expect(table.locator("tbody")).toContainText(customers.ngoc.name)
    await expect(table.locator("tbody")).toContainText(`${vnd(pos.total)} ₫`)
    await expect(table.locator("tbody")).toContainText(`${vnd(couponSaleTotal)} ₫`)
    await expect(table.locator("tbody").getByText("Tại cửa hàng").first()).toBeVisible()
  })
})

test("F12.2 Reports by channel: the in-store channel, the range chip and the main branch", async ({
  page,
  step,
}) => {
  const { from, to } = defaultRange()
  const branchId = await mainBranchId()
  let thirtyFrom = ""

  await step("Open the channel report and poll for the in-store revenue", async () => {
    await page.goto("/reports?tab=channels")
    await settled(page)
    await expect(page.getByRole("heading", { level: 1, name: "Báo cáo Điều hành Đa kênh" })).toBeVisible()
    await expect(reportTab(page, /Bán hàng theo Kênh/)).toHaveAttribute("aria-selected", "true")

    await expect
      .poll(
        async () => {
          await page.reload()
          await settled(page)
          const row = inStoreRow(page)
          if ((await row.count()) !== 1) return false
          const shown = parseMoney(await row.getByRole("cell").nth(5).innerText())
          const api = await gw<ChannelReport>(`${channelPath}?from=${from}&to=${to}`)
          const posRow = api.data.find((r) => isPosChannel(r.channelType))
          // The report is NET of returns (spec 10 returns a 65.000 VND phin before this spec runs on a fresh store), so the
          // sales made by 09 are what net revenue plus the returned amount adds up to
          const returned = Number(posRow?.returnsAmount ?? 0)
          return Boolean(posRow) && shown + returned >= minRevenue && shown === Number(posRow!.netSalesRevenue)
        },
        { timeout: 60_000, message: `The POS channel never showed net revenue (+ returns) >= ${vnd(minRevenue)} VND matching by-channel` },
      )
      .toBe(true)

    // The flow's "Tại cửa hàng" is the Orders/POS label; the Reports badge for the same POS channel reads "POS Tại quầy".
    await expect(inStoreRow(page).getByRole("cell").first()).toContainText(/(POS )?Tại (quầy|cửa hàng)/)
  })

  await step("'30 ngày qua' changes the from parameter of the channel request", async () => {
    const request = page.waitForRequest(
      (r) => r.method() === "GET" && new URL(r.url()).pathname.endsWith("/insight/reports/sales/by-channel"),
    )
    await page.getByRole("button", { name: "30 ngày qua", exact: true }).click()
    const params = new URL((await request).url()).searchParams
    thirtyFrom = params.get("from") ?? ""
    expect(thirtyFrom).toBeTruthy()
    expect(params.get("to")).toBe(to)
    expect(thirtyFrom).not.toBe(from)

    const api = await gw<ChannelReport>(`${channelPath}?from=${thirtyFrom}&to=${to}`)
    const posRow = api.data.find((r) => isPosChannel(r.channelType))
    expect(posRow, "the POS channel is in the 30-day report").toBeTruthy()
    // net of returns: what 09 sold = net revenue + the amount spec 10 returned
    const returned30 = Number(posRow!.returnsAmount ?? 0)
    expect(Number(posRow!.netSalesRevenue) + returned30).toBeGreaterThanOrEqual(minRevenue)
    await expect
      .poll(async () => parseMoney(await inStoreRow(page).getByRole("cell").nth(5).innerText()))
      .toBeGreaterThanOrEqual(minRevenue - returned30)
  })

  await step("Choosing the main branch keeps the in-store figure", async () => {
    const request = page.waitForRequest(
      (r) => r.method() === "GET" && new URL(r.url()).pathname.endsWith("/insight/reports/sales/by-channel"),
    )
    await page.getByLabel("Chọn chi nhánh báo c").selectOption({ label: branches.main.name })
    expect(new URL((await request).url()).searchParams.get("branchId")).toBe(branchId)

    // Both 09 sales happen at the main branch, so filtering to it must not change the revenue.
    const [allBranches, mainBranch] = await Promise.all([
      gw<ChannelReport>(`${channelPath}?from=${thirtyFrom}&to=${to}`),
      gw<ChannelReport>(`${channelPath}?from=${thirtyFrom}&to=${to}&branchId=${branchId}`),
    ])
    const netAll = Number(allBranches.data.find((r) => isPosChannel(r.channelType))?.netSalesRevenue ?? 0)
    const mainRow = mainBranch.data.find((r) => isPosChannel(r.channelType))
    const netMain = Number(mainRow?.netSalesRevenue ?? 0)
    const returnedMain = Number(mainRow?.returnsAmount ?? 0)
    expect(netMain).toBe(netAll)
    expect(netMain + returnedMain).toBeGreaterThanOrEqual(minRevenue)
    await expect
      .poll(async () => parseMoney(await inStoreRow(page).getByRole("cell").nth(5).innerText()))
      .toBeGreaterThanOrEqual(minRevenue - returnedMain)
  })
})

test("F12.3 Products tab: Arabica is a top SKU with at least 2 units; the SKU filter narrows to it", async ({
  page,
  step,
}) => {
  const { from, to } = defaultRange()
  const productTable = page
    .locator("table")
    .filter({ has: page.getByRole("columnheader", { name: "SKU & Tên sản phẩm" }) })

  await step("Open the product report", async () => {
    await page.goto("/reports?tab=products")
    await settled(page)
    await expect(reportTab(page, /Báo cáo theo Sản phẩm/)).toHaveAttribute("aria-selected", "true")
  })

  await step("Poll with reload until Arabica shows the 2 units sold by the 335.000 VND sale", async () => {
    await expect
      .poll(
        async () => {
          await page.reload()
          await settled(page)
          const row = productTable.getByRole("row").filter({ hasText: catalog.products.arabica.sku })
          if ((await row.count()) !== 1) return false
          const units = parseMoney(await row.getByRole("cell").nth(2).innerText())
          const api = await gw<ProductReport>(`${productPath}?from=${from}&to=${to}&limit=50`)
          const item = api.data.find((p) => p.skuCode === catalog.products.arabica.sku)
          return Boolean(item) && units >= pos.cart[0].qty && units === Number(item!.unitsSold)
        },
        { timeout: 60_000, message: `Arabica never appeared with >= ${pos.cart[0].qty} units in by-product` },
      )
      .toBe(true)
  })

  await step("The SKU filter narrows the top-SKU table to Arabica alone", async () => {
    await page.getByPlaceholder("Lọc mã SKU hoặc tên sản phẩm...").fill(catalog.products.arabica.sku)
    await expect(productTable.getByRole("row")).toHaveCount(2) // header + one SKU
    await expect(productTable.getByRole("row").filter({ hasText: catalog.products.arabica.sku })).toBeVisible()
    await expect(productTable.getByRole("row").filter({ hasText: catalog.products.phin.sku })).toHaveCount(0)
  })
})

test("F12.4 Inventory tab: the main warehouse shows 3 SKUs and its stock valuation", async ({ page, step }) => {
  const { to } = defaultRange()
  const warehouseId = await mainWarehouseId(await mainBranchId())
  const valuationTable = page
    .locator("table")
    .filter({ has: page.getByRole("columnheader", { name: "Tổng giá trị vốn" }) })

  await step("Open the inventory valuation report", async () => {
    await page.goto("/reports?tab=inventory")
    await settled(page)
    await expect(reportTab(page, /Giá trị Tồn kho/)).toHaveAttribute("aria-selected", "true")
  })

  await step("Poll with reload until the main warehouse row matches the valuation API", async () => {
    await expect
      .poll(
        async () => {
          await page.reload()
          await settled(page)
          const api = await gw<ValuationReport>(`${valuationPath}?date=${to}`)
          const warehouse = api.warehouses.find((w) => w.warehouseId === warehouseId)
          if (!warehouse) return false
          const row = valuationTable.getByRole("row").filter({ hasText: branches.main.name })
          if ((await row.count()) !== 1) return false
          const cells = await row.getByRole("cell").allInnerTexts()
          return (
            Number(cells[1]) === Object.keys(catalog.products).length &&
            cells[3] === `${vnd(warehouse.totalValuation)}đ`
          )
        },
        {
          timeout: 60_000,
          message: "The main warehouse never showed 3 SKUs and the /inventory/valuation total",
        },
      )
      .toBe(true)
  })

  await step("The SKUs and the valuation are real stock data, not zeros", async () => {
    const api = await gw<ValuationReport>(`${valuationPath}?date=${to}`)
    const warehouse = api.warehouses.find((w) => w.warehouseId === warehouseId)
    expect(warehouse, "the main warehouse is in the valuation").toBeTruthy()
    expect(warehouse!.skuCount).toBe(Object.keys(catalog.products).length)
    expect(warehouse!.totalValuation).toBeGreaterThan(0)
  })
})

test("F12.5 'Xuất CSV tab hiện tại' downloads a file whose first line has the table's headers", async ({
  page,
  step,
}) => {
  await step("Open the channel report so the current tab is unambiguous", async () => {
    await page.goto("/reports?tab=channels")
    await settled(page)
    await expect(reportTab(page, /Bán hàng theo Kênh/)).toHaveAttribute("aria-selected", "true")
  })

  let path = ""
  let filename = ""
  await step("Click 'Xuất CSV tab hiện tại' and catch the download", async () => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Xuất CSV tab hiện tại" }).click(),
    ])
    filename = download.suggestedFilename()
    path = (await download.path()) ?? ""
    expect(path, "the CSV was written to a file").not.toBe("")
  })

  await step("The first line is the channel table's CSV header (BOM removed)", async () => {
    const firstLine = fs.readFileSync(path, "utf8").split(/\r?\n/)[0].replace(/^\uFEFF/, "")
    expect(firstLine).toBe(CHANNELS_CSV_HEADER)
  })

  await step("The file name and the toast match the exported tab and range", async () => {
    const { from, to } = defaultRange()
    expect(filename).toBe(`bao-cao-channels-${from}-${to}.csv`)
    await expect(page.getByText("Đã xuất báo cáo CSV (UTF-8)")).toBeVisible()
  })
})
