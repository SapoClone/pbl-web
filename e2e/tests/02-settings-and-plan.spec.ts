import type { Page } from "@playwright/test"
import { asOwner, expect, test } from "../support/fixtures"
import { branches, freePlan, store } from "../support/data"

/**
 * Flows F02.1 - F02.5 of flows/FLOWS.md: the settings page (UI-INVENTORY section 14) - the store's own details, the
 * branch list and the subscription plan card.
 *
 * Needs: 01 (the store, the owner session and the one branch the store was created with).
 * Leaves: the store's phone/address are store.newPhone / store.newAddress, the only branch carries BRANCH_ADDRESS and
 * the store still has exactly one branch (F02.5 tries to add a second one and must be refused).
 */

asOwner()

/** What the store uses at this point of the suite: one branch (created with it) and one user (the owner). */
const usageNow = { branches: 1, users: 1 }

/** A phone the form's pattern (\+?[0-9]{8,15}) refuses, because of the dashes (F02.2). */
const invalidPhone = "0901-2345-67"

/** The "Thông tin cửa hàng" card, so its labels are not confused with the branch dialog's ones. */
const storeSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Thông tin cửa hàng" }) })

/** The "Gói dịch vụ" section, so its "Chi nhánh"/"Người dùng" labels are not confused with the branch table's. */
const planSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Gói dịch vụ" }) })

/** One quota tile of that section: its label ("Chi nhánh", "Người dùng", …) and the "used / limit" line below it. */
const usageTile = (page: Page, label: string) => planSection(page).getByText(label, { exact: true }).locator("..")

test("F02.1 The owner edits the store's phone and address and both persist", async ({ page, step }) => {
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Cài đặt cửa hàng", exact: true })).toBeVisible()

  await step("The shop's details are shown as they were created", async () => {
    await expect(storeSection(page).getByLabel("Tên cửa hàng")).toHaveValue(store.name)
    await expect(storeSection(page).getByLabel("Email cửa hàng")).toHaveValue(store.email)
    await expect(storeSection(page).getByText("Đang hoạt động")).toBeVisible()
  })

  await step("The access code is shown but cannot be changed", async () => {
    const code = storeSection(page).getByLabel("Mã cửa hàng")
    await expect(code).toHaveValue(store.accessCode())
    await expect(code).toHaveJSProperty("readOnly", true)
    await expect(storeSection(page).getByText("Mã cửa hàng không thể thay đổi.")).toBeVisible()
  })

  // UX finding: a refused store save sets the same `error` state the branch section prints, and the store card prints
  // nothing, so the message would appear under "Danh sách chi nhánh" instead of next to the form.
  await step("Enter the new phone and address and save", async () => {
    await storeSection(page).getByLabel("Số điện thoại").fill(store.newPhone)
    await storeSection(page).getByLabel("Địa chỉ").fill(store.newAddress)
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/tenants/current") && r.request().method() === "PATCH"),
      storeSection(page).getByRole("button", { name: "Lưu thông tin" }).click(),
    ])
    expect(response.ok()).toBe(true)
  })

  await step("Reload: the shop still has the new phone and address", async () => {
    await page.reload()
    await expect(storeSection(page).getByLabel("Số điện thoại")).toHaveValue(store.newPhone)
    await expect(storeSection(page).getByLabel("Địa chỉ")).toHaveValue(store.newAddress)
    await expect(storeSection(page).getByLabel("Tên cửa hàng")).toHaveValue(store.name)
  })
})

test("F02.2 An invalid phone number is refused by the form and nothing is saved", async ({ page, step }) => {
  await page.goto("/settings")
  // This test runs after F02.1 (same file, declaration order), which saved store.newPhone: a reload can only show it
  // again if this attempt was refused, and the assertion is tied to data.ts rather than to the page's own value.
  const phone = storeSection(page).getByLabel("Số điện thoại")
  await expect(phone).toHaveValue(store.newPhone)

  await step("Type a phone with dashes and press 'Lưu thông tin'", async () => {
    await phone.fill(invalidPhone)
    await storeSection(page).getByRole("button", { name: "Lưu thông tin" }).click()
  })

  await step("The browser refuses the value, so the form never submits", async () => {
    await expect.poll(() => phone.evaluate((el) => (el as HTMLInputElement).validity.patternMismatch)).toBe(true)
    await expect(phone).toBeFocused()
    // no server round trip, so not even the page's own error for a refused update
    await expect(
      page.getByText("Không thể cập nhật thông tin cửa hàng. Hãy kiểm tra dữ liệu và quyền tài khoản."),
    ).toHaveCount(0)
  })

  await step("Reload: the store still has the phone and address saved in F02.1", async () => {
    await page.reload()
    await expect(storeSection(page).getByLabel("Số điện thoại")).toHaveValue(store.newPhone)
    await expect(storeSection(page).getByLabel("Địa chỉ")).toHaveValue(store.newAddress)
  })
})

test("F02.3 The plan section shows the current Free plan, its limits and the usage", async ({ page, step }) => {
  await page.goto("/settings")

  await step("The badge names the plan the shop is on", async () => {
    await expect(planSection(page).getByRole("heading", { name: "Gói dịch vụ" })).toBeVisible()
    await expect(planSection(page).getByText(`Đang dùng: ${freePlan.name}`)).toBeVisible()
  })

  await step("The card tagged 'Gói hiện tại' is the Free card, with its limits", async () => {
    const card = planSection(page).locator("article").filter({ hasText: "Gói hiện tại" })
    await expect(card).toHaveCount(1)
    await expect(card.getByRole("heading", { name: freePlan.name, exact: true })).toBeVisible()
    await expect(card.getByText("Gói hiện tại")).toBeVisible()
    await expect(card).toContainText("Miễn phí")
    await expect(card).toContainText(`${freePlan.branches} chi nhánh`)
    await expect(card).toContainText(`${freePlan.users} người dùng`)
    await expect(card).toContainText(`${freePlan.products} sản phẩm`)
    await expect(card).toContainText(`${freePlan.storageGb} GB lưu trữ`)
  })

  await step("The usage lines: 1 branch and 1 user against the plan's limits", async () => {
    await expect(usageTile(page, "Chi nhánh")).toContainText(`${usageNow.branches} / ${freePlan.branches}`)
    await expect(usageTile(page, "Người dùng")).toContainText(`${usageNow.users} / ${freePlan.users}`)
    await expect(usageTile(page, "Sản phẩm")).toContainText(`/ ${freePlan.products}`)
    await expect(usageTile(page, "Dung lượng (GB)")).toContainText(`/ ${freePlan.storageGb}`)
  })

  await step("The page says plan changes are made by the system admin", async () => {
    await expect(
      planSection(page).getByText(
        "Việc đổi gói hiện do quản trị viên hệ thống thực hiện; owner chỉ xem gói và hạn mức của cửa hàng.",
      ),
    ).toBeVisible()
  })
})

test("F02.4 The branch list shows the store's branch and its edited address persists", async ({ page, step }) => {
  await page.goto("/settings")
  const row = page.getByRole("row").filter({ hasText: branches.main.name })

  await step("One branch: the one created together with the store", async () => {
    await expect(page.getByRole("heading", { name: "Chi nhánh", exact: true })).toBeVisible()
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(branches.main.code)
    await expect(row).toContainText("Đang hoạt động")
    await expect(row.getByRole("button", { name: "Sửa" })).toBeVisible()
  })

  await step("Open 'Sửa' and change the branch's address", async () => {
    await row.getByRole("button", { name: "Sửa" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Sửa chi nhánh" })).toBeVisible()
    await expect(dialog.getByLabel("Tên chi nhánh")).toHaveValue(branches.main.name)
    await expect(dialog.getByLabel("Mã chi nhánh")).toHaveValue(branches.main.code)
    await expect(dialog.getByRole("checkbox", { name: "Dùng làm kho" })).toBeChecked()
    await dialog.getByLabel("Địa chỉ").fill(branches.main.newAddress)
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(dialog).toHaveCount(0)
  })

  await step("The row now shows the new address", async () => {
    await expect(row).toContainText(branches.main.newAddress)
  })

  await step("Reload: the address is still there, and it is still the only branch", async () => {
    await page.reload()
    await expect(page.getByRole("row").filter({ hasText: branches.main.name })).toContainText(branches.main.newAddress)
    await expect(page.getByRole("row").filter({ hasText: branches.main.code })).toHaveCount(1)
  })
})

test("F02.5 The Free plan refuses a second branch", async ({ page, step }) => {
  await page.goto("/settings")

  await step("The plan allows one branch and the store already uses it", async () => {
    const card = planSection(page).locator("article").filter({ hasText: "Gói hiện tại" })
    await expect(card).toContainText(`${freePlan.branches} chi nhánh`)
    await expect(page.getByRole("row").filter({ hasText: branches.main.name })).toHaveCount(1)
  })

  const dialog = page.getByRole("dialog")
  await step("Fill in a second branch ('Chi nhánh Quận 3')", async () => {
    await page.getByRole("button", { name: "Thêm chi nhánh" }).click()
    await expect(dialog.getByRole("heading", { name: "Thêm chi nhánh" })).toBeVisible()
    await dialog.getByLabel("Tên chi nhánh").fill(branches.second.name)
    await dialog.getByLabel("Mã chi nhánh").fill(branches.second.code)
    await dialog.getByLabel("Địa chỉ").fill(branches.second.address)
    await dialog.getByLabel("Số điện thoại").fill(branches.second.phone)
  })

  await step("Submit: the plan limit refuses it and the page shows an error", async () => {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/branches") && r.request().method() === "POST"),
      dialog.getByRole("button", { name: "Tạo chi nhánh" }).click(),
    ])
    // 409 quota.error.limit_reached: the backend says "Gói Free chỉ cho phép tối đa 1 chi nhánh…", but the page
    // throws the server's text away and prints its generic creation error (UX finding, see the report)
    expect(response.status()).toBe(409)
    await expect(
      dialog.getByText("Không thể tạo chi nhánh. Hãy kiểm tra mã chi nhánh và quyền tài khoản."),
    ).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  await step("Close and reload: the store still has exactly one branch", async () => {
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole("row").filter({ hasText: branches.second.code })).toHaveCount(0)
    await expect(page.getByRole("row").filter({ hasText: branches.second.name })).toHaveCount(0)
    // the table's header row plus the one branch
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(page.getByRole("button", { name: new RegExp(store.name) })).toContainText("1 chi nhánh")
  })
})
