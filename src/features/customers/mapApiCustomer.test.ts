import { describe, expect, it } from "vitest"
import type { ApiCustomer } from "@/api/customer/customers"
import { mapApiCustomer } from "./CustomersPage"

const base = {
  id: "c1",
  code: "KH001",
  name: "An",
  phone: null,
  status: "ACTIVE",
  createdAt: "2026-11-20T00:00:00.000Z"
} as ApiCustomer

describe("mapApiCustomer points", () => {
  it("reads the balance from loyaltyPoints, as the list endpoint returns it", () => {
    expect(mapApiCustomer({ ...base, loyaltyPoints: 120 }).pointsBalance).toBe(120)
  })

  it("falls back to pointsBalance, then 0", () => {
    expect(mapApiCustomer({ ...base, pointsBalance: 7 }).pointsBalance).toBe(7)
    expect(mapApiCustomer(base).pointsBalance).toBe(0)
  })
})
