import type { Page } from "@playwright/test"
import { catalog, vnd } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F03.1 - F03.8 of flows/FLOWS.md: the catalogue of "Cửa hàng Cà Phê Hạt Mộc" - a category, a brand, the three
 * products with one variant each (SKU and price from support/data.ts) and the wholesale price list. Stock (04), POS (09),
 * Orders (10) and Reports (12) need these three products to exist and to be "Đang bán": this spec never deletes one of
 * them, only the throwaway product of F03.6. Combos are skipped - see F03.8.
 *
 * Re-runnable on the same store (the store is shared with the other specs and with an earlier run of this file): the
 * category, the brand, the three products, their variants and the price list are created only when they are not there
 * yet, and every edit sets the same value again. Nothing is deleted except "Sản phẩm thử xóa".
 */
asOwner()
test.describe.configure({ mode: "serial" })

/** F03.1 renames the category to prove the rename, then puts the data.ts name back: 04+ and the "Leaves" need it. */
const CATEGORY_RENAMED = "Cà phê rang xay (đã đổi tên)"

/** The brand is created with a description so both fields of the brand tab are filled. */
const BRAND_DESCRIPTION = "Xưởng rang nhỏ ở Cầu Đất, Đà Lạt; cung cấp hạt cho quán từ 2021."

/** F03.5 sets this description on the Arabica product and proves it after a reload. */
const ARABICA_NEW_DESCRIPTION = "Hạt Arabica Cầu Đất rang vừa 14 phút, hương trái cây nhiệt đới, hậu vị ngọt kéo dài."

/** F03.6: a product that exists only to be deleted again. */
const THROWAWAY_PRODUCT = "Sản phẩm thử xóa"

/** F03.4: a search that matches nothing in the catalogue. */
const NO_MATCH_SEARCH = "Máy xay cà phê cầm tay"

/** F03.7: the wholesale price of the Arabica bag (retail price is catalog.products.arabica.price = 135.000). */
const WHOLESALE_PRICE = 120000

const products = [catalog.products.arabica, catalog.products.robusta, catalog.products.phin]

const productRow = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name })

const catalogDialog = (page: Page) => page.getByRole("dialog", { name: "Quản lý danh mục & thương hiệu" })

const priceListRow = (page: Page) => page.getByRole("row").filter({ hasText: catalog.priceList.name })

/**
 * The SKU matrix drawer fills its inputs from GET /price-lists/{id}, and that first render resets the inputs: wait for
 * the response (and for the page to go quiet) before typing a price, otherwise the value typed could be overwritten.
 */
const priceListDetailLoaded = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/catalog\/api\/v1\/price-lists\/[^/]+$/.test(new URL(response.url()).pathname),
  )

/**
 * Creates one product through "Thêm mới", unless a previous run of this spec already created it.
 * UX/app finding: after saving, ProductsPage.handleCreated calls queryClient.fetchQuery with the SAME key it has
 * already cached, so the table keeps showing the old list - a new product is invisible until a full page reload.
 * The reload below is therefore both the workaround and the persistence proof the flow asks for.
 */
async function createProductIfMissing(page: Page, product: { name: string; description: string }) {
  if ((await productRow(page, product.name).count()) > 0) return
  await page.getByRole("button", { name: "Thêm mới" }).click()
  const dialog = page.getByRole("dialog", { name: "Thêm sản phẩm" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Tên sản phẩm").fill(product.name)
  await expect(dialog.getByLabel("Danh mục")).toContainText(catalog.category)
  await dialog.getByLabel("Danh mục").selectOption({ label: catalog.category })
  await dialog.getByLabel("Thương hiệu").selectOption({ label: catalog.brand })
  await dialog.getByLabel("Trạng thái").selectOption({ label: "Đang bán" })
  await dialog.getByLabel("Mô tả").fill(product.description)
  await dialog.getByRole("button", { name: "Lưu sản phẩm" }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await settled(page)
}

/**
 * Opens "Xem biến thể" for a product and adds its one variant when the list is still empty (a second run finds the
 * variant of the first one). Returns the variant-list dialog, still open.
 */
async function ensureVariant(page: Page, product: { name: string; sku: string; price: number }) {
  await page.getByRole("button", { name: `Xem biến thể của ${product.name}` }).click()
  const list = page.getByRole("dialog", { name: `Biến thể của ${product.name}` })
  await expect(list).toBeVisible()
  const empty = list.getByText("Sản phẩm chưa có biến thể.")
  const variantLine = list.getByText(`SKU: ${product.sku} · ${vnd(product.price)} ₫`)
  await expect(empty.or(variantLine)).toBeVisible()
  if (await empty.isVisible()) {
    await list.getByRole("button", { name: "Thêm biến thể" }).click()
    const form = page.getByRole("dialog", { name: "Thêm biến thể" })
    await expect(form).toBeVisible()
    await form.getByLabel("SKU").fill(product.sku)
    await form.getByLabel("Giá bán (VND)").fill(String(product.price))
    await form.getByRole("button", { name: "Tạo biến thể" }).click()
    await expect(form).toBeHidden()
  }
  await expect(variantLine).toBeVisible()
  return list
}

test("F03.1 A category and a brand are created, the category is renamed, an empty name is refused", async ({ page, step }) => {
  await step("Open 'Quản lý danh mục & thương hiệu' from the catalogue", async () => {
    await page.goto("/products")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Sản phẩm", level: 1 })).toBeVisible()
    await page.getByRole("button", { name: "Quản lý danh mục & thương hiệu" }).click()
    await expect(catalogDialog(page)).toBeVisible()
  })

  await step("Submitting the category form with no name shows the validation message", async () => {
    await catalogDialog(page).getByRole("button", { name: "Thêm danh mục" }).click()
    await expect(catalogDialog(page).getByRole("alert")).toHaveText("Vui lòng nhập tên danh mục.")
  })

  await step("Create the category 'Cà phê rang xay' and the brand 'Hạt Mộc'", async () => {
    const dialog = catalogDialog(page)
    // a previous run of this file already created them, and the backend refuses a second category with that name
    if ((await dialog.getByText(catalog.category).count()) === 0) {
      await dialog.getByLabel("Tên danh mục").fill(catalog.category)
      await dialog.getByRole("button", { name: "Thêm danh mục" }).click()
    }
    await expect(dialog.getByText(catalog.category)).toBeVisible()

    await dialog.getByRole("button", { name: /^Thương hiệu \(/ }).click()
    if ((await dialog.getByText(catalog.brand).count()) === 0) {
      await dialog.getByLabel("Tên thương hiệu").fill(catalog.brand)
      await dialog.getByLabel("Mô tả thương hiệu").fill(BRAND_DESCRIPTION)
      await dialog.getByRole("button", { name: "Thêm thương hiệu" }).click()
    }
    await expect(dialog.getByText(catalog.brand)).toBeVisible()
    await expect(dialog.getByText(BRAND_DESCRIPTION)).toBeVisible()
  })

  await step("After a reload both are still listed", async () => {
    await page.reload()
    await settled(page)
    await page.getByRole("button", { name: "Quản lý danh mục & thương hiệu" }).click()
    const dialog = catalogDialog(page)
    await expect(dialog.getByText(catalog.category)).toBeVisible()
    await dialog.getByRole("button", { name: /^Thương hiệu \(/ }).click()
    await expect(dialog.getByText(catalog.brand)).toBeVisible()
  })

  await step("Renaming the category to 'Cà phê rang xay (đã đổi tên)' works", async () => {
    const dialog = catalogDialog(page)
    await dialog.getByRole("button", { name: /^Danh mục \(/ }).click()
    await dialog.getByRole("button", { name: `Sửa ${catalog.category}` }).click()
    const edit = page.getByRole("dialog", { name: "Sửa danh mục" })
    await expect(edit).toBeVisible()
    await edit.getByLabel("Tên danh mục").fill(CATEGORY_RENAMED)
    await edit.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(edit).toBeHidden()
    await expect(dialog.getByText(CATEGORY_RENAMED)).toBeVisible()
  })

  await step("After a reload the new name is still there", async () => {
    await page.reload()
    await settled(page)
    await page.getByRole("button", { name: "Quản lý danh mục & thương hiệu" }).click()
    await expect(catalogDialog(page).getByText(CATEGORY_RENAMED)).toBeVisible()
  })

  await step("Rename it back to 'Cà phê rang xay': 04+ use the name from data.ts", async () => {
    const dialog = catalogDialog(page)
    await dialog.getByRole("button", { name: `Sửa ${CATEGORY_RENAMED}` }).click()
    const edit = page.getByRole("dialog", { name: "Sửa danh mục" })
    await edit.getByLabel("Tên danh mục").fill(catalog.category)
    await edit.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(edit).toBeHidden()
    await expect(dialog.getByText(CATEGORY_RENAMED)).toHaveCount(0)
    await expect(dialog.getByText(catalog.category)).toBeVisible()
  })

  await step("After a reload the category has its data.ts name again", async () => {
    await page.reload()
    await settled(page)
    await page.getByRole("button", { name: "Quản lý danh mục & thương hiệu" }).click()
    await expect(catalogDialog(page).getByText(catalog.category)).toBeVisible()
    await expect(catalogDialog(page).getByText(CATEGORY_RENAMED)).toHaveCount(0)
  })
})

test("F03.2 The three products are created and listed, an empty product name is refused", async ({ page, step }) => {
  await step("Open the product form with 'Thêm mới'", async () => {
    await page.goto("/products")
    await settled(page)
    await page.getByRole("button", { name: "Thêm mới" }).click()
    await expect(page.getByRole("dialog", { name: "Thêm sản phẩm" })).toBeVisible()
  })

  await step("Saving with an empty name shows 'Vui lòng nhập tên sản phẩm.'", async () => {
    const dialog = page.getByRole("dialog", { name: "Thêm sản phẩm" })
    await dialog.getByRole("button", { name: "Lưu sản phẩm" }).click()
    await expect(dialog.getByRole("alert")).toHaveText("Vui lòng nhập tên sản phẩm.")
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })

  await step("The category and the brand of F03.1 are offered in the form", async () => {
    await page.getByRole("button", { name: "Thêm mới" }).click()
    const dialog = page.getByRole("dialog", { name: "Thêm sản phẩm" })
    await expect(dialog.getByLabel("Danh mục")).toContainText(catalog.category)
    await expect(dialog.getByLabel("Thương hiệu")).toContainText(catalog.brand)
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })

  for (const product of products) {
    await step(`Create '${product.name}' as 'Đang bán'`, async () => {
      await createProductIfMissing(page, product)
      const row = productRow(page, product.name)
      await expect(row).toContainText(catalog.category)
      await expect(row).toContainText(catalog.brand)
      await expect(row).toContainText("Đang bán")
      await expect(row).toContainText(product.description)
    })
  }

  await step("After a reload the three products are still listed as 'Đang bán'", async () => {
    await page.reload()
    await settled(page)
    for (const product of products) {
      const row = productRow(page, product.name)
      await expect(row).toBeVisible()
      await expect(row).toContainText(catalog.category)
      await expect(row).toContainText(catalog.brand)
      await expect(row).toContainText("Đang bán")
    }
  })
})

test("F03.3 Each product gets a variant with its SKU and price; a duplicate SKU is refused", async ({ page, step }) => {
  await page.goto("/products")
  await settled(page)

  for (const product of products) {
    await step(`Add the variant ${product.sku} to '${product.name}' from 'Xem biến thể'`, async () => {
      const list = await ensureVariant(page, product)
      // the list footer says "Đóng" and so does the close button of the header: click the footer one
      await list.getByRole("button", { name: "Đóng" }).last().click()
      await expect(list).toBeHidden()
    })
  }

  await step("A duplicate SKU is refused by the server", async () => {
    const robusta = catalog.products.robusta
    await page.getByRole("button", { name: `Xem biến thể của ${robusta.name}` }).click()
    const list = page.getByRole("dialog", { name: `Biến thể của ${robusta.name}` })
    await expect(list.getByText(`SKU: ${robusta.sku}`)).toBeVisible()
    await list.getByRole("button", { name: "Thêm biến thể" }).click()
    const form = page.getByRole("dialog", { name: "Thêm biến thể" })
    await form.getByLabel("SKU").fill(catalog.products.arabica.sku)
    await form.getByLabel("Giá bán (VND)").fill(String(catalog.products.arabica.price))
    await form.getByRole("button", { name: "Tạo biến thể" }).click()
    await expect(form.getByRole("alert")).toHaveText(/SKU code already exists|SKU đã tồn tại/i)
    await form.getByRole("button", { name: "Hủy" }).click()
    await expect(list.getByText("1 biến thể")).toBeVisible()
    await list.getByRole("button", { name: "Đóng" }).last().click()
  })

  await step("After a reload each product row shows its SKU and its price in VND", async () => {
    await page.reload()
    await settled(page)
    for (const product of products) {
      const row = productRow(page, product.name)
      await expect(row).toContainText(product.sku)
      await expect(row).toContainText(`${vnd(product.price)} ₫`)
    }
  })
})

test("F03.4 Search by SKU, the status filter and the empty state", async ({ page, step }) => {
  await page.goto("/products")
  await settled(page)
  const search = page.getByPlaceholder("Tìm tên sản phẩm, mã SKU...")
  await expect(productRow(page, catalog.products.arabica.name)).toBeVisible()

  await step("Searching 'CF-ARA-250' finds exactly the Arabica product", async () => {
    await search.fill(catalog.products.arabica.sku)
    // one header row plus exactly one product row
    await expect(page.getByRole("row")).toHaveCount(2)
    await expect(page.getByRole("row").nth(1)).toContainText(catalog.products.arabica.name)
  })

  await step("The status filter 'Lưu nháp' shows none of the three products", async () => {
    await search.fill("")
    await page.getByLabel("Lọc theo trạng thái sản phẩm").selectOption({ label: "Lưu nháp" })
    await expect(page.getByRole("heading", { name: "Không tìm thấy sản phẩm" })).toBeVisible()
    for (const product of products) await expect(productRow(page, product.name)).toHaveCount(0)
  })

  await step("A search with no match shows 'Không tìm thấy sản phẩm'", async () => {
    await page.getByLabel("Lọc theo trạng thái sản phẩm").selectOption({ label: "Tất cả" })
    await search.fill(NO_MATCH_SEARCH)
    await expect(page.getByRole("heading", { name: "Không tìm thấy sản phẩm" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Xóa tất cả bộ lọc" })).toBeVisible()
    for (const product of products) await expect(productRow(page, product.name)).toHaveCount(0)
  })
})

test("F03.5 Editing the Arabica description persists", async ({ page, step }) => {
  await page.goto("/products")
  await settled(page)
  const arabica = catalog.products.arabica

  await step(`Open 'Chỉnh sửa ${arabica.name}'`, async () => {
    await productRow(page, arabica.name).getByRole("button", { name: `Chỉnh sửa ${arabica.name}` }).click()
    await expect(page.getByRole("dialog", { name: "Sửa sản phẩm" })).toBeVisible()
  })

  await step("Replace the description and save", async () => {
    const dialog = page.getByRole("dialog", { name: "Sửa sản phẩm" })
    await dialog.getByLabel("Mô tả").fill(ARABICA_NEW_DESCRIPTION)
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(dialog).toBeHidden()
  })

  await step("After a reload the new description is still there", async () => {
    await page.reload()
    await settled(page)
    await expect(productRow(page, arabica.name)).toContainText(ARABICA_NEW_DESCRIPTION)
  })

  await step("Put the data.ts description back so this file can run again", async () => {
    await productRow(page, arabica.name).getByRole("button", { name: `Chỉnh sửa ${arabica.name}` }).click()
    const dialog = page.getByRole("dialog", { name: "Sửa sản phẩm" })
    await dialog.getByLabel("Mô tả").fill(arabica.description)
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await settled(page)
    await expect(productRow(page, arabica.name)).toContainText(arabica.description)
  })
})

test("F03.6 A throwaway product is created, deleted and stays gone", async ({ page, step }) => {
  await page.goto("/products")
  await settled(page)

  await step(`Create '${THROWAWAY_PRODUCT}'`, async () => {
    if ((await productRow(page, THROWAWAY_PRODUCT).count()) === 0) {
      await page.getByRole("button", { name: "Thêm mới" }).click()
      const dialog = page.getByRole("dialog", { name: "Thêm sản phẩm" })
      await dialog.getByLabel("Tên sản phẩm").fill(THROWAWAY_PRODUCT)
      await dialog.getByRole("button", { name: "Lưu sản phẩm" }).click()
      await expect(dialog).toBeHidden()
      // Same stale cached bundle as in F03.2: only a full reload shows the new row.
      await page.reload()
      await settled(page)
    }
    await expect(productRow(page, THROWAWAY_PRODUCT)).toBeVisible()
  })

  await step("Delete it: the confirmation names it and the row disappears", async () => {
    let confirmation = ""
    page.once("dialog", (dialog) => {
      confirmation = dialog.message()
      void dialog.accept()
    })
    await productRow(page, THROWAWAY_PRODUCT).getByRole("button", { name: `Xóa ${THROWAWAY_PRODUCT}` }).click()
    await expect(productRow(page, THROWAWAY_PRODUCT)).toHaveCount(0)
    expect(confirmation).toBe(`Xóa sản phẩm ${THROWAWAY_PRODUCT}? Các biến thể liên quan cũng sẽ được lưu trữ.`)
  })

  await step("After a reload it is gone and the three products are still there", async () => {
    await page.reload()
    await settled(page)
    await expect(productRow(page, THROWAWAY_PRODUCT)).toHaveCount(0)
    for (const product of products) await expect(productRow(page, product.name)).toBeVisible()
  })
})

test("F03.7 The wholesale price list stores a price per SKU for Arabica", async ({ page, step }) => {
  const arabica = catalog.products.arabica

  await step("Open the price-list tab", async () => {
    await page.goto("/products?tab=price-lists")
    await settled(page)
    await expect(page.getByRole("tab", { name: "Bảng giá theo Kênh bán" })).toHaveAttribute("aria-selected", "true")
    // the list arrives with a GET: wait for the empty state or for any data row (other lists may exist) before
    // deciding whether to create ours
    await expect(page.getByText("Chưa có bảng giá nào phù hợp").or(page.getByRole("row").nth(1)).first()).toBeVisible()
  })

  await step(`Create '${catalog.priceList.name}' unless a previous run left it`, async () => {
    if ((await priceListRow(page).count()) > 0) return
    await page.getByRole("button", { name: "Tạo bảng giá mới" }).click()
    const dialog = page.getByRole("dialog", { name: "Tạo bảng giá mới" })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel("Tên bảng giá *").fill(catalog.priceList.name)
    await dialog.getByRole("button", { name: "Tạo bảng giá", exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("status").filter({ hasText: `Đã tạo bảng giá "${catalog.priceList.name}"` })).toBeVisible()
    await expect(priceListRow(page)).toHaveCount(1)
  })

  await step("The 'Bảng giá Đa kênh' KPI card is on the page", async () => {
    // UX finding: this KPI is a fixed text ("POS · Sàn · Web"), it does not count the price lists as the flow text says
    await expect(page.getByRole("button", { name: /Bảng giá Đa kênh/ })).toContainText("POS · Sàn · Web")
  })

  await step("Open the SKU matrix and give Arabica the wholesale price", async () => {
    const detail = priceListDetailLoaded(page)
    await priceListRow(page).getByRole("button", { name: "Bảng giá SKU" }).click()
    const drawer = page.getByRole("dialog", { name: catalog.priceList.name })
    await expect(drawer).toBeVisible()
    await detail
    await settled(page)
    await drawer.getByPlaceholder("Tìm biến thể hoặc mã SKU...").fill(arabica.sku)
    const row = drawer.getByRole("row").filter({ hasText: arabica.sku })
    await expect(row).toHaveCount(1)
    await row.getByRole("spinbutton").fill(String(WHOLESALE_PRICE))
    // the difference against the base price, computed from data.ts: 120.000 - 135.000 = -15.000
    await expect(row).toContainText(`${vnd(WHOLESALE_PRICE - arabica.price)} ₫`)
    await drawer.getByRole("button", { name: "Lưu 1 mức giá SKU" }).click()
    await expect(drawer).toBeHidden()
    await expect(
      page.getByRole("status").filter({ hasText: `Đã cập nhật giá SKU cho "${catalog.priceList.name}"` }),
    ).toBeVisible()
  })

  await step("After a reload the list is still there and reopening its matrix shows the saved price", async () => {
    await page.reload()
    await settled(page)
    await expect(page.getByRole("tab", { name: "Bảng giá theo Kênh bán" })).toHaveAttribute("aria-selected", "true")
    await expect(priceListRow(page)).toHaveCount(1)
    const detail = priceListDetailLoaded(page)
    await priceListRow(page).getByRole("button", { name: "Bảng giá SKU" }).click()
    const drawer = page.getByRole("dialog", { name: catalog.priceList.name })
    await expect(drawer).toBeVisible()
    await detail
    await drawer.getByPlaceholder("Tìm biến thể hoặc mã SKU...").fill(arabica.sku)
    await expect(
      drawer.getByRole("row").filter({ hasText: arabica.sku }).getByRole("spinbutton"),
    ).toHaveValue(String(WHOLESALE_PRICE))
    await drawer.getByRole("button", { name: "Đóng bảng" }).click()
    await expect(drawer).toBeHidden()
  })
})

test("F03.8 Combo: build a combo from two variants of the catalogue", async ({ page, step }) => {
  test.fixme(
    true,
    "Backend gap: the gateway has no route for GET/PUT /catalog/api/v1/products/{id}/combo-items (the request is " +
      "closed with no HTTP response, see also the known gaps in flows/FLOWS.md), so the Combo builder cannot load or " +
      "save its components and the combos tab stays out of scope for now.",
  )
  await step("Open the combos tab", async () => {
    await page.goto("/products?tab=combos")
    await expect(page.getByRole("button", { name: "Tạo gói Combo mới" })).toBeVisible()
  })
  await step("Create a combo of one Arabica bag and one phin at 180.000", async () => {
    await page.getByRole("button", { name: "Tạo gói Combo mới" }).click()
    const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
    await dialog.getByPlaceholder("VD: Combo Quà Tặng Xanh Eco").fill("Combo Cà phê & Phin")
    await dialog.getByPlaceholder("Gõ tên sản phẩm hoặc mã SKU để thêm vào gói...").fill("CF-ARA-250")
    await dialog.getByPlaceholder("Gõ tên sản phẩm hoặc mã SKU để thêm vào gói...").press("Enter")
    await dialog.getByPlaceholder("Gõ tên sản phẩm hoặc mã SKU để thêm vào gói...").fill("PHIN-NHOM-02")
    await dialog.getByPlaceholder("Gõ tên sản phẩm hoặc mã SKU để thêm vào gói...").press("Enter")
    await dialog.getByRole("button", { name: "Tạo gói Combo" }).click()
    await expect(page.getByRole("row").filter({ hasText: "Combo Cà phê & Phin" })).toBeVisible()
  })
})
