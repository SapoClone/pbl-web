import type { Page } from "@playwright/test"
import { gw } from "../support/api"
import { asOwner, expect, settled, test } from "../support/fixtures"
import { branches, catalog, promotions, vnd } from "../support/data"

/**
 * Flows F08.1 - F08.3 of flows/FLOWS.md: the promotions page (UI-INVENTORY section 10) - the December discount
 * program, the coupon issued under it, and the program filters.
 *
 * Needs: 01 (the owner session). Leaves: the program "KM-THANG-12" - 10% off, every branch, every channel, no
 * minimum order and no end date, so it stays "Đang áp dụng" for the coupon sales of 09 - and the coupon "NOEL2026"
 * (100 uses in total, 1 per customer) under it.
 *
 * The edit and simulator flows are real now: the gateway routes PATCH /sales/api/v1/promotions/{id},
 * PATCH /sales/api/v1/coupons/{id} and POST /sales/api/v1/coupons/evaluate. Both edits are always undone at the end
 * of their flow: the POS spec (09) needs KM-THANG-12 back at 10% (a 65.000 VND phin -> 58.500) and NOEL2026 back at
 * its 100-use cap.
 *
 * Re-runnable: a program and a coupon can be created but there is no DELETE route, so each flow first looks for its
 * code in the list and, on a second run against the same store, keeps and asserts the row an earlier run created
 * instead of creating it (and failing on the duplicate code) again. The edit forms always overwrite with the same
 * edited and restored values, so a run interrupted in between is repaired by the next one.
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

/** The suffix the program-edit flow adds to the campaign name, then removes so 09 still prices the 10% sale. */
const programNameSuffix = " (đã sửa)"

/** The values the two edit flows save (the coupon's cap is raised by 50 uses). */
const editedProgramPercent = 15
const editedCouponMaxUses = coupon.maxUses + 50

/** The only invalid code in the flows text; data.ts only has the valid coupon. */
const INVALID_COUPON = "SAIMA"

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

test(`Edit ${program.code}: rename it and change the discount to ${editedProgramPercent}%, then restore`, async ({
  page,
  step,
}) => {
  await page.goto("/promotions?tab=programs")
  await settled(page)
  const row = rowByCode(page, program.code)
  const dialog = page.getByRole("dialog", { name: "Chỉnh sửa khuyến mãi" })
  const name = dialog.getByLabel("Tên chiến dịch khuyến mãi *")
  const percent = dialog.getByLabel("Mức giảm (%) *")

  await step("Open the program with 'Sửa': its code is shown but cannot be changed", async () => {
    await row.getByRole("button", { name: "Sửa" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: `Chỉnh sửa chiến dịch ${program.code}` })).toBeVisible()
    await expect(dialog.getByLabel("Mã chương trình *")).toHaveValue(program.code)
    await expect(dialog.getByLabel("Mã chương trình *")).toBeDisabled()
  })

  await step("A 150% discount is refused by the form and nothing changes", async () => {
    await percent.fill("150")
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click()
    // As in F08.1, the number input has max=100: the browser's own validation message is what the cashier sees,
    // and it stops the submit before the app's "Phần trăm chiết khấu không được vượt quá 100%" alert can run.
    await expect.poll(() => percent.evaluate((el) => (el as HTMLInputElement).validity.rangeOverflow)).toBe(true)
    await expect.poll(() => percent.evaluate((el) => (el as HTMLInputElement).validationMessage)).toContain("100")
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: /Đã cập nhật chương trình/ })).toHaveCount(0)
    await expect(row).toContainText(program.name)
    await expect(row).toContainText(`Giảm ${program.percent}%`)
  })

  await step(`Save the new name and the ${editedProgramPercent}% discount`, async () => {
    await name.fill(`${program.name}${programNameSuffix}`)
    await percent.fill(String(editedProgramPercent))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/promotions/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Lưu thay đổi" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("status").filter({ hasText: `Đã cập nhật chương trình ${program.code}` })).toBeVisible()
  })

  await step("The row shows the new name and the new discount", async () => {
    await expect(row).toContainText(`${program.name}${programNameSuffix}`)
    await expect(row).toContainText(`Giảm ${editedProgramPercent}%`)
  })

  await step("Reload: the edit is still there", async () => {
    await page.reload()
    await settled(page)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(`${program.name}${programNameSuffix}`)
    await expect(row).toContainText(`Giảm ${editedProgramPercent}%`)
  })

  await step(`Restore the original name and ${program.percent}% for the POS coupon sale of 09`, async () => {
    await row.getByRole("button", { name: "Sửa" }).click()
    await expect(dialog).toBeVisible()
    await name.fill(program.name)
    await percent.fill(String(program.percent))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/promotions/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Lưu thay đổi" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
    await page.reload()
    await settled(page)
    await expect(row).toContainText(program.name)
    await expect(row).not.toContainText(programNameSuffix)
    await expect(row).toContainText(`Giảm ${program.percent}%`)
  })
})

test(`Edit a coupon: raise the usage cap of ${coupon.code} to ${editedCouponMaxUses}, then restore`, async ({
  page,
  step,
}) => {
  await page.goto("/promotions?tab=coupons")
  await settled(page)
  const row = rowByCode(page, coupon.code)
  const dialog = page.getByRole("dialog", { name: "Cập nhật hạn mức Coupon" })
  const cap = dialog.getByLabel("Tổng số lượt dùng tối đa")

  await step("Open the coupon with 'Hạn mức': its program and code cannot be changed", async () => {
    await row.getByRole("button", { name: "Hạn mức" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: `Cập nhật hạn mức mã ${coupon.code}` })).toBeVisible()
    await expect(dialog.getByLabel("Thuộc chương trình khuyến mãi *")).toBeDisabled()
    await expect(dialog.getByLabel("Mã Coupon khách nhập khi thanh toán *")).toBeDisabled()
    await expect(cap).toHaveValue(String(coupon.maxUses))
  })

  await step(`Raise the cap from ${coupon.maxUses} to ${editedCouponMaxUses}, save`, async () => {
    await cap.fill(String(editedCouponMaxUses))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/coupons/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Cập nhật hạn mức" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("status").filter({ hasText: `Đã cập nhật hạn mức mã ${coupon.code}` })).toBeVisible()
    await expect(row).toContainText(`/ ${editedCouponMaxUses} lượt`)
  })

  await step("Reload: the coupon still shows the new cap", async () => {
    await page.reload()
    await settled(page)
    await expect(rowByCode(page, coupon.code)).toContainText(`/ ${editedCouponMaxUses} lượt`)
    await expect(rowByCode(page, coupon.code)).toContainText("Sẵn sàng")
  })

  // The form (and the API) only accept a positive cap, so a below-used cap needs at least two recorded uses.
  const coupons = await gw<{ code: string; usedCount: number }[]>("/sales/api/v1/coupons")
  const usedCount = coupons.find((c) => c.code === coupon.code)?.usedCount ?? 0
  if (usedCount >= 2) {
    const tooLow = usedCount - 1
    await step(`Lowering the cap to ${tooLow} (below ${usedCount} uses) is refused by the server`, async () => {
      await row.getByRole("button", { name: "Hạn mức" }).click()
      await expect(dialog).toBeVisible()
      await cap.fill(String(tooLow))
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/sales/api/v1/coupons/") && r.request().method() === "PATCH"),
        dialog.getByRole("button", { name: "Cập nhật hạn mức" }).click(),
      ])
      expect(response.status()).toBe(409)
      expect(((await response.json()) as { errorCode: string }).errorCode).toBe("COUPON_MAX_USES_BELOW_USED")
      // The page shows the server's real message ("Coupon NOEL2026 was already used N times: ...").
      await expect(dialog.getByRole("alert")).toContainText(coupon.code)
      await expect(dialog.getByRole("alert")).toContainText("the usage limit cannot be lower")
      await expect(dialog).toBeVisible()
      await dialog.getByRole("button", { name: "Đóng" }).click()
      await expect(dialog).toHaveCount(0)
      await expect(row).toContainText(`/ ${editedCouponMaxUses} lượt`)
    })
  } else {
    // usedCount is 0 or 1: maxUses = usedCount-1 would be 0, which the form itself refuses as "phải là số nguyên
    // dương" before any PATCH reaches the backend. The POS coupon sales of 09 raise usedCount, so a later run of
    // this spec exercises the 409 COUPON_MAX_USES_BELOW_USED refusal above.
  }

  await step(`Restore the cap to ${coupon.maxUses} for the POS coupon sale of 09`, async () => {
    await row.getByRole("button", { name: "Hạn mức" }).click()
    await expect(dialog).toBeVisible()
    await cap.fill(String(coupon.maxUses))
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/sales/api/v1/coupons/") && r.request().method() === "PATCH"),
      dialog.getByRole("button", { name: "Cập nhật hạn mức" }).click(),
    ])
    expect(response.ok()).toBe(true)
    await expect(dialog).toHaveCount(0)
    await page.reload()
    await settled(page)
    await expect(rowByCode(page, coupon.code)).toContainText(`/ ${coupon.maxUses} lượt`)
  })
})

test(`The simulator checks ${coupon.code} against a ${vnd(catalog.products.phin.price)} VND cart`, async ({
  page,
  step,
}) => {
  // The Phin sale of F09.4: 10% off 65.000 = 6.500, to pay 58.500
  const cart = catalog.products.phin.price
  const discount = Math.round((cart * program.percent) / 100)
  const afterDiscount = cart - discount

  await page.goto("/promotions?tab=simulator")
  await settled(page)
  const result = page.getByText("Hóa đơn mô phỏng thanh toán").locator("..")

  await step("The simulator form is shown with the coupon, the cart and the main branch", async () => {
    await expect(page.getByRole("heading", { name: "Bộ mô phỏng kiểm thử điều kiện Coupon" })).toBeVisible()
    await page.getByLabel("Mã Coupon cần kiểm tra *").fill(coupon.code)
    await page.getByLabel("Giá trị giỏ hàng (VND) *").fill(String(cart))
    await page.getByLabel("Chi nhánh bán hàng *").selectOption({ label: branches.main.name })
    await page.getByLabel("Kênh phát sinh đơn").selectOption({ label: "POS Tại quầy" })
  })

  await step(`Check the code: the cart is discounted by ${vnd(discount)}`, async () => {
    await page.getByRole("button", { name: "Kiểm tra áp dụng mã" }).click()
    await expect(result).toContainText("Mã hợp lệ — Đủ điều kiện ưu đãi")
    await expect(result).toContainText(coupon.code)
    await expect(result).toContainText(program.name)
    await expect(result).toContainText("Tạm tính giỏ hàng")
    await expect(result).toContainText(`${vnd(cart)} ₫`)
    await expect(result).toContainText(`-${vnd(discount)} ₫`)
    await expect(result).toContainText("Khách cần thanh toán")
    await expect(result).toContainText(`${vnd(afterDiscount)} ₫`)
  })

  await step(`The unknown code ${INVALID_COUPON} is rejected with the server's reason`, async () => {
    await page.getByLabel("Mã Coupon cần kiểm tra *").fill(INVALID_COUPON)
    await page.getByRole("button", { name: "Kiểm tra áp dụng mã" }).click()
    const rejection = page.getByRole("alert").filter({ hasText: "Từ chối áp dụng mã giảm giá" })
    await expect(rejection).toBeVisible()
    await expect(rejection).toContainText(`Coupon ${INVALID_COUPON} is invalid or inactive`)
    await expect(result).not.toContainText("Mã hợp lệ — Đủ điều kiện ưu đãi")
  })
})
