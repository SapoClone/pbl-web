import type { Page } from "@playwright/test"
import { gw } from "../support/api"
import { asOwner, expect, test } from "../support/fixtures"
import { customers, vnd } from "../support/data"

/**
 * Flows F07.1 - F07.7 of flows/FLOWS.md: the customer group, the two customers every later spec sells to,
 * loyalty points, a delivery address and the membership tier.
 *
 * Leaves for later specs: group "Khách thân thiết" (5%), customers Trần Thị Bích Ngọc (in that group) and
 * Lê Quốc Bảo, 100 points on Bích Ngọc, her delivery address and the GOLD tier. Nothing here is ever deleted
 * except this spec's own throwaway customer and (on a re-run) the address or points an earlier run of this file
 * left behind, so the flows can run twice against the same store.
 */
test.describe.configure({ mode: "serial" })
asOwner()

/**
 * Values the flows need that support/data.ts does not carry (the reviewer may want to move them there): the
 * birthday gift used for the points adjustment, the address added to Bích Ngọc's address book, the membership
 * tier, the suffix added to Quốc Bảo's name and the throwaway customer deleted at the end.
 */
const group = customers.group

const INVALID_GROUP_NAME = "Nhóm chiết khấu sai"
const INVALID_DISCOUNT = 150

const POINTS_GIFT = 100
const POINTS_REASON = "Quà sinh nhật"
const POINTS_OVERDRAW_REASON = "Thử trừ quá số dư"
/** Written in the ledger when a re-run has to clear the balance an earlier run added */

const DELIVERY_ADDRESS = {
  line: "18 Lý Thường Kiệt",
  ward: "Phường Bến Nghé",
  district: "Quận 1",
  province: "TP. Hồ Chí Minh",
}

const TIER = { code: "GOLD", name: "Hạng Vàng", minPoints: 1000, discountRate: 5 }

const NAME_SUFFIX = " (Khách quen)"
const THROWAWAY_CUSTOMER = { name: "Khách thử xóa", phone: "0999888777" }
const DUPLICATE_CUSTOMER_NAME = "Trần Thị Bích Ngọc (trùng SĐT)"

/** How the create/edit customer form writes a group in its option list, e.g. "Khách thân thiết (-5%)" */
const groupOptionLabel = (name: string, percent: number) => `${name} (-${percent}%)`

const searchBox = (page: Page) => page.getByPlaceholder("Tìm tên, mã KH, thẻ thành viên, SĐT, email...")

/** The one row of the customer with this phone number */
const rowByPhone = (page: Page, phone: string) => page.getByRole("row", { name: new RegExp(phone) })

const drawer = (page: Page) => page.getByRole("dialog")

/**
 * The create/edit customer dialog: the form around its heading. The page-level getByLabel("Nhóm khách hàng")
 * would also match the list's "Lọc theo nhóm khách hàng" select.
 */
const customerForm = (page: Page) =>
  page
    .getByRole("heading", { name: /^(Thêm khách hàng mới|Chỉnh sửa hồ sơ khách hàng)$/ })
    .locator("xpath=ancestor::form")

/** The customer list fetches its data on mount; the "Làm mới" button is disabled until that first load is done */
async function waitForCustomers(page: Page) {
  await expect(page.getByRole("button", { name: "Làm mới" })).toBeEnabled()
}

/** Open the 360° drawer of the only listed customer with this phone */
async function openDrawer(page: Page, phone: string) {
  await rowByPhone(page, phone).getByRole("button", { name: "360°" }).click()
  await expect(drawer(page)).toBeVisible()
}

async function closeDrawer(page: Page) {
  await drawer(page).getByRole("button", { name: "Đóng bảng" }).click()
  await expect(drawer(page)).toHaveCount(0)
}

/** Numbers printed by the list ("100 điểm") and by the adjustment form */
const pointsFrom = (text: string) => Number(text.replace(/[^0-9]/g, "") || 0)

/** Fill the manual points form of the open drawer and submit it */
async function adjustPoints(page: Page, direction: "ADD" | "DEDUCT", points: number, reason: string) {
  const details = drawer(page)
  await details.getByRole("tab", { name: /Điểm thưởng/ }).click()
  await details.getByLabel("Nghiệp vụ").selectOption(direction)
  await details.getByLabel("Số điểm").fill(String(points))
  await details.getByLabel("Lý do điều chỉnh *").fill(reason)
  await details.getByRole("button", { name: "Xác nhận điều chỉnh điểm" }).click()
}

test("F07.1 Create the customer group 'Khách thân thiết' with a 5% discount", async ({ page, step }) => {
  await page.goto("/customers?tab=groups")
  const groupSearch = page.getByPlaceholder("Tìm mã nhóm, tên nhóm (VIP, Đại lý, B2B)...")
  const groupRow = page.getByRole("row", { name: new RegExp(group.code) })

  await step("Open the customer groups tab", async () => {
    await expect(page.getByRole("heading", { name: "Khách hàng & Tích điểm" })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Nhóm khách hàng/ })).toHaveAttribute("aria-selected", "true")
    // The seeded groups arrive with the first load; "Khách lẻ" is always there
    await expect(page.getByRole("row", { name: /Khách lẻ/ })).toBeVisible()
  })

  await step("Create the group (an earlier run may already have left it)", async () => {
    await groupSearch.fill(group.code)
    if ((await groupRow.count()) > 0) return
    await page.getByRole("button", { name: "Tạo nhóm khách hàng", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Tạo nhóm khách hàng mới" })).toBeVisible()
    await page.getByLabel("Mã nhóm (Tự sinh nếu để trống)").fill(group.code)
    await page.getByLabel("Tên nhóm khách hàng *").fill(group.name)
    await page.getByLabel("Mô tả điều kiện / quyền lợi nhóm").fill(group.description)
    await page.getByLabel("Chiết khấu mặc định (%)").fill(String(group.discountPercent))
    await page.getByRole("button", { name: "Tạo nhóm", exact: true }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã tạo nhóm khách hàng mới" })).toBeVisible()
  })

  await step("The group is listed with its 5% discount", async () => {
    await groupSearch.fill(group.code)
    await expect(groupRow).toBeVisible()
    await expect(groupRow).toContainText(group.name)
    await expect(groupRow).toContainText(`Giảm ${group.discountPercent}%`)
  })

  await step("Reload: the group is still there with the same discount", async () => {
    await page.reload()
    await expect(page.getByRole("row", { name: /Khách lẻ/ })).toBeVisible()
    await groupSearch.fill(group.code)
    await expect(groupRow).toBeVisible()
    await expect(groupRow).toContainText(`Giảm ${group.discountPercent}%`)
  })

  await step("A discount above 100% is refused", async () => {
    await page.getByRole("button", { name: "Tạo nhóm khách hàng", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Tạo nhóm khách hàng mới" })).toBeVisible()
    await page.getByLabel("Tên nhóm khách hàng *").fill(INVALID_GROUP_NAME)
    await page.getByLabel("Chiết khấu mặc định (%)").fill(String(INVALID_DISCOUNT))
    await page.getByRole("button", { name: "Tạo nhóm", exact: true }).click()
    // The input carries max=100, so the browser itself blocks the submit and shows its own message:
    // the app's "Tỷ lệ chiết khấu mặc định phải từ 0% đến 100%." never gets a chance to render.
    const discount = page.getByLabel("Chiết khấu mặc định (%)")
    await expect(discount).toHaveValue(String(INVALID_DISCOUNT))
    expect(await discount.evaluate((el) => (el as HTMLInputElement).validationMessage)).toContain("100")
    await expect(page.getByRole("heading", { name: "Tạo nhóm khách hàng mới" })).toBeVisible()
    await page.getByRole("button", { name: "Hủy" }).click()
    await expect(page.getByRole("heading", { name: "Tạo nhóm khách hàng mới" })).toHaveCount(0)
  })

  await step("Nothing was saved for that invalid group", async () => {
    await groupSearch.fill(INVALID_GROUP_NAME)
    await expect(page.getByText("Chưa có nhóm khách hàng nào khớp bộ lọc hiện tại.")).toBeVisible()
  })
})

test("F07.2 Create Bích Ngọc in the group and Quốc Bảo without; a duplicate phone is refused", async ({ page, step }) => {
  await page.goto("/customers")
  const search = searchBox(page)

  await step("Open the customer list", async () => {
    await expect(page.getByRole("heading", { name: "Khách hàng & Tích điểm" })).toBeVisible()
    await waitForCustomers(page)
  })

  await step("Create Trần Thị Bích Ngọc in the group 'Khách thân thiết'", async () => {
    await search.fill(customers.ngoc.phone)
    if ((await rowByPhone(page, customers.ngoc.phone).count()) > 0) return
    await page.getByRole("button", { name: "Thêm khách hàng", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Thêm khách hàng mới" })).toBeVisible()
    await page.getByLabel("Họ và tên *").fill(customers.ngoc.name)
    await page.getByLabel("Số điện thoại *").fill(customers.ngoc.phone)
    await page.getByLabel("Email").fill(customers.ngoc.email)
    await customerForm(page)
      .getByLabel("Nhóm khách hàng")
      .selectOption({ label: groupOptionLabel(group.name, group.discountPercent) })
    await page.getByRole("button", { name: "Lưu khách hàng" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã tạo khách hàng mới" })).toBeVisible()
  })

  await step("She is listed with her phone and her group", async () => {
    const row = rowByPhone(page, customers.ngoc.phone)
    await expect(row).toBeVisible()
    await expect(row).toContainText(customers.ngoc.name)
    await expect(row).toContainText(customers.ngoc.phone)
    await expect(row).toContainText(group.name)
  })

  await step("Create Lê Quốc Bảo without a group", async () => {
    await search.fill(customers.bao.phone)
    if ((await rowByPhone(page, customers.bao.phone).count()) > 0) return
    await page.getByRole("button", { name: "Thêm khách hàng", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Thêm khách hàng mới" })).toBeVisible()
    await page.getByLabel("Họ và tên *").fill(customers.bao.name)
    await page.getByLabel("Số điện thoại *").fill(customers.bao.phone)
    await page.getByLabel("Email").fill(customers.bao.email)
    // The form preselects the first group, so "not in a group" has to be chosen explicitly
    await customerForm(page).getByLabel("Nhóm khách hàng").selectOption({ label: "-- Chưa phân nhóm --" })
    await page.getByRole("button", { name: "Lưu khách hàng" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã tạo khách hàng mới" })).toBeVisible()
  })

  await step("He is listed with his phone and no group", async () => {
    const row = rowByPhone(page, customers.bao.phone)
    await expect(row).toBeVisible()
    await expect(row).toContainText(customers.bao.phone)
    await expect(row).not.toContainText(group.name)
  })

  await step("A second customer with Bích Ngọc's phone is refused", async () => {
    await search.fill(customers.ngoc.phone)
    await page.getByRole("button", { name: "Thêm khách hàng", exact: true }).click()
    await page.getByLabel("Họ và tên *").fill(DUPLICATE_CUSTOMER_NAME)
    await page.getByLabel("Số điện thoại *").fill(customers.ngoc.phone)
    await page.getByRole("button", { name: "Lưu khách hàng" }).click()
    await expect(page.getByText("Số điện thoại đã tồn tại trong danh sách khách hàng.")).toBeVisible()
    await page.getByRole("button", { name: "Hủy" }).click()
  })

  await step("Only the real Bích Ngọc is in the list", async () => {
    await search.fill(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.ngoc.phone)).toHaveCount(1)
    await expect(page.getByText(DUPLICATE_CUSTOMER_NAME)).toHaveCount(0)
  })
})

test("F07.3 Search by phone, filter by group, and both customers survive a reload", async ({ page, step }) => {
  await page.goto("/customers")
  const search = searchBox(page)

  await step("Search by Bích Ngọc's phone number", async () => {
    await waitForCustomers(page)
    await search.fill(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.ngoc.phone)).toHaveCount(1)
    await expect(rowByPhone(page, customers.ngoc.phone)).toContainText(customers.ngoc.name)
    await expect(rowByPhone(page, customers.bao.phone)).toHaveCount(0)
  })

  await step("Filter by the group 'Khách thân thiết'", async () => {
    await search.fill("")
    await page.getByLabel("Lọc theo nhóm khách hàng").selectOption({ label: group.name })
    await expect(rowByPhone(page, customers.ngoc.phone)).toBeVisible()
    await expect(rowByPhone(page, customers.ngoc.phone)).toContainText(group.name)
    // Quốc Bảo is not in the group, so the group filter hides him
    await expect(rowByPhone(page, customers.bao.phone)).toHaveCount(0)
  })

  await step("Reload: both customers are still listed", async () => {
    await page.reload()
    await waitForCustomers(page)
    await expect(rowByPhone(page, customers.ngoc.phone)).toBeVisible()
    await expect(rowByPhone(page, customers.ngoc.phone)).toContainText(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.bao.phone)).toBeVisible()
    await expect(rowByPhone(page, customers.bao.phone)).toContainText(customers.bao.phone)
  })

  await step("Reload: Bích Ngọc is still in the group", async () => {
    await page.getByLabel("Lọc theo nhóm khách hàng").selectOption({ label: group.name })
    await expect(rowByPhone(page, customers.ngoc.phone)).toBeVisible()
    await expect(rowByPhone(page, customers.ngoc.phone)).toContainText(group.name)
    await expect(rowByPhone(page, customers.bao.phone)).toHaveCount(0)
  })
})

test("F07.4 Add 100 loyalty points to Bích Ngọc and refuse overdrawing them", async ({ page, step }) => {
  await page.goto("/customers")
  const search = searchBox(page)

  await step("Find Bích Ngọc in the list", async () => {
    await waitForCustomers(page)
    await search.fill(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.ngoc.phone)).toBeVisible()
  })

  // The store is shared and a re-run finds the points an earlier run added, so every number below is a delta against
  // the balance read here (on a fresh store it is 0 and the assertions are the flow's exact 100)
  let before = 0
  await step("Note her current points balance", async () => {
    // Read through the API: the list prints its points after the row appears, so reading the page here races
    const list = await gw<{ data: { id: string; phone: string }[] }>("/customer/api/v1/customers?page=1&limit=100")
    const id = list.data.find((c) => c.phone === customers.ngoc.phone)?.id
    expect(id, "Bích Ngọc exists (F07.2)").toBeTruthy()
    before = (await gw<{ availablePoints: number }>(`/customer/api/v1/customers/${id}/loyalty`)).availablePoints
  })

  await step("Add 100 points with the reason 'Quà sinh nhật'", async () => {
    await openDrawer(page, customers.ngoc.phone)
    await adjustPoints(page, "ADD", POINTS_GIFT, POINTS_REASON)
    await expect(page.getByRole("status").filter({ hasText: `Đã cộng +${POINTS_GIFT} điểm thưởng` })).toBeVisible()
  })

  await step("The drawer shows 100 available points and the ledger the adjustment", async () => {
    await expect(drawer(page).getByRole("tab", { name: new RegExp(`Điểm thưởng\\s+${before + POINTS_GIFT}$`) })).toBeVisible()
    // newest entry first: a re-run on the same store has older entries with the same reason below it
    await expect(drawer(page).getByText(POINTS_REASON).first()).toBeVisible()
    await expect(drawer(page).getByText(`+${POINTS_GIFT} điểm`, { exact: true }).first()).toBeVisible()
  })

  await step("Reload and reopen the drawer: the balance is still the old balance + 100", async () => {
    await page.reload()
    await waitForCustomers(page)
    await search.fill(customers.ngoc.phone)
    await openDrawer(page, customers.ngoc.phone)
    await expect(drawer(page).getByRole("tab", { name: new RegExp(`Điểm thưởng\\s+${before + POINTS_GIFT}$`) })).toBeVisible()
  })

  await step("Subtracting more points than the balance is refused and the balance does not change", async () => {
    await adjustPoints(page, "DEDUCT", before + POINTS_GIFT + 1, POINTS_OVERDRAW_REASON)
    await expect(page.getByRole("alert").filter({ hasText: "Số điểm trừ vượt quá số dư khả dụng" })).toBeVisible()
    await expect(drawer(page).getByRole("tab", { name: new RegExp(`Điểm thưởng\\s+${before + POINTS_GIFT}$`) })).toBeVisible()
  })
})

test("F07.4b The customer list shows each customer's points", async ({ page, step }) => {
  test.fixme(
    true,
    "App bug: GET /customers returns the balance as `loyaltyPoints` but CustomersPage.tsx reads `item.pointsBalance`, " +
      "so the 'Điểm thưởng' column of the list always shows '0 điểm'. Remove this line when the list reads loyaltyPoints.",
  )
  await page.goto("/customers")
  await waitForCustomers(page)
  await step("Search Bích Ngọc: her row shows the points she has", async () => {
    await searchBox(page).fill(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.ngoc.phone).getByRole("button", { name: /điểm$/ })).not.toContainText(/^0 điểm$/)
  })
})

test("F07.5 Add a delivery address in the drawer and see the empty debt state", async ({ page, step }) => {
  await page.goto("/customers")
  const search = searchBox(page)
  const fullAddress = `${DELIVERY_ADDRESS.line}, ${DELIVERY_ADDRESS.ward}, ${DELIVERY_ADDRESS.district}, ${DELIVERY_ADDRESS.province}`

  await step("Open Bích Ngọc's address book", async () => {
    await waitForCustomers(page)
    await search.fill(customers.ngoc.phone)
    await openDrawer(page, customers.ngoc.phone)
    await drawer(page).getByRole("tab", { name: /Sổ địa chỉ/ }).click()
  })

  await step("Clear the address an earlier run may have left", async () => {
    if ((await drawer(page).getByText(fullAddress).count()) === 0) return
    const deletes = drawer(page).getByTitle("Xóa địa chỉ")
    const count = await deletes.count()
    for (let i = 0; i < count; i += 1) {
      page.once("dialog", (dialog) => {
        expect(dialog.message()).toBe("Xóa địa chỉ giao hàng này khỏi sổ địa chỉ?")
        void dialog.accept()
      })
      await deletes.first().click()
      await expect(deletes).toHaveCount(count - i - 1)
    }
  })

  await step("Add 18 Lý Thường Kiệt as her delivery address", async () => {
    await drawer(page).getByRole("button", { name: "Thêm địa chỉ" }).click()
    await drawer(page).getByLabel("Số nhà, tên đường / tòa nhà *").fill(DELIVERY_ADDRESS.line)
    await drawer(page).getByLabel("Phường / Xã").fill(DELIVERY_ADDRESS.ward)
    await drawer(page).getByLabel("Quận / Huyện").fill(DELIVERY_ADDRESS.district)
    await drawer(page).getByLabel("Tỉnh / Thành phố").fill(DELIVERY_ADDRESS.province)
    await drawer(page).getByRole("button", { name: "Lưu địa chỉ" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã thêm địa chỉ giao hàng mới" })).toBeVisible()
    await expect(drawer(page).getByText(fullAddress)).toBeVisible()
  })

  await step("Reload: the address is still in her address book", async () => {
    await page.reload()
    await waitForCustomers(page)
    await search.fill(customers.ngoc.phone)
    await openDrawer(page, customers.ngoc.phone)
    await drawer(page).getByRole("tab", { name: /Sổ địa chỉ/ }).click()
    await expect(drawer(page).getByText(fullAddress)).toBeVisible()
  })

  await step("The debt tab has no open receivable", async () => {
    await drawer(page).getByRole("tab", { name: /Dư nợ & Công nợ/ }).click()
    await expect(drawer(page).getByText("Chứng từ phải thu khách hàng (0)")).toBeVisible()
    await expect(drawer(page).getByText("Không có khoản phải thu nào đang mở.")).toBeVisible()
    await expect(drawer(page).getByText("Không có công nợ quá hạn")).toBeVisible()
  })
})

test("F07.6 Add the membership tier GOLD 'Hạng Vàng'", async ({ page, step }) => {
  // The heading of a tier card: h3 -> its wrapper -> the card itself
  const tierCard = () => page.getByRole("heading", { name: TIER.name }).locator("..").locator("..")

  await page.goto("/customers?tab=loyalty")

  await step("Open the loyalty tab", async () => {
    await expect(page.getByRole("tab", { name: /Hạng thành viên & Tích điểm/ })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("button", { name: "Thêm hạng thành viên" })).toBeVisible()
    await page.waitForLoadState("networkidle")
  })

  await step("Create the tier with code GOLD (an earlier run may already have left it)", async () => {
    if ((await page.getByText(TIER.code, { exact: true }).count()) > 0) return
    await page.getByRole("button", { name: "Thêm hạng thành viên" }).click()
    await expect(page.getByRole("heading", { name: "Tạo hạng thành viên mới" })).toBeVisible()
    await page.getByLabel("Mã hạng").fill(TIER.code)
    await page.getByLabel("Tên hiển thị *").fill(TIER.name)
    await page.getByLabel("Điểm tối thiểu đạt hạng *").fill(String(TIER.minPoints))
    await page.getByLabel("Ưu đãi chiết khấu hạng (%)").fill(String(TIER.discountRate))
    await page.getByRole("button", { name: "Tạo hạng mới" }).click()
    await expect(page.getByRole("status").filter({ hasText: `Đã thêm hạng thành viên ${TIER.name}` })).toBeVisible()
  })

  await step("The tier lists its code, points threshold and discount", async () => {
    for (const text of [TIER.code, `Từ ${vnd(TIER.minPoints)} điểm tích lũy`, `Chiết khấu ${TIER.discountRate}%`, "Đang áp dụng"]) {
      await expect(tierCard()).toContainText(text)
    }
  })

  await step("Reload: the tier is still listed", async () => {
    await page.reload()
    await expect(page.getByRole("tab", { name: /Hạng thành viên & Tích điểm/ })).toHaveAttribute("aria-selected", "true")
    for (const text of [TIER.code, TIER.name, `Chiết khấu ${TIER.discountRate}%`]) {
      await expect(tierCard()).toContainText(text)
    }
  })
})

test("F07.7 Edit Quốc Bảo's name, then create and delete a throwaway customer", async ({ page, step }) => {
  await page.goto("/customers")
  const search = searchBox(page)

  await step("Open Quốc Bảo's edit form", async () => {
    await waitForCustomers(page)
    await search.fill(customers.bao.phone)
    await rowByPhone(page, customers.bao.phone)
      .getByRole("button", { name: new RegExp(`^Chỉnh sửa ${customers.bao.name}`) })
      .click()
    await expect(page.getByRole("heading", { name: "Chỉnh sửa hồ sơ khách hàng" })).toBeVisible()
  })

  await step("Add the suffix ' (Khách quen)' to his name and save", async () => {
    const name = page.getByLabel("Họ và tên *")
    const current = await name.inputValue()
    // Idempotent: on a second run the name already carries the suffix
    await name.fill(current.endsWith(NAME_SUFFIX) ? current : `${current}${NAME_SUFFIX}`)
    await page.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật hồ sơ khách hàng" })).toBeVisible()
  })

  await step("Reload: his row shows the new name", async () => {
    await page.reload()
    await waitForCustomers(page)
    await search.fill(customers.bao.phone)
    await expect(rowByPhone(page, customers.bao.phone)).toContainText(`${customers.bao.name}${NAME_SUFFIX}`)
  })

  await step("Create a throwaway customer 'Khách thử xóa'", async () => {
    await search.fill(THROWAWAY_CUSTOMER.phone)
    if ((await rowByPhone(page, THROWAWAY_CUSTOMER.phone).count()) > 0) return
    await page.getByRole("button", { name: "Thêm khách hàng", exact: true }).click()
    await page.getByLabel("Họ và tên *").fill(THROWAWAY_CUSTOMER.name)
    await page.getByLabel("Số điện thoại *").fill(THROWAWAY_CUSTOMER.phone)
    await page.getByRole("button", { name: "Lưu khách hàng" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Đã tạo khách hàng mới" })).toBeVisible()
    await expect(rowByPhone(page, THROWAWAY_CUSTOMER.phone)).toContainText(THROWAWAY_CUSTOMER.name)
  })

  await step("Delete it and confirm the browser's question", async () => {
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(`Xóa khách hàng ${THROWAWAY_CUSTOMER.name}?`)
      void dialog.accept()
    })
    await rowByPhone(page, THROWAWAY_CUSTOMER.phone)
      .getByRole("button", { name: `Xóa ${THROWAWAY_CUSTOMER.name}` })
      .click()
    await expect(page.getByRole("status").filter({ hasText: `Đã xóa hồ sơ ${THROWAWAY_CUSTOMER.name}` })).toBeVisible()
  })

  await step("Reload: the throwaway is gone, Bích Ngọc is still there", async () => {
    await page.reload()
    await waitForCustomers(page)
    await search.fill(THROWAWAY_CUSTOMER.phone)
    await expect(page.getByText("Không tìm thấy khách hàng")).toBeVisible()
    await search.fill(customers.ngoc.phone)
    await expect(rowByPhone(page, customers.ngoc.phone)).toBeVisible()
  })
})
