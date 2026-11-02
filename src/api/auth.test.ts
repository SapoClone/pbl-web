import { readStoredTokens } from "@/store/zustand/useStoreAuth"
import { createDemoTokens, isDemoCredentials } from "./auth"

// the callers read the switch; the switch itself is tested below on the real module
const flag = vi.hoisted(() => ({ enabled: true }))
vi.mock("@/config/env-config", async (original) => ({
  ...(await original<typeof import("@/config/env-config")>()),
  isDemoLoginEnabled: () => flag.enabled
}))

const demo = { email: "admin@gmail.com", password: "admin@gmail.com" }

describe("isDemoLoginEnabled", () => {
  it("is on in a development build, off in production unless switched on", async () => {
    const { isDemoLoginEnabled } = await vi.importActual<
      typeof import("@/config/env-config")
    >("@/config/env-config")
    expect(isDemoLoginEnabled({ DEV: true })).toBe(true)
    expect(isDemoLoginEnabled({ DEV: false })).toBe(false)
    expect(
      isDemoLoginEnabled({ DEV: false, VITE_ENABLE_DEMO_LOGIN: "true" })
    ).toBe(true)
  })
})

describe("demo sign-in", () => {
  afterEach(() => {
    flag.enabled = true
    localStorage.clear()
  })

  it("accepts the demo credentials when enabled", () => {
    expect(isDemoCredentials(demo)).toBe(true)
  })

  it("refuses them when disabled", () => {
    flag.enabled = false
    expect(isDemoCredentials(demo)).toBe(false)
  })

  it("drops a saved demo session when disabled and keeps a real one", () => {
    flag.enabled = false
    localStorage.setItem("pbl-auth", JSON.stringify(createDemoTokens()))
    expect(readStoredTokens()).toBeNull()
    expect(localStorage.getItem("pbl-auth")).toBeNull()

    const real = {
      userId: "u1",
      accessToken: "a",
      refreshToken: "r",
      tokenExpires: 1
    }
    localStorage.setItem("pbl-auth", JSON.stringify(real))
    expect(readStoredTokens()).toEqual(real)
  })
})
