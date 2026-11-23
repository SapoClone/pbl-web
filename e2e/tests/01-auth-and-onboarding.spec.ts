import { expect, test } from "../support/fixtures"
import { people, store } from "../support/data"
import { ownerStorageState, readWorld, writeWorld } from "../support/world"

/**
 * Flows F01.1 - F01.8 of flows/FLOWS.md. The store created here is the one every later spec works in, and the
 * signed-in session is saved for them in .auth/owner.json.
 */
test.describe.configure({ mode: "serial" })

/**
 * What the sign-in page shows when the server refuses. UX finding: for an unknown email the page shows the server's
 * raw English text ("Unauthorized"); only a 401 with no message gets the Vietnamese "Email hoặc mật khẩu không chính xác.".
 */
const SIGN_IN_REFUSED = /Unauthorized|Wrong email or password|không chính xác/i

const owner = () => ({ ...people.owner, email: people.owner.email() })

test("F01.1 A visitor who is not signed in is sent to the sign-in page", async ({ page, step }) => {
  await step("Visitor opens the orders page without being signed in", async () => {
    await page.goto("/orders")
  })
  await step("The sign-in page is shown instead", async () => {
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole("heading", { name: "Chào mừng trở lại" })).toBeVisible()
  })
})

test("F01.2 Registration refuses a wrong confirmation and a password with forbidden characters", async ({ page, step }) => {
  await page.goto("/register")
  const email = page.getByLabel("Email")
  await step("Fill the form with two different passwords", async () => {
    await email.fill(owner().email)
    await page.getByLabel("Tên tài khoản").fill(owner().name)
    await page.getByLabel("Mật khẩu", { exact: true }).fill(owner().password)
    await page.getByLabel("Nhập lại mật khẩu").fill("MatKhauKhac2026!")
    await page.getByRole("button", { name: /^Đăng ký/ }).click()
  })
  await step("The confirmation mismatch is reported", async () => {
    await expect(page.getByRole("status").filter({ hasText: "Mật khẩu xác nhận không khớp." })).toBeVisible()
  })
  await step("A password with a space and an accent is refused", async () => {
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Mat khau é2026")
    await page.getByLabel("Nhập lại mật khẩu").fill("Mat khau é2026")
    await page.getByRole("button", { name: /^Đăng ký/ }).click()
    await expect(page.getByRole("status").filter({ hasText: "chỉ được dùng chữ cái, số hoặc" })).toBeVisible()
  })
  await step("Neither attempt created an account: signing in with that email still fails", async () => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(owner().email)
    await page.getByLabel("Mật khẩu", { exact: true }).fill(owner().password)
    await page.getByRole("button", { name: /^Đăng nhập/ }).click()
    await expect(page.getByRole("status").filter({ hasText: SIGN_IN_REFUSED })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test("F01.3 The owner registers and, with no store yet, is asked to create one", async ({ page, step }) => {
  await page.goto("/register")
  await step("Fill in the registration form (Nguyễn Minh Anh)", async () => {
    await page.getByLabel("Email").fill(owner().email)
    await page.getByLabel("Tên tài khoản").fill(owner().name)
    await page.getByLabel("Mật khẩu", { exact: true }).fill(owner().password)
    await page.getByLabel("Nhập lại mật khẩu").fill(owner().password)
  })
  await step("Submit: the account is created, signed in, and sent to the store setup", async () => {
    await page.getByRole("button", { name: /^Đăng ký/ }).click()
    await expect(page).toHaveURL(/\/onboarding-tenant$/)
    await expect(page.getByRole("heading", { name: "Tạo cửa hàng của bạn" })).toBeVisible()
  })
  await step("Without a store, any other page sends the owner back to the setup", async () => {
    await page.goto("/products")
    await expect(page).toHaveURL(/\/onboarding-tenant$/)
  })
})

test("F01.4 The owner creates the coffee shop and lands on the overview", async ({ page, step, context }) => {
  // Sign in again (the previous test's browser context is gone) and continue where the owner left off
  await page.goto("/login")
  await page.getByLabel("Email").fill(owner().email)
  await page.getByLabel("Mật khẩu", { exact: true }).fill(owner().password)
  await page.getByRole("button", { name: /^Đăng nhập/ }).click()
  await expect(page).toHaveURL(/\/onboarding-tenant$/)

  await step("The access code field cleans what is typed", async () => {
    const code = page.getByLabel("Mã truy cập cửa hàng")
    await code.fill("Hạt Mộc 2026!")
    // upper case -> lower case, accents/spaces/punctuation dropped
    await expect(code).toHaveValue(/^[a-z0-9-]*$/)
  })
  await step("Fill in the shop's details", async () => {
    await page.getByLabel("Tên cửa hàng").fill(store.name)
    await page.getByLabel("Mã truy cập cửa hàng").fill(store.accessCode())
    await page.getByLabel("Số điện thoại").fill(store.phone)
    await page.getByLabel("Email cửa hàng").fill(store.email)
    await page.getByLabel("Địa chỉ").fill(store.address)
  })
  await step("Create the shop: the overview opens", async () => {
    await page.getByRole("button", { name: /Tạo cửa hàng và bắt đầu/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("heading", { name: "Tổng quan kinh doanh" })).toBeVisible()
  })
  await step("The sidebar store card shows the shop, its plan and one branch", async () => {
    const card = page.getByRole("button", { name: new RegExp(store.name) })
    await expect(card).toBeVisible()
    await expect(card).toContainText("Gói")
    await expect(card).toContainText("1 chi nhánh")
  })
  await step("Save this signed-in session for the next specs", async () => {
    await context.storageState({ path: ownerStorageState })
    writeWorld({ ...readWorld(), storeCreated: true })
  })
})

test("F01.5 Signing out returns to sign-in and protects the pages again", async ({ browser, step }) => {
  const context = await browser.newContext({ storageState: ownerStorageState })
  const page = await context.newPage()
  await page.goto("/")
  await step("Sign out from the sidebar", async () => {
    await page.getByRole("button", { name: "Đăng xuất" }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
  await step("The products page now redirects to sign-in", async () => {
    await page.goto("/products")
    await expect(page).toHaveURL(/\/login$/)
  })
  await context.close()
})

test("F01.6 Signing in with a wrong password shows an error and stays on the page", async ({ page, step }) => {
  await page.goto("/login")
  await step("Enter the owner's email with a wrong password", async () => {
    await page.getByLabel("Email").fill(owner().email)
    await page.getByLabel("Mật khẩu", { exact: true }).fill(people.stranger.password)
    await page.getByRole("button", { name: /^Đăng nhập/ }).click()
  })
  await step("The error is shown and the owner is still on the sign-in page", async () => {
    await expect(page.getByRole("status").filter({ hasText: SIGN_IN_REFUSED })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test("F01.7 Signing in with the right password opens the owner's shop", async ({ page, step, context }) => {
  await page.goto("/login")
  await step("Enter the owner's email and password", async () => {
    await page.getByLabel("Email").fill(owner().email)
    await page.getByLabel("Mật khẩu", { exact: true }).fill(owner().password)
    await page.getByRole("button", { name: /^Đăng nhập/ }).click()
  })
  await step("The overview opens with the same shop in the sidebar", async () => {
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: new RegExp(store.name) })).toBeVisible()
  })
  await step("Keep this fresh session for the next specs", async () => {
    await context.storageState({ path: ownerStorageState })
  })
})

test("F01.8 Forgot password answers the same way for any email", async ({ page, step }) => {
  test.fixme(
    true,
    "Backend gap: POST /auth/forgot-password is a placeholder (200 with the plain text 'forgot-password', no email is sent), " +
      "so the page shows 'Không thể hoàn tất yêu cầu' instead of the neutral confirmation. Remove this line when the reset flow is built.",
  )
  await page.goto("/login")
  await step("Open 'Quên mật khẩu?' from the sign-in page", async () => {
    await page.getByRole("link", { name: "Quên mật khẩu?" }).click()
    await expect(page.getByRole("heading", { name: "Khôi phục mật khẩu" })).toBeVisible()
  })
  await step("Ask for a link for an email that has no account", async () => {
    await page.getByLabel("Email").fill(people.stranger.email())
    await page.getByRole("button", { name: /^Gửi liên kết/ }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi sớm." }),
    ).toBeVisible()
  })
})
