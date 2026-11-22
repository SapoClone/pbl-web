import { describe, expect, it } from "vitest"
import type { TenantContext } from "@/api/platform/context"
import { storeCard } from "./storeCard"

const context = (over: Partial<TenantContext> = {}): TenantContext => ({
  tenant: { id: "t1", code: "TN0001", name: "Mộc Store", status: "active" },
  plan: { code: "free", name: "Free", isExpiringSoon: false, expiresAt: null },
  branchCount: 1,
  me: { accountId: "a", name: "An", initials: "A", roleId: "r", roleName: "Chủ cửa hàng", isOwner: true },
  branches: [],
  permissions: ["*"],
  timezone: "Asia/Ho_Chi_Minh",
  ...over
})

describe("sidebar store card", () => {
  it("shows the real plan and branch count of the store", () => {
    expect(storeCard({ isDemo: false, context: context({ plan: { code: "pro", name: "Pro", isExpiringSoon: true, expiresAt: "2026-12-01T00:00:00Z" }, branchCount: 3 }) })).toEqual({
      name: "Mộc Store",
      planName: "Pro",
      branchText: "3 chi nhánh"
    })
  })
  it("shows a store on the Free plan as Free, not as Pro", () => {
    expect(storeCard({ isDemo: false, context: context() }).planName).toBe("Free")
  })
  it("shows no plan and no branch count while the context is unknown", () => {
    expect(storeCard({ isDemo: false, tokenTenantName: "Quán A" })).toEqual({ name: "Quán A", planName: null, branchText: null })
  })
  it("falls back to a neutral name, not a made-up store", () => {
    expect(storeCard({ isDemo: false }).name).toBe("Cửa hàng của bạn")
  })
  it("keeps the made-up plan only in demo mode", () => {
    expect(storeCard({ isDemo: true })).toEqual({ name: "Mộc Store", planName: "Pro", branchText: "3/5 chi nhánh" })
  })
})
