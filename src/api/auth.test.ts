import { login, register } from "./auth"

describe("mock authentication", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("logs in with the development account", async () => {
    const tokens = await login({
      email: "ADMIN@omniretail.vn",
      password: "Admin@123"
    })

    expect(tokens.userId).toBe("mock-admin-001")
    expect(tokens.accessToken).toContain("mock-access-token")
  })

  it("rejects invalid credentials", async () => {
    await expect(
      login({ email: "admin@omniretail.vn", password: "wrong" })
    ).rejects.toThrow("Email or password is incorrect.")
  })

  it("registers and logs in a new mock account", async () => {
    await register({ email: "new@omniretail.vn", password: "Secret@123" })

    const tokens = await login({
      email: "new@omniretail.vn",
      password: "Secret@123"
    })

    expect(tokens.userId).toMatch(/^mock-user-/)
  })
})
