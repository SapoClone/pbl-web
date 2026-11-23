import { test as base, expect, type Page } from "@playwright/test"
import { caption } from "./narrate"
import { ownerStorageState } from "./world"

/**
 * `step(page, "text")` shows the caption in the recording and groups the actions in the HTML report.
 * Every spec after the first one starts signed in as the store owner created by `01-auth-and-onboarding`.
 */
export const test = base.extend<{ step: (title: string, body: () => Promise<void>) => Promise<void> }>({
  step: async ({ page }, use) => {
    await use(async (title, body) => {
      await test.step(title, async () => {
        await caption(page, title).catch(() => undefined)
        await body()
      })
    })
  },
})

export const asOwner = () => test.use({ storageState: ownerStorageState })

export { expect }

/** Wait until the page is no longer showing a loading placeholder */
export async function settled(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined)
  await expect(page.getByRole("status", { name: /^Đang tải/ })).toHaveCount(0, { timeout: 15_000 })
}
