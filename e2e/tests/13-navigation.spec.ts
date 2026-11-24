import type { Page } from "@playwright/test"
import { branches, freePlan, store } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F13.1 - F13.4 of flows/FLOWS.md: the layout (sidebar, store card, topbar breadcrumb) and the channels page.
 *
 * Needs: 01 (the store and the owner's signed-in session). Read-only: nothing here creates or changes shop data, and the
 * collapse/expand of F13.2 lives in localStorage of this test's own browser context, so a second run on the same store
 * sees exactly the same starting state.
 *
 * Breadcrumb titles come from UI-INVENTORY.md section 0 (Topbar's pathMap, confirmed against src/components/layout/Topbar).
 * The h1s come from the same inventory (section 0 for the shared dashboard header, sections 7-14 for the individual
 * pages); only the channels h1 is not spelled out in the inventory, so it was taken from src/features/channels/ChannelsPage.
 */

asOwner()
test.describe.configure({ mode: "serial" })

type NavPage = {
  /** The sidebar item's visible label. */
  item: string
  /** Items with children are expandable buttons; their first child link is what opens the page. */
  firstChild?: string
  /** The pathname the URL must end up on. */
  path: string
  /** Topbar breadcrumb title from UI-INVENTORY.md section 0. */
  breadcrumb: string
  /** The page's own h1 from UI-INVENTORY.md. */
  heading: string
}

/** One row per item of the owner's sidebar (navigation.ts + the "Cài đặt cửa hàng" footer link). */
const navPages: NavPage[] = [
  { item: "Tổng quan", path: "/", breadcrumb: "Tổng quan điều hành", heading: "Tổng quan kinh doanh" },
  {
    item: "Sản phẩm",
    firstChild: "Danh mục sản phẩm",
    path: "/products",
    breadcrumb: "Danh mục & Bảng giá",
    heading: "Sản phẩm",
  },
  {
    item: "Tồn kho",
    firstChild: "Tổng quan tồn kho",
    path: "/inventory",
    breadcrumb: "Quản lý Kho & Tồn",
    heading: "Tồn kho",
  },
  { item: "Đơn hàng", path: "/orders", breadcrumb: "Quản lý Đơn hàng", heading: "Đơn hàng" },
  { item: "Bán tại quầy", path: "/pos", breadcrumb: "Bán tại quầy (POS)", heading: "Bán tại quầy" },
  {
    item: "Khuyến mãi",
    firstChild: "Chương trình KM",
    path: "/promotions",
    breadcrumb: "Khuyến mãi & Coupon",
    heading: "Khuyến mãi & Mã giảm giá",
  },
  {
    item: "Kênh bán hàng",
    firstChild: "Tổng quan & Lazada",
    path: "/channels",
    breadcrumb: "Kênh bán & Sàn TMĐT",
    heading: "Kênh bán hàng & Tích hợp Lazada",
  },
  {
    item: "Khách hàng",
    firstChild: "Danh sách khách hàng",
    path: "/customers",
    breadcrumb: "Khách hàng & Loyalty",
    heading: "Khách hàng & Tích điểm",
  },
  {
    item: "Báo cáo",
    firstChild: "Bán hàng theo kênh",
    path: "/reports",
    breadcrumb: "Báo cáo Đa kênh",
    heading: "Báo cáo Điều hành Đa kênh",
  },
  {
    item: "Nhập hàng & NCC",
    path: "/suppliers",
    breadcrumb: "Nhà cung cấp",
    heading: "Nhập hàng & nhà cung cấp",
  },
  {
    item: "Nhân viên & Quyền",
    firstChild: "Nhân viên",
    path: "/staff",
    breadcrumb: "Nhân viên & Phân quyền",
    heading: "Nhân viên & Quyền",
  },
  {
    item: "Cài đặt cửa hàng",
    path: "/settings",
    breadcrumb: "Cài đặt Cửa hàng",
    heading: "Cài đặt cửa hàng",
  },
]

const breadcrumb = (page: Page) => page.getByRole("navigation", { name: "Breadcrumb" })

const sidebar = (page: Page) => page.getByRole("complementary")

/** The expandable items are buttons; only the leaf items (and the settings footer link) are links. */
async function openFromSidebar(page: Page, target: NavPage) {
  if (target.firstChild) {
    const parent = sidebar(page).getByRole("button", { name: target.item, exact: true })
    await expect(parent).toBeVisible()
    if ((await parent.getAttribute("aria-expanded")) !== "true") await parent.click()
    await expect(parent).toHaveAttribute("aria-expanded", "true")
    await sidebar(page).getByRole("link", { name: target.firstChild, exact: true }).click()
  } else {
    // "Đơn hàng" can carry a numeric badge next to its label, hence the prefix match.
    await sidebar(page).getByRole("link", { name: new RegExp(`^${target.item}`) }).click()
  }
}

test("F13.1 Each sidebar item opens the page with the expected breadcrumb and heading", async ({ page, step }) => {
  await step("Start from the overview, where the whole sidebar is present for the owner", async () => {
    await page.goto("/")
    await expect(breadcrumb(page)).toContainText("Tổng quan điều hành")
    await expect(breadcrumb(page).getByRole("link", { name: "OmniRetail" })).toBeVisible()
  })

  for (const target of navPages) {
    await step(`Open '${target.item}' and check '${target.breadcrumb}' / '${target.heading}'`, async () => {
      await openFromSidebar(page, target)
      await expect.poll(() => new URL(page.url()).pathname).toBe(target.path)
      await expect(breadcrumb(page).getByText(target.breadcrumb, { exact: true })).toBeVisible()
      await expect(page.getByRole("heading", { level: 1, name: target.heading, exact: true })).toBeVisible()
    })
  }
})

test("F13.2 Collapsing the sidebar is remembered across a reload; expanding restores it", async ({ page, step }) => {
  await page.goto("/")
  const stored = () => page.evaluate(() => localStorage.getItem("omni_sidebar_collapsed"))

  await step("The topbar starts with the expanded-state toggle 'Thu gọn thanh menu'", async () => {
    await expect(page.getByRole("button", { name: "Thu gọn thanh menu" })).toBeVisible()
    await expect.poll(stored).toBe(null)
  })

  await step("Collapse it: the toggle changes and localStorage remembers 'true'", async () => {
    await page.getByRole("button", { name: "Thu gọn thanh menu" }).click()
    await expect(page.getByRole("button", { name: "Mở rộng thanh menu" })).toBeVisible()
    await expect.poll(stored).toBe("true")
  })

  await step("After a reload the sidebar is still collapsed", async () => {
    await page.reload()
    await expect(page.getByRole("button", { name: "Mở rộng thanh menu" })).toBeVisible()
    await expect.poll(stored).toBe("true")
    await expect(breadcrumb(page).getByText("Tổng quan điều hành", { exact: true })).toBeVisible()
  })

  await step("Expand it again: localStorage holds 'false' and survives another reload", async () => {
    await page.getByRole("button", { name: "Mở rộng thanh menu" }).click()
    await expect(page.getByRole("button", { name: "Thu gọn thanh menu" })).toBeVisible()
    await expect.poll(stored).toBe("false")
    await page.reload()
    await expect(page.getByRole("button", { name: "Thu gọn thanh menu" })).toBeVisible()
    await expect.poll(stored).toBe("false")
  })
})

test("F13.3 The store card menu lists the store and leads to branch management", async ({ page, step }) => {
  await page.goto("/")

  await step(`The store card shows '${store.name}', its plan and one branch`, async () => {
    const card = sidebar(page).getByRole("button", { name: new RegExp(store.name) })
    await expect(card).toContainText(store.name)
    await expect(card).toContainText(`Gói ${freePlan.name}`)
    await expect(card).toContainText("1 chi nhánh")
  })

  await step("Opening the card lists the managed store and both menu actions", async () => {
    await sidebar(page).getByRole("button", { name: new RegExp(store.name) }).click()
    const menu = page.getByText("Cửa hàng đang quản lý").locator("..")
    await expect(menu.getByRole("button", { name: store.name, exact: true })).toBeVisible()
    await expect(menu.getByRole("button", { name: "Quản lý chi nhánh & gói cước" })).toBeVisible()
    await expect(menu.getByRole("button", { name: "Tạo cửa hàng mới" })).toBeVisible()
  })

  await step("'Quản lý chi nhánh & gói cước' opens settings with the main branch", async () => {
    await page.getByRole("button", { name: "Quản lý chi nhánh & gói cước" }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole("heading", { name: "Cài đặt cửa hàng", exact: true })).toBeVisible()
    const branchRow = page.getByRole("row").filter({ hasText: branches.main.name })
    await expect(branchRow).toContainText(branches.main.code)
    await expect(branchRow).toContainText("Đang hoạt động")
  })
})

test("F13.4 Channels with no marketplace: empty state, connect dialog, validation, nothing created", async ({
  page,
  step,
}) => {
  await page.goto("/channels")
  await settled(page)

  await step("The channels page shows the Lazada empty state", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Kênh bán hàng & Tích hợp Lazada" })).toBeVisible()
    await expect(page.getByText("Chưa có gian hàng Lazada nào được kết nối.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Thêm gian hàng Lazada" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Thêm gian hàng Shopee" })).toBeVisible()
  })

  await step("'Kết nối gian hàng Lazada' opens the connect dialog with both marketplaces", async () => {
    await page.getByRole("button", { name: "Kết nối gian hàng Lazada" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Kết nối gian hàng Lazada" })).toBeVisible()
    await expect(dialog.getByText("Liên kết sàn thương mại điện tử")).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Sàn TMĐT Lazada/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Sàn TMĐT Shopee/ })).toBeVisible()
  })

  await step("Submitting with no branch is refused by the branch select's validation", async () => {
    const dialog = page.getByRole("dialog")
    const branch = dialog.getByLabel("Chi nhánh ghi nhận doanh thu & đơn hàng *")
    await branch.selectOption({ label: "Chọn chi nhánh" })
    await dialog.getByRole("button", { name: "Tiếp tục tới Cấp quyền Gian hàng" }).click()
    // UX finding: the select is `required`, so the browser's native validation stops the submit before React can show
    // the app's "Vui lòng chọn chi nhánh ghi nhận đơn hàng và trừ tồn kho." (see the report). What the user sees is a
    // validation bubble, the field stays focused and the dialog stays open with no connection created.
    await expect(branch).toBeFocused()
    await expect.poll(() => branch.evaluate((el) => (el as HTMLSelectElement).validity.valueMissing)).toBe(true)
    await expect
      .poll(() => branch.evaluate((el) => (el as HTMLSelectElement).validationMessage))
      .not.toBe("") // the local browser prints "Please select an item in the list." in the vi-VN test run
    await expect(dialog).toBeVisible()
    await expect(page.getByText("Chưa có gian hàng Lazada nào được kết nối.")).toBeVisible()
  })

  await step("In token mode, submitting without an Access Token shows the app's validation message", async () => {
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Chi nhánh ghi nhận doanh thu & đơn hàng *").selectOption({ index: 1 })
    await dialog.getByRole("button", { name: /Kết nối bằng Token có sẵn/ }).click()
    await dialog.getByRole("button", { name: "Hoàn tất Kết nối Gian hàng" }).click()
    await expect(
      dialog.getByText("Vui lòng nhập Access Token của nhà bán hàng khi chọn kết nối bằng Token trực tiếp."),
    ).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  await step("Closing the dialog leaves no connection, including after a reload", async () => {
    await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByText("Chưa có gian hàng Lazada nào được kết nối.")).toBeVisible()
    await page.reload()
    await settled(page)
    await expect(page.getByText("Chưa có gian hàng Lazada nào được kết nối.")).toBeVisible()
  })
})

test("Connect a Lazada shop through the real marketplace — out of scope", async ({ page, step }) => {
  test.fixme(
    true,
    "Needs an external Lazada Seller Center app: a real App Key/Secret, a seller OAuth redirect and a callback with " +
      "'code' and 'state' from Lazada. The local stack cannot grant a live marketplace token, so this flow cannot be " +
      "automated here (known gap: marketplace OAuth).",
  )
  await page.goto("/channels")
  await step("Start a Lazada connection and leave the wizard for the seller's authorization page", async () => {
    await page.getByRole("button", { name: "Kết nối gian hàng Lazada" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Chi nhánh ghi nhận doanh thu & đơn hàng *").selectOption({ index: 1 })
    await dialog.getByRole("button", { name: "Tiếp tục tới Cấp quyền Gian hàng" }).click()
    await expect(dialog.getByText(/Đã khởi tạo kết nối/)).toBeVisible()
  })
})

test("Connect a Shopee shop through the real marketplace — out of scope", async ({ page, step }) => {
  test.fixme(
    true,
    "Needs an external Shopee Open Platform app: a real Shop ID, Webhook secret and seller authorization callback. " +
      "The local stack cannot grant a live marketplace token, so this flow cannot be automated here " +
      "(known gap: marketplace OAuth).",
  )
  await page.goto("/channels")
  await step("Open the Shopee connect dialog and complete the seller's authorization", async () => {
    await page.getByRole("button", { name: "Thêm gian hàng Shopee" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Kết nối gian hàng Shopee" })).toBeVisible()
    await dialog.getByLabel("Chi nhánh ghi nhận doanh thu & đơn hàng *").selectOption({ index: 1 })
    await dialog.getByLabel("Mã gian hàng / Seller ID *").fill("VN10928374")
    await dialog.getByLabel("Tên gian hàng trên hệ thống *").fill("Mộc Store Official Shopee")
    await dialog.getByLabel("Khóa bảo mật Webhook / App Secret *").fill("webhook-secret")
    await dialog.getByRole("button", { name: "Hoàn tất Kết nối Gian hàng" }).click()
    await expect(page.getByText(/Đã khởi tạo kết nối/)).toBeVisible()
  })
})
