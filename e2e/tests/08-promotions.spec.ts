import type { Page } from "@playwright/test"
import { asOwner, expect, settled, test } from "../support/fixtures"
import { catalog, promotions, vnd } from "../support/data"

/**
 * Flows F08.1 - F08.3 of flows/FLOWS.md: the promotions page (UI-INVENTORY section 10) - the December discount
 * program, the coupon issued under it, and the program filters.
 *
 * Needs: 01 (the owner session). Leaves: the program "KM-THANG-12" - 10% off, every branch, every channel, no
 * minimum order and no end date, so it stays "Đang áp dụng" for the coupon sales of 09 - and the coupon "NOEL2026"
 * (100 uses in total, 1 per customer) under it.
 *
 * The last three tests are `test.fixme`: the gateway does not route PATCH /sales/api/v1/promotions/{id},
 * PATCH /sales/api/v1/coupons/{id} or POST /sales/api/v1/coupons/evaluate (each answers 404 "Route not found"),
 * so editing a program, editing a coupon and the "Kiểm thử áp mã" simulator cannot work yet.
 *
 * Re-runnable: a program and a coupon can be created but there is no DELETE route, so each flow first looks for its
 * code in the list and, on a second run against the same store, keeps and asserts the row an earlier run created
 * instead of creating it (and failing on the duplicate code) again.
 */

asOwner()

const program = promotions.program
const coupon = promotions.coupon

/**
 * The minimum order of the program: 0, so that the 65.000 VND Phin sale of F09.4 can use the coupon. data.ts has no
 * minimum-order constant; the form would otherwise default to 200.000 and break that sale.
 */
const programMinOrder = 0

/** data.ts has no per-customer cap for the coupon; one use per customer is enough for the single POS sale of 09. */
const couponUsesPerCustomer = 1

/** The values the two skipped edit flows would save (the coupon's cap is raised by 50 uses). */
const editedProgramPercent = 15
const editedCouponMaxUses = coupon.maxUses + 50

/** A row of the programs or the coupons table, found by the code it shows (codes are unique in the store). */
const rowByCode = (page: Page, code: string) => page.getByRole("row").filter({ hasText: code })

/** The three segmented tabs of the page; their names carry the row counts as a badge, hence the regular expressions. */
const tabs = (page: Page) => page.getByRole("tablist", { name: "Phân mục Khuyến mãi và Coupon" })

test("F08.1 The owner creates the December program and impossible discounts are refused", async ({ page, step }) => {
  await page.goto("/promotions")
  await settled(page)

  await step("The promotions page opens on the program list", async () => {
    await expect(page.getByRole("heading", { name: "Khuyến mãi & Mã giảm giá" })).toBeVisible()
    await expect(page.getByText("Phân hệ Khuyến mãi & Coupon Đa kênh")).toBeVisible()
    await expect(tabs(page).getByRole("tab", { name: /Chương trình khuyến mãi/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  // A program can be created but never deleted, so a second run must not create it again
  const alreadyCreated = await rowByCode(page, program.code).count()

  const dialog = page.getByRole("dialog", { name: "Tạo chương trình khuyến mãi" })
  const percent = dialog.getByLabel("Mức giảm (%) *")

  await step("Open 'Tạo chương trình KM': the dialog opens with a generated code", async () => {
    await page.getByRole("button", { name: "Tạo chương trình KM" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Tạo chương trình khuyến mãi mới" })).toBeVisible()
    await expect(dialog.getByLabel("Mã chương trình *")).toHaveValue(/^PROMO-[A-Z0-9]{5}$/)
    await dialog.getByLabel("Tên chiến dịch khuyến mãi *").fill(program.name)
  })

  await step("0% is refused: the field itself rejects it and nothing is created", async () => {
    await percent.fill("0")
    await dialog.getByRole("button", { name: "Tạo chương trình" }).click()
    // The input is type=number with min=1, so the browser stops the submit and focuses the field before the app's
    // own handleSubmit (and with it "Giá trị chiết khấu phải lớn hơn 0.") can run - see the report.
    await expect.poll(() => percent.evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow)).toBe(true)
    await expect(percent).toBeFocused()
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: /Đã tạo chương trình khuyến mãi/ })).toHaveCount(0)
  })

  await step("150% is refused the same way", async () => {
    await percent.fill("150")
    await dialog.getByRole("button", { name: "Tạo chương trình" }).click()
    await expect.poll(() => percent.evaluate((el) => (el as HTMLInputElement).validity.rangeOverflow)).toBe(true)
    await expect(percent).toBeFocused()
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: /Đã tạo chương trình khuyến mãi/ })).toHaveCount(0)
  })

  await step("A start date after the end date is refused with the app's message", async () => {
    await percent.fill(String(program.percent))
    await dialog.getByLabel("Từ ngày").fill("2026-12-31")
    await dialog.getByLabel("Đến ngày").fill("2026-12-01")
    await dialog.getByRole("button", { name: "Tạo chương trình" }).click()
    await expect(dialog.getByRole("alert")).toHaveText("Ngày bắt đầu không được lớn hơn ngày kết thúc.")
    await expect(dialog).toBeVisible()
  })

  if (alreadyCreated > 0) {
    await step(`${program.code} is already listed from an earlier run: close the form and keep it`, async () => {
      await dialog.getByRole("button", { name: "Hủy bỏ" }).click()
      await expect(dialog).toHaveCount(0)
    })
  } else {
    await step(`Create ${program.code}: ${program.percent}% off, every branch, every channel, no minimum`, async () => {
      await dialog.getByLabel("Mã chương trình *").fill(program.code)
      // The dates of the previous step are only there to be refused; the program must run from now on
      await dialog.getByLabel("Từ ngày").fill("")
      await dialog.getByLabel("Đến ngày").fill("")
      await dialog.getByLabel("Giá trị đơn hàng tối thiểu (VND)").fill(String(programMinOrder))
      // The form's live rule summary, before saving
      await expect(
        dialog.getByText(`Giảm ${program.percent}% cho mọi giá trị đơn hàng trên toàn hệ thống chi nhánh`),
      ).toBeVisible()
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/sales/api/v1/promotions") && r.request().method() === "POST"),
        dialog.getByRole("button", { name: "Tạo chương trình" }).click(),
      ])
      expect(response.ok()).toBe(true)
      await expect(dialog).toHaveCount(0)
      await expect(
        page.getByRole("status").filter({ hasText: `Đã tạo chương trình khuyến mãi ${program.code}` }),
      ).toBeVisible()
    })
  }

  await step(`The program is listed: ${program.percent}% off, all branches, all channels, status 'Đang áp dụng'`, async () => {
    const row = rowByCode(page, program.code)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(program.name)
    await expect(row).toContainText(`Giảm ${program.percent}%`)
    await expect(row).toContainText("Đơn tối thiểu: 0 ₫ (Mọi đơn)")
    await expect(row).toContainText("Toàn bộ chi nhánh")
    await expect(row).toContainText("Mọi kênh bán")
    await expect(row).toContainText("Tất cả khách hàng")
    await expect(row).toContainText("Đang áp dụng")
    await expect(row).toContainText("Ngay lập tức")
    await expect(row).toContainText("Không thời hạn")
    await expect(row).not.toContainText("Trần giảm tối đa")
  })

  await step("Reload: the program is still there and still active", async () => {
    await page.reload()
    await settled(page)
    const row = rowByCode(page, program.code)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("Đang áp dụng")
    await expect(row).toContainText(`Giảm ${program.percent}%`)
  })
})

test("F08.2 The owner issues coupon NOEL2026 for the December program", async ({ page, step }) => {
  await page.goto("/promotions?tab=coupons")
  await settled(page)

  await step("The coupon list opens on its own tab", async () => {
    await expect(tabs(page).getByRole("tab", { name: /Kho Mã giảm giá \(Coupon\)/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  // A coupon can be created but never deleted, so a second run must not create it again
  const alreadyIssued = await rowByCode(page, coupon.code).count()

  if (alreadyIssued === 0) {
    const dialog = page.getByRole("dialog", { name: "Phát hành mã Coupon" })

    await step(`Open the coupon form from the ${program.code} row`, async () => {
      await tabs(page).getByRole("tab", { name: /Chương trình khuyến mãi/ }).click()
      await rowByCode(page, program.code).getByRole("button", { name: "Mã", exact: true }).click()
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole("heading", { name: "Phát hành mã giảm giá (Coupon)" })).toBeVisible()
    })

    await step("The parent program is the one the row belongs to", async () => {
      const parent = await dialog
        .getByLabel("Thuộc chương trình khuyến mãi *")
        .evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim())
      expect(parent).toBe(`${program.code} — ${program.name}`)
    })

    await step(`Enter ${coupon.code} with the usage cap of the program`, async () => {
      await dialog.getByLabel("Mã Coupon khách nhập khi thanh toán *").fill(coupon.code)
      await dialog.getByLabel("Tổng số lượt dùng tối đa").fill(String(coupon.maxUses))
      await dialog.getByLabel("Giới hạn lượt / 1 Khách hàng").fill(String(couponUsesPerCustomer))
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/sales/api/v1/coupons") && r.request().method() === "POST"),
        dialog.getByRole("button", { name: "Phát hành mã ngay" }).click(),
      ])
      expect(response.ok()).toBe(true)
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole("status").filter({ hasText: `Đã phát hành mã Coupon ${coupon.code}` })).toBeVisible()
    })
  }

  await step("The coupon list shows it under the December program, ready to use", async () => {
    await tabs(page).getByRole("tab", { name: /Kho Mã giảm giá \(Coupon\)/ }).click()
    const row = rowByCode(page, coupon.code)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(program.name)
    await expect(row).toContainText(`${program.code} · Giảm ${program.percent}%`)
    await expect(row).toContainText(`/ ${coupon.maxUses} lượt`)
    await expect(row).toContainText(`Tối đa ${couponUsesPerCustomer} lượt / khách`)
    await expect(row).toContainText("Sẵn sàng")
  })

  await step("Reload: the coupon is still listed with its usage cap", async () => {
    await page.reload()
    await settled(page)
    await expect(tabs(page).getByRole("tab", { name: /Kho Mã giảm giá \(Coupon\)/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    const row = rowByCode(page, coupon.code)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(`/ ${coupon.maxUses} lượt`)
    await expect(row).toContainText("Sẵn sàng")
  })

  await step("The program row now counts one coupon", async () => {
    await tabs(page).getByRole("tab", { name: /Chương trình khuyến mãi/ }).click()
    await expect(rowByCode(page, program.code)).toContainText("1 mã Coupon")
  })
})

test("F08.3 The status filter shows the program as active and hides it under 'Tạm ngưng'", async ({ page, step }) => {
  await page.goto("/promotions?tab=programs")
  await settled(page)

  const row = rowByCode(page, program.code)
  const stateFilter = page.getByLabel("Lọc trạng thái hiệu lực")

  await step("Without a filter the program is listed as 'Đang áp dụng'", async () => {
    await expect(stateFilter).toHaveValue("ALL")
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("Đang áp dụng")
  })

  await step("Filter 'Đang áp dụng': the program is still listed", async () => {
    await stateFilter.selectOption({ label: "Đang áp dụng" })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText("Đang áp dụng")
  })

  await step("Filter 'Tạm ngưng': the program disappears and the list shows its empty state", async () => {
    await stateFilter.selectOption({ label: "Tạm ngưng" })
    await expect(row).toHaveCount(0)
    await expect(page.getByText("Chưa có chương trình khuyến mãi phù hợp bộ lọc")).toBeVisible()
  })

  await step("Back to 'Mọi trạng thái': the program is listed again", async () => {
    await stateFilter.selectOption({ label: "Mọi trạng thái" })
    await expect(row).toHaveCount(1)
  })
})

test(`Edit a program: rename it and change the discount to ${editedProgramPercent}%`, async ({ page, step }) => {
  test.fixme(
    true,
    "Backend gap: PATCH /sales/api/v1/promotions/{id} is not routed by the gateway (404 'Route not found'), so " +
      "'Lưu thay đổi' only shows the gateway's raw 'Route not found' in the form and nothing is saved. The status " +
      "switch on each row uses the same endpoint, so programs cannot be paused from the list either. Remove this " +
      "line and the backend gap together.",
  )

  await page.goto("/promotions?tab=programs")
  await settled(page)
  const row = rowByCode(page, program.code)
  const dialog = page.getByRole("dialog", { name: "Chỉnh sửa khuyến mãi" })

  await step("Open the program with 'Sửa': its code is shown but cannot be changed", async () => {
    await row.getByRole("button", { name: "Sửa" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: `Chỉnh sửa chiến dịch ${program.code}` })).toBeVisible()
    await expect(dialog.getByLabel("Mã chương trình *")).toHaveValue(program.code)
    await expect(dialog.getByLabel("Mã chương trình *")).toBeDisabled()
  })

  await step("Change the name and the discount, save", async () => {
    await dialog.getByLabel("Tên chiến dịch khuyến mãi *").fill(`${program.name} (đợt 2)`)
    await dialog.getByLabel("Mức giảm (%) *").fill(String(editedProgramPercent))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/promotions/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Lưu thay đổi" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
  })

  await step("Reload: the new name and the new discount are still there", async () => {
    await page.reload()
    await settled(page)
    await expect(row).toContainText(`${program.name} (đợt 2)`)
    await expect(row).toContainText(`Giảm ${editedProgramPercent}%`)
  })
})

test(`Edit a coupon: raise the usage cap of ${coupon.code}`, async ({ page, step }) => {
  test.fixme(
    true,
    "Backend gap: PATCH /sales/api/v1/coupons/{id} is not routed by the gateway (404 'Route not found'), so " +
      "'Cập nhật hạn mức' only shows the gateway's raw 'Route not found' in the form and the cap is not changed. " +
      "The status switch on each coupon row uses the same endpoint. Remove this line and the backend gap together.",
  )

  await page.goto("/promotions?tab=coupons")
  await settled(page)
  const row = rowByCode(page, coupon.code)
  const dialog = page.getByRole("dialog", { name: "Cập nhật hạn mức Coupon" })

  await step("Open the coupon with 'Hạn mức': its program and code cannot be changed", async () => {
    await row.getByRole("button", { name: "Hạn mức" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: `Cập nhật hạn mức mã ${coupon.code}` })).toBeVisible()
    await expect(dialog.getByLabel("Thuộc chương trình khuyến mãi *")).toBeDisabled()
    await expect(dialog.getByLabel("Mã Coupon khách nhập khi thanh toán *")).toBeDisabled()
    await expect(dialog.getByLabel("Tổng số lượt dùng tối đa")).toHaveValue(String(coupon.maxUses))
  })

  await step("Raise the cap, save", async () => {
    await dialog.getByLabel("Tổng số lượt dùng tối đa").fill(String(coupon.maxUses + 50))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/coupons/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Cập nhật hạn mức" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
  })

  await step("Reload: the coupon shows the new cap", async () => {
    await page.reload()
    await settled(page)
    await expect(rowByCode(page, coupon.code)).toContainText(`/ ${coupon.maxUses + 50} lượt`)
  })
})

test("The coupon simulator checks NOEL2026 against a 65.000 VND cart", async ({ page, step }) => {
  test.fixme(
    true,
    "Backend gap: POST /sales/api/v1/coupons/evaluate is not routed by the gateway (404 'Route not found'), so the " +
      "'Kiểm thử áp mã trực tiếp' tab always ends in 'Từ chối áp dụng mã giảm giá / Route not found', even for a " +
      "coupon that is valid, as NOEL2026 is. The discount shown below is what the real endpoint has to return.",
  )

  // The Phin sale of F09.4: 10% off 65.000 = 58.500
  const cart = catalog.products.phin.price
  const afterDiscount = cart - (cart * program.percent) / 100

  await page.goto("/promotions?tab=simulator")
  await settled(page)

  await step("The simulator form is shown with the coupon and the cart", async () => {
    await expect(page.getByRole("heading", { name: "Bộ mô phỏng kiểm thử điều kiện Coupon" })).toBeVisible()
    await page.getByLabel("Mã Coupon cần kiểm tra *").fill(coupon.code)
    await page.getByLabel("Giá trị giỏ hàng (VND) *").fill(String(cart))
    await page.getByLabel("Kênh phát sinh đơn").selectOption({ label: "POS Tại quầy" })
  })

  await step("Check the code: the order is discounted by 10%", async () => {
    await page.getByRole("button", { name: "Kiểm tra áp dụng mã" }).click()
    await expect(page.getByText("Mã hợp lệ — Đủ điều kiện ưu đãi")).toBeVisible()
    await expect(page.getByText("Khách cần thanh toán").locator("..")).toContainText(
      afterDiscount.toLocaleString("vi-VN"),
    )
  })
})
