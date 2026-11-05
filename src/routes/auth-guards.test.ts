import { requireAuthentication, redirectAuthenticatedUser } from "./auth-guards"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

describe("route auth guards", () => {
  beforeEach(() => {
    useStoreAuth.getState().clearTokens()
  })

  it("redirects unauthenticated users to login", () => {
    expect(() => requireAuthentication()).toThrow()
  })

  it("allows authenticated users through protected routes", () => {
    useStoreAuth.getState().setTokens({
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      userId: "test-user",
      tokenExpires: Date.now() + 60_000
    })

    expect(() => requireAuthentication()).not.toThrow()
  })

  it("redirects authenticated users away from login", () => {
    useStoreAuth.getState().setTokens({
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      userId: "test-user",
      tokenExpires: Date.now() + 60_000
    })

    expect(() => redirectAuthenticatedUser()).toThrow()
  })
})
