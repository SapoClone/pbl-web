import type { Page } from "@playwright/test"

/**
 * An on-screen caption, burned into the video, so someone who only watches the recording knows which step is under
 * test. It survives page navigations (it is kept in sessionStorage and re-drawn by an init script).
 */
const KEY = "__e2e_caption"

const draw = `
  (text) => {
    let el = document.getElementById("__e2e_caption")
    if (!text) { el?.remove(); return }
    if (!el) {
      el = document.createElement("div")
      el.id = "__e2e_caption"
      el.style.cssText = "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483647;" +
        "max-width:82vw;padding:8px 16px;border-radius:10px;background:rgba(15,40,35,.92);color:#fff;" +
        "font:600 15px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);pointer-events:none;text-align:center"
      ;(document.body || document.documentElement).appendChild(el)
    }
    el.textContent = text
  }`

const installed = new WeakSet<Page>()

export async function caption(page: Page, text: string) {
  if (!installed.has(page)) {
    installed.add(page)
    await page.addInitScript(
      ({ key, drawSrc }) => {
        const redraw = () => {
          const text = sessionStorage.getItem(key)
          if (text) (eval(drawSrc) as (t: string) => void)(text)
        }
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", redraw)
        else redraw()
      },
      { key: KEY, drawSrc: draw },
    )
  }
  await page.evaluate(
    ({ key, drawSrc, text }) => {
      sessionStorage.setItem(key, text)
      ;(eval(drawSrc) as (t: string) => void)(text)
    },
    { key: KEY, drawSrc: draw, text },
  )
}
