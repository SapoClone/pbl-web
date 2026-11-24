import type { Locator, Page } from "@playwright/test"
import { register } from "../support/api"
import { people } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F11.1 - F11.6 of flows/FLOWS.md: staff, roles and what a role can see.
 *
 * Needs: 01 (the store and the owner's signed-in session) and 02 for the branch name. The app only lets the owner add
 * an account that already exists, so F11.2 registers the cashier with `register()` from support/api.ts first.
 * Leaves after F11.6: the custom role (0 members), no cashier membership and no shifts - so a second run of this file
 * starts from the same state. Re-runs are tolerant throughout: a role/member/shift left behind by an interrupted run is
 * proved instead of created again, and the duplicate-name/overlap checks work whether or not it was there.
 *
 * Local constants (this worktree's support/data.ts is older than the main checkout's): the role, the shift and the main
 * branch values below are copied from the main checkout's data.ts and should be moved into data.ts when this worktree
 * is refreshed. `permissionLabels` is needed because a matrix checkbox is named after the module's *label* returned by
 * GET /permissions, while `roles.cashier.cells` uses the module *code*.
 */
asOwner()
test.describe.configure({ mode: "serial" })

const cashier = people.cashier

const cashierRole = {
  name: "Thu ngân ca sáng",
  description: "Chỉ bán hàng tại quầy và xem đơn, khách hàng",
  cells: [
    ["pos", "Xem"],
    ["orders", "Xem"],
    ["customers", "Xem"],
  ] as const,
}

const cashierShift = { name: "Ca sáng", start: "07:00", end: "12:00" }
const mainBranch = { name: "Chi nhánh chính", code: "CN01" }

const permissionLabels: Record<string, string> = {
  pos: "Bán tại quầy",
  orders: "Đơn hàng",
  customers: "Khách hàng",
}

const cellCheckbox = (page: Page, module: string, action: string) =>
  page.getByRole("checkbox", { name: `${permissionLabels[module]}: ${action}` })

const rolesNav = (page: Page) => page.getByRole("navigation", { name: "Danh sách vai trò" })

const roleInList = (page: Page) =>
  rolesNav(page).getByRole("button", { name: new RegExp(`^${cashierRole.name}`) })

const memberRow = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name })

/** Select a native <select> by the visible text of its option (ids are random per store). */
async function selectByText(select: Locator, text: string) {
  const value = await select.locator("option").filter({ hasText: text }).getAttribute("value")
  expect(value, `option '${text}'`).toBeTruthy()
  await select.selectOption(value!)
}

/** The weekday inputs are visually hidden; a person clicks the chip (the wrapping label), so we do too. */
async function setDay(dialog: Locator, day: string, on: boolean) {
  const checkbox = dialog.getByRole("checkbox", { name: day })
  if ((await checkbox.isChecked()) !== on) await checkbox.locator("xpath=..").click()
  if (on) await expect(checkbox).toBeChecked()
  else await expect(checkbox).not.toBeChecked()
}

/** Setup: the app only adds accounts that already exist. A re-run finds E003 "email exists" instead of 201. */
async function registerCashierIfMissing() {
  try {
    await register(cashier.email(), cashier.password, cashier.name)
  } catch (error) {
    expect(String(error)).toMatch(/E003|email_exists|đã tồn tại|already/i)
  }
}

test("F11.1 Create the cashier role, prove its permissions survive a reload, and refuse a duplicate name", async ({
  page,
  step,
}) => {
  await step("Open 'Vai trò & phân quyền' from the staff page", async () => {
    await page.goto("/staff?tab=roles")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Vai trò & phân quyền", level: 1 })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Vai trò & phân quyền" })).toHaveAttribute("aria-selected", "true")
  })

  await step(`Create '${cashierRole.name}' with the three 'Xem' cells of data.ts`, async () => {
    // A previous run (or an interrupted one) may already have left the role: prove it instead of creating a second.
    if ((await roleInList(page).count()) === 0) {
      await page.getByRole("button", { name: "Thêm vai trò" }).click()
      await expect(page.getByRole("heading", { name: "Vai trò mới" })).toBeVisible()
      await page.getByRole("textbox", { name: "Tên vai trò" }).fill(cashierRole.name)
      await page.getByRole("textbox", { name: "Mô tả vai trò" }).fill(cashierRole.description)
      for (const [module, action] of cashierRole.cells) {
        await cellCheckbox(page, module, action).check()
      }
      await expect(
        page.getByText(`Chưa lưu: thêm ${cashierRole.cells.length} quyền, bỏ 0 quyền.`),
      ).toBeVisible()
      await page.getByRole("button", { name: "Tạo vai trò" }).click()
      await expect(roleInList(page)).toBeVisible()
    } else {
      await roleInList(page).click()
    }
    await expect(page.getByRole("textbox", { name: "Tên vai trò" })).toHaveValue(cashierRole.name)
  })

  await step("After a reload the name, description and ticked cells are still there", async () => {
    await page.reload()
    await settled(page)
    await roleInList(page).click()
    await expect(page.getByRole("textbox", { name: "Tên vai trò" })).toHaveValue(cashierRole.name)
    await expect(page.getByRole("textbox", { name: "Mô tả vai trò" })).toHaveValue(cashierRole.description)
    for (const [module, action] of cashierRole.cells) {
      await expect(cellCheckbox(page, module, action)).toBeChecked()
    }
    await expect(rolesNav(page).getByRole("button", { name: new RegExp(`^${cashierRole.name}`) })).toContainText(
      "Tùy chỉnh",
    )
  })

  await step("A second role with the same name is refused with R001", async () => {
    await page.getByRole("button", { name: "Thêm vai trò" }).click()
    await expect(page.getByRole("heading", { name: "Vai trò mới" })).toBeVisible()
    await page.getByRole("textbox", { name: "Tên vai trò" }).fill(cashierRole.name)
    await page.getByRole("button", { name: "Tạo vai trò" }).click()
    await expect(page.getByRole("alert")).toHaveText("Tên vai trò đã tồn tại. Hãy chọn tên khác.")
    await expect(page.getByRole("heading", { name: "Vai trò mới" })).toBeVisible()
  })
})

test("F11.2 Register the cashier, add him with the role and branch scope, and refuse an unknown email", async ({
  page,
  step,
}) => {
  await step("Register Lê Hoàng Nam's account through the API (the UI only adds existing accounts)", async () => {
    await registerCashierIfMissing()
  })

  await step("Open the 'Nhân viên' tab", async () => {
    await page.goto("/staff")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Nhân viên & Quyền", level: 1 })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Nhân viên" })).toHaveAttribute("aria-selected", "true")
  })

  await step(`Add ${cashier.name} by email with '${cashierRole.name}' and the '${mainBranch.name}' scope`, async () => {
    // An interrupted earlier run may have left him here (possibly locked); the flow only needs one active membership.
    const leftover = memberRow(page, cashier.name)
    if ((await leftover.count()) > 0 && (await leftover.innerText()).includes("Đang khóa")) {
      await leftover.getByRole("button", { name: "Mở khóa nhân viên" }).click()
      await expect(leftover).toContainText("Đang hoạt động")
    }
    if ((await memberRow(page, cashier.name).count()) === 0) {
      await page.getByRole("button", { name: "Thêm nhân viên" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByRole("heading", { name: "Thêm nhân viên" })).toBeVisible()
      await dialog.getByRole("textbox", { name: "Email tài khoản" }).fill(cashier.email())
      await selectByText(dialog.getByRole("combobox", { name: "Vai trò" }), cashierRole.name)
      await dialog.getByRole("checkbox", { name: mainBranch.name }).check()
      await dialog.getByRole("button", { name: "Thêm nhân viên" }).click()
      await expect(dialog).toBeHidden()
    }
    const row = memberRow(page, cashier.name)
    await expect(row).toBeVisible()
    await expect(row).toContainText(cashier.email())
    await expect(row).toContainText(cashierRole.name)
    await expect(row).toContainText("1 chi nhánh")
    await expect(row).toContainText("Đang hoạt động")
  })

  await step("Reload: he is still listed with the same role and branch scope", async () => {
    await page.reload()
    await settled(page)
    const row = memberRow(page, cashier.name)
    await expect(row).toBeVisible()
    await expect(row).toContainText(cashierRole.name)
    await expect(row).toContainText("1 chi nhánh")
    await expect(row.getByRole("button", { name: "Sửa quyền" })).toBeVisible()
  })

  await step("An email with no account is refused with the registration-required message", async () => {
    await page.getByRole("button", { name: "Thêm nhân viên" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("textbox", { name: "Email tài khoản" }).fill(people.stranger.email())
    await selectByText(dialog.getByRole("combobox", { name: "Vai trò" }), cashierRole.name)
    await dialog.getByRole("button", { name: "Thêm nhân viên" }).click()
    await expect(dialog.getByText("Không thể thêm nhân viên. Tài khoản phải đăng ký trước và bạn cần quyền phù hợp.")).toBeVisible()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
    await expect(memberRow(page, people.stranger.email())).toHaveCount(0)
  })
})

test("F11.3 Schedule Nam's morning shift Mon-Fri and refuse overlaps or an inverted range", async ({ page, step }) => {
  // Weekday labels of the grid (src/features/staff/shiftsGrid.ts); the range separator is an en dash.
  const workdays = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu"]
  const shiftButton = (day: string) =>
    page.getByRole("button", {
      name: `Sửa ca ${cashier.name} ${day} ${cashierShift.start}–${cashierShift.end} Thu ngân`,
    })

  await step("Open the 'Ca làm việc' tab on the main branch", async () => {
    await page.goto("/staff?tab=shifts")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Ca làm việc", level: 1 })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Ca làm việc" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("combobox", { name: "Chi nhánh" })).toContainText(mainBranch.name)
  })

  await step(`Create one '${cashierShift.name}' ${cashierShift.start}-${cashierShift.end} shift for Monday to Friday as 'Thu ngân'`, async () => {
    // An interrupted run may have left the five weekday rows; a second POST would be refused as an overlap.
    if ((await shiftButton("Thứ hai").count()) === 0) {
      await page.getByRole("button", { name: "Thêm ca", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: "Thêm ca làm việc" })
      await expect(dialog).toBeVisible()
      await selectByText(dialog.getByRole("combobox", { name: "Nhân viên" }), cashier.name)
      for (const day of workdays) await setDay(dialog, day, true)
      for (const day of ["Thứ bảy", "Chủ nhật"]) await setDay(dialog, day, false)
      await dialog.getByRole("textbox", { name: "Giờ bắt đầu" }).fill(cashierShift.start)
      await dialog.getByRole("textbox", { name: "Giờ kết thúc" }).fill(cashierShift.end)
      await selectByText(dialog.getByRole("combobox", { name: "Phụ trách" }), "Thu ngân")
      await dialog.getByRole("textbox", { name: "Tên ca" }).fill(cashierShift.name)
      await dialog.getByRole("button", { name: "Thêm ca", exact: true }).click()
      await expect(dialog).toBeHidden()
    }
    for (const day of workdays) await expect(shiftButton(day)).toBeVisible()
  })

  await step("Reload: the weekly grid still shows the shift on each of the five days", async () => {
    await page.reload()
    await settled(page)
    for (const day of workdays) {
      await expect(shiftButton(day)).toBeVisible()
      await expect(shiftButton(day)).toContainText(cashierShift.name)
    }
  })

  await step("A second, overlapping shift for Nam on Monday is refused with S001", async () => {
    await page.getByRole("button", { name: "Thêm ca", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Thêm ca làm việc" })
    await selectByText(dialog.getByRole("combobox", { name: "Nhân viên" }), cashier.name)
    for (const day of ["Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"]) {
      await setDay(dialog, day, false)
    }
    await dialog.getByRole("textbox", { name: "Giờ bắt đầu" }).fill("08:00")
    await dialog.getByRole("textbox", { name: "Giờ kết thúc" }).fill("11:00")
    await dialog.getByRole("button", { name: "Thêm ca", exact: true }).click()
    await expect(dialog.getByRole("alert")).toHaveText(
      "Nhân viên đã có ca trùng giờ trong ngày này (ở bất kỳ chi nhánh nào). Hãy đổi giờ hoặc xóa ca cũ.",
    )
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
    await expect(shiftButton("Thứ hai")).toBeVisible()
  })

  await step("A shift ending before it starts is blocked by the form's validation", async () => {
    await page.getByRole("button", { name: "Thêm ca", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Thêm ca làm việc" })
    await selectByText(dialog.getByRole("combobox", { name: "Nhân viên" }), cashier.name)
    await dialog.getByRole("textbox", { name: "Giờ bắt đầu" }).fill("12:00")
    await dialog.getByRole("textbox", { name: "Giờ kết thúc" }).fill("07:00")
    await expect(
      dialog.getByText("Giờ kết thúc phải sau giờ bắt đầu. Ca qua đêm chưa được hỗ trợ: hãy tách thành hai ca."),
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Thêm ca", exact: true })).toBeDisabled()
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })
})

test("F11.4 Nam's role shows only the pages it can open", async ({ browser, step }) => {
  // A fresh context: none of the owner's saved session may leak into the cashier's view.
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await step("Nam signs in with his own email and password", async () => {
      await page.goto("/login")
      await page.getByLabel("Email").fill(cashier.email())
      await page.getByLabel("Mật khẩu", { exact: true }).fill(cashier.password)
      await page.getByRole("button", { name: /^Đăng nhập/ }).click()
      await expect(page).not.toHaveURL(/\/login$/)
      await expect(page.getByRole("complementary")).toBeVisible()
    })

    await step("The sidebar shows POS, Orders, Customers and Promotions (the last uses orders.view)", async () => {
      const sidebar = page.getByRole("complementary")
      await expect(sidebar.getByRole("link", { name: /^Bán tại quầy/ })).toBeVisible()
      await expect(sidebar.getByRole("link", { name: /^Đơn hàng/ })).toBeVisible()
      await expect(sidebar.getByRole("button", { name: "Khách hàng", exact: true })).toBeVisible()
      await expect(sidebar.getByRole("button", { name: "Khuyến mãi", exact: true })).toBeVisible()
    })

    await step("Staff, Reports and Products are hidden from his sidebar", async () => {
      const sidebar = page.getByRole("complementary")
      await expect(sidebar.getByRole("button", { name: "Nhân viên & Quyền", exact: true })).toHaveCount(0)
      await expect(sidebar.getByRole("button", { name: "Báo cáo", exact: true })).toHaveCount(0)
      await expect(sidebar.getByRole("button", { name: "Sản phẩm", exact: true })).toHaveCount(0)
    })

    await step("Opening /staff directly shows the no-access page and no 'Thêm nhân viên' button", async () => {
      await page.goto("/staff")
      const alert = page.getByRole("alert")
      await expect(alert.getByRole("heading", { name: "Bạn chưa có quyền mở trang này" })).toBeVisible()
      await expect(alert).toContainText("staff.view")
      await expect(page.getByRole("button", { name: "Thêm nhân viên" })).toHaveCount(0)
    })
  } finally {
    await context.close()
  }
})

test("F11.5 Locking Nam refuses his sign-in; unlocking lets him back in", async ({ browser, page, step }) => {
  await step("The owner locks Nam from the members list", async () => {
    await page.goto("/staff")
    await settled(page)
    const row = memberRow(page, cashier.name)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("Đang hoạt động")
    // The action has no text, only the icon's title (UI-INVENTORY.md section 13).
    await row.getByRole("button", { name: "Khóa nhân viên" }).click()
    await expect(row).toContainText("Đang khóa")
    await page.reload()
    await settled(page)
    await expect(memberRow(page, cashier.name)).toContainText("Đang khóa")
  })

  await step("While locked, signing in with the right password cannot enter the store", async () => {
    const context = await browser.newContext()
    const locked = await context.newPage()
    try {
      await locked.goto("/login")
      await locked.getByLabel("Email").fill(cashier.email())
      await locked.getByLabel("Mật khẩu", { exact: true }).fill(cashier.password)
      await locked.getByRole("button", { name: /^Đăng nhập/ }).click()
      // The membership is locked, so the token carries no store: the guard sends him to store setup instead of the
      // workspace, and a direct page URL is refused the same way.
      await expect(locked).toHaveURL(/\/onboarding-tenant$/)
      await expect(locked.getByRole("heading", { name: "Tạo cửa hàng của bạn" })).toBeVisible()
      await locked.goto("/orders")
      await expect(locked).toHaveURL(/\/onboarding-tenant$/)
    } finally {
      await context.close()
    }
  })

  await step("The owner unlocks him and the active status survives a reload", async () => {
    const row = memberRow(page, cashier.name)
    await row.getByRole("button", { name: "Mở khóa nhân viên" }).click()
    await expect(row).toContainText("Đang hoạt động")
    await page.reload()
    await settled(page)
    await expect(memberRow(page, cashier.name)).toContainText("Đang hoạt động")
  })

  await step("After unlock the same credentials open his workspace", async () => {
    const context = await browser.newContext()
    const unlocked = await context.newPage()
    try {
      await unlocked.goto("/login")
      await unlocked.getByLabel("Email").fill(cashier.email())
      await unlocked.getByLabel("Mật khẩu", { exact: true }).fill(cashier.password)
      await unlocked.getByRole("button", { name: /^Đăng nhập/ }).click()
      await expect(unlocked).toHaveURL(/\/$/)
      await expect(unlocked.getByRole("complementary").getByRole("link", { name: /^Đơn hàng/ })).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

test("F11.6 Remove Nam; the owner's row offers no action", async ({ page, step }) => {
  await step(`Remove ${cashier.name} with the confirmation dialog`, async () => {
    await page.goto("/staff")
    await settled(page)
    const row = memberRow(page, cashier.name)
    // A previous run may already have finished the removal: then only the outcome is proved.
    if ((await row.count()) > 0) {
      let confirmation = ""
      page.once("dialog", (dialog) => {
        confirmation = dialog.message()
        void dialog.accept()
      })
      await row.getByRole("button", { name: "Xóa" }).click()
      await expect(row).toHaveCount(0)
      expect(confirmation).toBe(`Xóa ${cashier.name} khỏi cửa hàng?`)
    }
    await expect(row).toHaveCount(0)
  })

  await step("Reload: he is gone and the owner row has only the 'Chủ cửa hàng' badge", async () => {
    await page.reload()
    await settled(page)
    await expect(memberRow(page, cashier.name)).toHaveCount(0)
    const ownerRow = memberRow(page, people.owner.name)
    await expect(ownerRow).toBeVisible()
    await expect(ownerRow).toContainText("Chủ cửa hàng")
    await expect(ownerRow.getByRole("button")).toHaveCount(0)
  })
})
