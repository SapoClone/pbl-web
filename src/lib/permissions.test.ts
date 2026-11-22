import { describe, expect, it } from "vitest"
import { can, canAny, permissionsFromToken } from "./permissions"

const token = (claims: unknown) => {
  const encode = (value: unknown) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${encode({ alg: "RS256" })}.${encode(claims)}.signature`
}

describe("permissions from the access token", () => {
  it("reads the owner's wildcard and a member's list", () => {
    expect(permissionsFromToken(token({ perms: ["*"] }))).toEqual(["*"])
    expect(permissionsFromToken(token({ perms: ["orders.view", "pos.create"] }))).toEqual(["orders.view", "pos.create"])
  })

  it("is unknown (nothing hidden) when there is no readable perms claim", () => {
    expect(permissionsFromToken(undefined)).toBeNull()
    expect(permissionsFromToken("not-a-jwt")).toBeNull()
    expect(permissionsFromToken(token({ roles: ["owner"] }))).toBeNull()
    expect(permissionsFromToken(token({ perms: "orders.view" }))).toBeNull()
    expect(permissionsFromToken(token({ perms: [1, 2] }))).toBeNull()
    expect(permissionsFromToken("a.%%%.c")).toBeNull()
  })

  it("reads a token whose payload has non-ASCII text", () => {
    expect(permissionsFromToken(token({ name: "Nguyễn Văn Á", perms: ["staff.view"] }))).toEqual(["staff.view"])
  })
})

describe("can", () => {
  it("lets the owner do everything, and a member only what the role lists", () => {
    expect(can(["*"], "finance.approve")).toBe(true)
    expect(can(["orders.view"], "orders.view")).toBe(true)
    expect(can(["orders.view"], "orders.create")).toBe(false)
  })
  it("lets everything through when the permissions are unknown or no code is required", () => {
    expect(can(null, "staff.update")).toBe(true)
    expect(can([], undefined)).toBe(true)
  })
  it("refuses a member with no permissions", () => {
    expect(can([], "orders.view")).toBe(false)
  })
  it("canAny needs one of the codes", () => {
    expect(canAny(["staff.view"], ["staff.update", "staff.view"])).toBe(true)
    expect(canAny(["staff.view"], ["staff.update", "staff.delete"])).toBe(false)
  })
})
