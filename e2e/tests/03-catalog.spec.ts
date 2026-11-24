import type { Locator, Page } from "@playwright/test"
import { gw } from "../support/api"
import { catalog, vnd } from "../support/data"
import { asOwner, expect, settled, test } from "../support/fixtures"

/**
 * Flows F03.1 - F03.8 of flows/FLOWS.md: the catalogue of "Cửa hàng Cà Phê Hạt Mộc" - a category, a brand, the three
 * products with one variant each (SKU and price from support/data.ts), the wholesale price list and a real product
 * Combo (F03.8). Stock (04), POS (09), Orders (10) and Reports (12) need these three products to exist and to be
 * "Đang bán": this spec never deletes one of them, only the throwaway product of F03.6.
 *
 * Re-runnable on the same store (the store is shared with the other specs and with an earlier run of this file): the
 * category, the brand, the three products, their variants, the price list and the Combo are created only when they are
 * not there yet, and every edit sets the same value again. Nothing is deleted except "Sản phẩm thử xóa"; the page does
 * not offer a Combo delete, so F03.8 never deletes its Combo either.
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

/** F03.8: local to this spec; the components and their prices stay in data.ts. */
const COMBO_NAME = "Combo Quà Cà Phê Hạt Mộc"
const COMBO_PRICE = 190000
const COMBO_COMPONENTS = [catalog.products.arabica, catalog.products.phin]
const COMBO_SUM_RETAIL = COMBO_COMPONENTS.reduce((total, component) => total + component.price, 0)
const COMBO_SAVINGS = COMBO_SUM_RETAIL - COMBO_PRICE
const COMBO_SAVINGS_PCT = Math.round((COMBO_SAVINGS / COMBO_SUM_RETAIL) * 100)
/** Verbatim template of the live calculator in ProductCombosPanel.tsx (the card uses a shorter one). */
const BUILDER_SAVINGS = `Khách mua Combo tiết kiệm ngay ${vnd(COMBO_SAVINGS)} ₫ (-${COMBO_SAVINGS_PCT}%)`
const CARD_SAVINGS = `Khách tiết kiệm ${vnd(COMBO_SAVINGS)} ₫ (-${COMBO_SAVINGS_PCT}%)`

const products = [catalog.products.arabica, catalog.products.robusta, catalog.products.phin]

/**
 * Since the product/variant consolidation every product has TWO table rows: the product row and the inline row with
 * its variants panel. Scope to the row that carries the edit button so a name never matches both.
 */
const productRow = (page: Page, name: string) =>
  page.getByRole("row").filter({ has: page.getByRole("button", { name: `Chỉnh sửa ${name}` }) })

/** The inline variants row of a product is the one whose heading reads "Biến thể của <name>". */
const variantsPanel = (page: Page, name: string) =>
  page.getByRole("row").filter({ hasText: `Biến thể của ${name}` })

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

type ComboProductRow = { id: string; name: string; isCombo?: boolean }
type ComboItemRow = { skuCode: string; quantity: number; lineTotal: number }

/** The Combo cards are <article>s; filter by the visible name so a name never matches a sibling section. */
const comboCard = (page: Page) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: COMBO_NAME, level: 3 }) })

/** Re-runnable detection: the catalog API already lists a combo product with this spec's name. */
async function findComboByName(): Promise<ComboProductRow | undefined> {
  const { items } = await gw<{ items: ComboProductRow[] }>("/catalog/api/v1/products?page=1&limit=100")
  return items.find((item) => item.name === COMBO_NAME && item.isCombo)
}

/**
 * The component list on the Combo card, asserted after saving and again after a reload. The card's price and saving
 * are deliberately NOT asserted here: a UI bug makes them render 0 ₫ / -100% (see the F03.8 fixme test below), even
 * though the backend stores 190.000. The expectation is kept in that fixme instead of being weakened here.
 */
async function expectComboCard(card: Locator) {
  await expect(card).toBeVisible()
  await expect(card).toContainText(COMBO_NAME)
  await expect(card).toContainText("Gói Combo · 2 thành phần")
  await expect(card.getByText("x1", { exact: true })).toHaveCount(2)
  for (const component of COMBO_COMPONENTS) {
    await expect(card).toContainText(component.name)
    await expect(card).toContainText(component.sku)
  }
}

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
 * Adds the one variant of a product in its always-visible inline panel when the list is still empty (a second run
 * finds the variant already there). The panel heading doubles as the wait for the variants request to settle.
 */
async function ensureVariant(page: Page, product: { name: string; sku: string; price: number }) {
  const panel = variantsPanel(page, product.name)
  await expect(panel.getByRole("heading", { name: `Biến thể của ${product.name}`, level: 2 })).toBeVisible()
  const empty = panel.getByText("Sản phẩm chưa có biến thể.")
  const variantLine = panel.getByText(`SKU: ${product.sku} · ${vnd(product.price)} ₫`)
  await expect(empty.or(variantLine).first()).toBeVisible()
  if (await empty.isVisible()) {
    await panel.getByRole("button", { name: "Thêm biến thể" }).click()
    const form = page.getByRole("dialog", { name: "Thêm biến thể" })
    await expect(form).toBeVisible()
    await form.getByLabel("SKU").fill(product.sku)
    await form.getByLabel("Giá bán (VND)").fill(String(product.price))
    await form.getByRole("button", { name: "Tạo biến thể" }).click()
    await expect(form).toBeHidden()
  }
  await expect(variantLine).toBeVisible()
  await expect(panel).toContainText("1 biến thể")
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
      // the description is not a stable part of the row text after the redesign; F03.5 reads it from the edit form
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
    await step(`Add the variant ${product.sku} to '${product.name}' in its inline panel`, async () => {
      await ensureVariant(page, product)
    })
  }

  await step("A duplicate SKU is refused by the server", async () => {
    const robusta = catalog.products.robusta
    const panel = variantsPanel(page, robusta.name)
    await expect(panel.getByText(`SKU: ${robusta.sku}`)).toBeVisible()
    await panel.getByRole("button", { name: "Thêm biến thể" }).click()
    const form = page.getByRole("dialog", { name: "Thêm biến thể" })
    await expect(form).toBeVisible()
    await form.getByLabel("SKU").fill(catalog.products.arabica.sku)
    await form.getByLabel("Giá bán (VND)").fill(String(catalog.products.arabica.price))
    await form.getByRole("button", { name: "Tạo biến thể" }).click()
    await expect(form.getByRole("alert")).toHaveText(/SKU code already exists|SKU đã tồn tại/i)
    await form.getByRole("button", { name: "Hủy" }).click()
    await expect(form).toBeHidden()
    await expect(panel).toContainText("1 biến thể")
  })

  await step("After a reload each inline panel still shows its SKU and its price in VND", async () => {
    await page.reload()
    await settled(page)
    for (const product of products) {
      const panel = variantsPanel(page, product.name)
      await expect(panel.getByText(`SKU: ${product.sku} · ${vnd(product.price)} ₫`)).toBeVisible()
      await expect(panel).toContainText("1 biến thể")
    }
  })
})

/**
 * App regression after the consolidation: ProductsTable filters on `product.sku`, but `fetchProductsBundle` in
 * ProductsPage.tsx hardcodes `sku: ""` on every row, so typing "CF-ARA-250" now matches nothing. Searching by the
 * product name (the other thing the placeholder advertises) still narrows the table to exactly one product; the
 * SKU-search regression is reported rather than turned into a weaker assertion.
 */
test("F03.4 Search, the status filter and the empty state", async ({ page, step }) => {
  await page.goto("/products")
  await settled(page)
  const search = page.getByPlaceholder("Tìm tên sản phẩm, mã SKU...")
  await expect(productRow(page, catalog.products.arabica.name)).toBeVisible()

  await step("Searching the Arabica name finds exactly that product", async () => {
    await search.fill(catalog.products.arabica.name)
    // one product row and its inline variants row, plus the header
    await expect(
      page.getByRole("row").filter({ has: page.getByRole("button", { name: /^Chỉnh sửa / }) }),
    ).toHaveCount(1)
    await expect(productRow(page, catalog.products.arabica.name)).toBeVisible()
    for (const product of products.filter((item) => item.name !== catalog.products.arabica.name)) {
      await expect(productRow(page, product.name)).toHaveCount(0)
    }
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

/** The original F03.4 assertion, kept so the SKU-search regression cannot be forgotten. */
test("F03.4 Search by SKU finds exactly the Arabica product", async ({ page, step }) => {
  test.fixme(
    true,
    "App regression after pbl-web #25/#26: ProductsTable filters on product.sku, but fetchProductsBundle " +
      "(src/features/products/ProductsPage.tsx) hardcodes sku: '' on every row, so typing CF-ARA-250 in " +
      "'Tìm tên sản phẩm, mã SKU...' matches nothing and shows 'Không tìm thấy sản phẩm'. Remove this line " +
      "when the product bundle carries SKUs again.",
  )
  await page.goto("/products")
  await settled(page)
  await step("Searching 'CF-ARA-250' finds exactly the Arabica product", async () => {
    await page.getByPlaceholder("Tìm tên sản phẩm, mã SKU...").fill(catalog.products.arabica.sku)
    await expect(
      page.getByRole("row").filter({ has: page.getByRole("button", { name: /^Chỉnh sửa / }) }),
    ).toHaveCount(1)
    await expect(productRow(page, catalog.products.arabica.name)).toBeVisible()
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
    // the edited description lives in the product record; the edit form is the reliable place to read it back
    await productRow(page, arabica.name).getByRole("button", { name: `Chỉnh sửa ${arabica.name}` }).click()
    const dialog = page.getByRole("dialog", { name: "Sửa sản phẩm" })
    await expect(dialog.getByLabel("Mô tả")).toHaveValue(ARABICA_NEW_DESCRIPTION)
    await dialog.getByRole("button", { name: "Hủy" }).click()
    await expect(dialog).toBeHidden()
  })

  await step("Put the data.ts description back so this file can run again", async () => {
    await productRow(page, arabica.name).getByRole("button", { name: `Chỉnh sửa ${arabica.name}` }).click()
    const dialog = page.getByRole("dialog", { name: "Sửa sản phẩm" })
    await dialog.getByLabel("Mô tả").fill(arabica.description)
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await settled(page)
    await productRow(page, arabica.name).getByRole("button", { name: `Chỉnh sửa ${arabica.name}` }).click()
    const check = page.getByRole("dialog", { name: "Sửa sản phẩm" })
    await expect(check.getByLabel("Mô tả")).toHaveValue(arabica.description)
    await check.getByRole("button", { name: "Hủy" }).click()
    await expect(check).toBeHidden()
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

  await step("Open the price-list section", async () => {
    await page.goto("/products?tab=price-lists")
    await settled(page)
    // PR #25/#26 removed the tab control: every section is on the one page now
    await expect(page.getByRole("heading", { name: "Bảng giá theo kênh bán", level: 2 })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tạo bảng giá mới" })).toBeVisible()
    // wait for the GET before deciding whether to create our list
    await expect(page.getByText("Chưa có bảng giá nào phù hợp").or(priceListRow(page)).first()).toBeVisible()
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
    await expect(page.getByRole("heading", { name: "Bảng giá theo kênh bán", level: 2 })).toBeVisible()
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
  // Detected by name in GET /catalog/api/v1/products with isCombo=true; no duplicate is ever created.
  const existing = await findComboByName()

  await step("The 'Gói sản phẩm Combo' KPI card opens the combo section of the redesigned products page", async () => {
    await page.goto("/products")
    await settled(page)
    await expect(page.getByRole("heading", { name: "Sản phẩm", level: 1 })).toBeVisible()
    const kpi = page.getByRole("button", { name: /Gói sản phẩm Combo/ })
    await expect(kpi).toBeVisible()
    await kpi.click()
    // The tab control is gone: the builder lives in the "Sản phẩm Combo" section further down the same page.
    await expect(page.getByRole("heading", { name: "Sản phẩm Combo", level: 2 })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tạo gói Combo mới" })).toBeVisible()
  })

  await step("The builder refuses a blank name and a Combo with no SKU components", async () => {
    await page.getByRole("button", { name: "Tạo gói Combo mới" }).click()
    const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "Tạo gói Sản phẩm Combo mới" })).toBeVisible()
    // The input is `required`, so a truly empty submit is stopped by the browser; spaces reach the app's own check.
    await dialog.getByLabel(/Tên gói Combo/).fill("   ")
    await dialog.getByRole("button", { name: "Tạo gói Combo" }).click()
    await expect(dialog.getByRole("alert")).toHaveText("Vui lòng nhập tên sản phẩm Combo.")

    await dialog.getByLabel(/Tên gói Combo/).fill(COMBO_NAME)
    await dialog.getByRole("button", { name: "Tạo gói Combo" }).click()
    await expect(dialog.getByRole("alert")).toHaveText("Gói Combo cần ít nhất 1 biến thể SKU thành phần.")
    await dialog.getByRole("button", { name: "Hủy bỏ" }).click()
    await expect(dialog).toBeHidden()
  })

  await step(`Add Arabica x1 and Phin x1, set ${vnd(COMBO_PRICE)} ₫ and check the live saving calculation`, async () => {
    await page.getByRole("button", { name: "Tạo gói Combo mới" }).click()
    const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/Tên gói Combo/).fill(COMBO_NAME)
    const picker = dialog.getByPlaceholder("Gõ tên sản phẩm hoặc mã SKU để thêm vào gói...")
    for (const component of COMBO_COMPONENTS) {
      await picker.fill(component.sku)
      // Components are picked by clicking the result chip, not by pressing Enter in the search box.
      await dialog.getByRole("button", { name: new RegExp(component.sku) }).click()
    }
    await expect(dialog.getByText("2. Danh sách SKU con trong gói (2 mặt hàng)")).toBeVisible()
    await dialog.getByRole("spinbutton").fill(String(COMBO_PRICE))
    // 135.000 + 65.000 = 200.000, minus 190.000: 10.000 VND, 5% - exact template from the panel source.
    await expect(dialog.getByText(BUILDER_SAVINGS, { exact: true })).toBeVisible()
    await expect(dialog).toContainText(`Tổng giá bán lẻ các SKU con: ${vnd(COMBO_SUM_RETAIL)} ₫`)
  })

  await step("A fractional and a negative Combo price are refused: the builder does not save", async () => {
    const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
    const price = dialog.getByRole("spinbutton")
    for (const invalid of ["12.5", "-1000"]) {
      await price.fill(invalid)
      await dialog.getByRole("button", { name: "Tạo gói Combo" }).click()
      await expect(dialog).toBeVisible()
      // type=number min=0 step=1000 shows the browser's native refusal (the app's own message is behind it).
      expect(await price.evaluate((el) => (el as HTMLInputElement).validity.valid), invalid).toBe(false)
    }
    await price.fill(String(COMBO_PRICE))
  })

  if (existing) {
    await step("A previous run already created this Combo: leave it untouched instead of saving a duplicate", async () => {
      const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
      await dialog.getByRole("button", { name: "Hủy bỏ" }).click()
      await expect(dialog).toBeHidden()
    })
  } else {
    await step("Save the Combo: it appears as a card with its two components", async () => {
      const dialog = page.getByRole("dialog", { name: "Tạo sản phẩm Combo" })
      await dialog.getByRole("button", { name: "Tạo gói Combo" }).click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole("status").filter({ hasText: `Đã tạo sản phẩm Combo "${COMBO_NAME}"` })).toBeVisible()
      await expectComboCard(comboCard(page))
    })
  }

  await step("After a reload the Combo is still listed with the same two SKUs", async () => {
    await page.reload()
    await settled(page)
    await expectComboCard(comboCard(page))
  })

  await step("The backend reports exactly the two components with the right line totals", async () => {
    const combo = await findComboByName()
    expect(combo).toBeDefined()
    expect(combo!.isCombo).toBe(true)
    const items = await gw<ComboItemRow[]>(`/catalog/api/v1/products/${combo!.id}/combo-items`)
    expect(items).toHaveLength(2)
    const bySku = new Map(items.map((item) => [item.skuCode, item]))
    for (const component of COMBO_COMPONENTS) {
      expect(bySku.get(component.sku)).toMatchObject({ quantity: 1, lineTotal: component.price })
    }
  })
})

/**
 * App bug in the fixed web, isolated from the passing creation flow above (same pattern as the F03.4 SKU fixme).
 * fetchProductsBundle in ProductsPage.tsx maps real products with `price: "—"` and NO `retailPrice`, while
 * ProductCombosPanel.tsx builds each card with `comboPrice: p.retailPrice ?? 0`. The saved card therefore reads
 * "Giá Combo: 0 ₫" / "Khách tiết kiệm 200.000 ₫ (-100%)" even though the POST created the combo's default variant
 * with basePrice 190000 (GET /products/{id}/variants) and the builder itself showed the right saving before saving.
 */
test("F03.8 The saved Combo price is shown on its card", async ({ page, step }) => {
  test.fixme(
    true,
    "App bug: ProductsPage.fetchProductsBundle never sets product.retailPrice, " +
      "but ProductCombosPanel reads `p.retailPrice ?? 0` for every Combo card, so a combo saved at 190.000 VND is " +
      "listed as 'Giá Combo: 0 ₫' with 'Khách tiết kiệm 200.000 ₫ (-100%)'. The backend is correct: the combo's " +
      "default variant has basePrice 190000 and GET /products/{id}/combo-items returns lineTotals 135000 and 65000. " +
      "Fix the bundle mapping (or read the variant price) and remove this fixme.",
  )
  // The serial F03.8 test above leaves the combo in the shared store; only the display assertion is missing from it.
  await page.goto("/products")
  await settled(page)
  await step("The combo card shows the price saved in the builder", async () => {
    const card = comboCard(page)
    await expect(card).toBeVisible()
    await expect(card).toContainText(`Giá Combo: ${vnd(COMBO_PRICE)} ₫`)
    await expect(card).toContainText(CARD_SAVINGS)
  })
})
