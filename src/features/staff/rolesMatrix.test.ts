import { describe, expect, it } from "vitest"
import type { PermissionCatalog } from "@/api/platform/roles"
import {
  applicableCodes,
  columnState,
  diffPermissions,
  keepApplicable,
  rowCodes,
  rowState,
  sameSet,
  sortedCodes,
  toggleCode,
  toggleMany
} from "./rolesMatrix"

const pair = (module: string, action: string, isApplicable = true) => ({
  code: `${module}.${action}`,
  module,
  action,
  isApplicable
})

const catalog: PermissionCatalog = {
  modules: [
    { code: "reports", label: "Báo cáo", actions: ["view"] },
    { code: "products", label: "Sản phẩm", actions: ["view", "create", "update", "delete"] }
  ],
  actions: ["view", "create", "update", "delete"],
  permissions: [
    pair("reports", "view"),
    pair("reports", "create", false),
    pair("reports", "update", false),
    pair("reports", "delete", false),
    pair("products", "view"),
    pair("products", "create"),
    pair("products", "update"),
    pair("products", "delete")
  ],
  defaults: []
}

describe("roles matrix helpers", () => {
  it("only knows the pairs that exist in the catalog", () => {
    expect(applicableCodes(catalog).has("reports.create")).toBe(false)
    expect(rowCodes(catalog, "reports")).toEqual(["reports.view"])
    expect(rowCodes(catalog, "products")).toHaveLength(4)
  })

  it("reports all, some and none for a row and a column", () => {
    expect(rowState(new Set(), catalog, "products")).toBe("none")
    expect(rowState(new Set(["products.view"]), catalog, "products")).toBe("some")
    expect(rowState(new Set(rowCodes(catalog, "products")), catalog, "products")).toBe("all")
    expect(columnState(new Set(["reports.view"]), catalog, "view")).toBe("some")
    expect(columnState(new Set(["reports.view", "products.view"]), catalog, "view")).toBe("all")
    expect(columnState(new Set(), catalog, "approve")).toBe("na")
  })

  it("toggles a whole row on, then off, without touching other rows", () => {
    const row = rowCodes(catalog, "products")
    const on = toggleMany(new Set(["reports.view"]), row)
    expect(sortedCodes(on)).toEqual(["products.create", "products.delete", "products.update", "products.view", "reports.view"])
    const off = toggleMany(on, row)
    expect(sortedCodes(off)).toEqual(["reports.view"])
  })

  it("turns a partly selected row fully on", () => {
    const next = toggleMany(new Set(["products.view"]), rowCodes(catalog, "products"))
    expect(next.size).toBe(4)
  })

  it("toggles one code and never mutates its input", () => {
    const base = new Set(["products.view"])
    const next = toggleCode(base, "products.create")
    expect(base.has("products.create")).toBe(false)
    expect(next.has("products.create")).toBe(true)
    expect(toggleCode(next, "products.create").has("products.create")).toBe(false)
  })

  it("compares sets and lists what changed", () => {
    const before = new Set(["products.view", "orders.view"])
    const after = new Set(["products.view", "products.create"])
    expect(sameSet(before, new Set(["orders.view", "products.view"]))).toBe(true)
    expect(sameSet(before, after)).toBe(false)
    expect(diffPermissions(before, after)).toEqual({ added: ["products.create"], removed: ["orders.view"] })
  })

  it("drops codes the catalog does not have", () => {
    const kept = keepApplicable(new Set(["products.view", "reports.delete", "nope.view"]), catalog)
    expect(sortedCodes(kept)).toEqual(["products.view"])
  })
})
