import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeAccessToken } from "@/test/jwt"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

let pathname = "/"
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { pathname, searchStr: "" } }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}))
vi.mock("./Sidebar/Sidebar", () => ({ Sidebar: () => <nav aria-label="sidebar" /> }))
vi.mock("./Topbar/Topbar", () => ({ Topbar: () => <header /> }))

import { Layout } from "./index"

const signIn = (perms: string[]) =>
  useStoreAuth.setState({
    tokens: { userId: "u", accessToken: fakeAccessToken({ perms }), refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t", tenants: [] }
  })

describe("page access by permission", () => {
  beforeEach(() => {
    pathname = "/"
  })
  afterEach(() => useStoreAuth.setState({ tokens: null }))

  it("shows the page to a member whose role has its view permission", () => {
    signIn(["orders.view"])
    pathname = "/orders"
    render(<Layout><p>orders page</p></Layout>)
    expect(screen.getByText("orders page")).toBeTruthy()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("refuses a page the role cannot open and names the permission", () => {
    signIn(["orders.view"])
    pathname = "/staff"
    render(<Layout><p>staff page</p></Layout>)
    expect(screen.queryByText("staff page")).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("staff.view")
  })

  it("applies to the sub pages of a section", () => {
    signIn(["orders.view"])
    pathname = "/inventory"
    render(<Layout><p>inventory page</p></Layout>)
    expect(screen.queryByText("inventory page")).toBeNull()
  })

  it("lets the owner open everything", () => {
    signIn(["*"])
    pathname = "/staff"
    render(<Layout><p>staff page</p></Layout>)
    expect(screen.getByText("staff page")).toBeTruthy()
  })

  it("points a refused member to the first page their role can open", () => {
    signIn(["orders.view", "pos.view"])
    pathname = "/reports"
    render(<Layout><p>reports page</p></Layout>)
    expect(screen.getByRole("link", { name: /Về trang bạn được phép/ }).getAttribute("href")).toBe("/orders")
  })

  it("does not hide anything when the permissions are unknown (the API still decides)", () => {
    useStoreAuth.setState({
      tokens: { userId: "u", accessToken: "opaque", refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t", tenants: [] }
    })
    pathname = "/staff"
    render(<Layout><p>staff page</p></Layout>)
    expect(screen.getByText("staff page")).toBeTruthy()
  })

  it("does not guard the sign-in pages", () => {
    signIn([])
    pathname = "/login"
    render(<Layout><p>login form</p></Layout>)
    expect(screen.getByText("login form")).toBeTruthy()
  })
})
