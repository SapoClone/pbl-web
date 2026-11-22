import { beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.fn()
const post = vi.fn()
vi.mock("@/api/axios", () => ({ gatewayClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }))

import { getActivePosShift, listAvailablePosShifts, posCheckout, salesErrorMessage } from "./orders"

const apiError = (errorCode: string, message = "server message") => ({ response: { status: 409, data: { errorCode, message } } })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe("POS API calls", () => {
  it("treats 'no open shift' as an answer, not a failure", async () => {
    get.mockRejectedValue(apiError("SHIFT_NOT_OPEN"))
    await expect(getActivePosShift("b1")).resolves.toBeNull()
  })

  it("still throws every other failure of the active shift call", async () => {
    get.mockRejectedValue(apiError("FORBIDDEN"))
    await expect(getActivePosShift("b1")).rejects.toMatchObject({ response: { data: { errorCode: "FORBIDDEN" } } })
  })

  it("lists the open shifts of a branch", async () => {
    get.mockResolvedValue({ data: { data: [{ id: "s1", code: "CA-1", register: { id: null, code: "Q01" } }] } })
    await expect(listAvailablePosShifts("b1")).resolves.toHaveLength(1)
    expect(get).toHaveBeenCalledWith("/sales/api/v1/pos/shifts/available", { params: { branchId: "b1" } })
  })

  it("sells through /pos/checkout with an idempotency key", async () => {
    post.mockResolvedValue({ data: { orderCode: "HD-1", paymentStatus: "PAID" } })
    const input = {
      branchId: "b1",
      shiftId: "s1",
      lines: [{ variantId: "v1", qty: 2 }],
      paymentMethod: "CASH" as const,
      tenderedCash: 300000
    }
    await expect(posCheckout(input)).resolves.toMatchObject({ orderCode: "HD-1" })
    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe("/sales/api/v1/pos/checkout")
    expect(body).toEqual(input)
    expect(config.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("uses a new idempotency key for each sale", async () => {
    post.mockResolvedValue({ data: {} })
    const input = { branchId: "b", shiftId: "s", lines: [{ variantId: "v", qty: 1 }], paymentMethod: "CARD" as const }
    await posCheckout(input)
    await posCheckout(input)
    expect(post.mock.calls[0][2].headers["Idempotency-Key"]).not.toBe(post.mock.calls[1][2].headers["Idempotency-Key"])
  })
})

describe("sales error messages", () => {
  it("says what to do for the shift and stock codes, in Vietnamese", () => {
    expect(salesErrorMessage(apiError("SHIFT_REQUIRED"), "x")).toMatch(/mở ca/)
    expect(salesErrorMessage(apiError("INSUFFICIENT_STOCK"), "x")).toMatch(/tồn khả dụng/)
    expect(salesErrorMessage(apiError("COUPON_INVALID"), "x")).toMatch(/Mã giảm giá/)
    expect(salesErrorMessage(apiError("VARIANCE_REASON_REQUIRED"), "x")).toMatch(/lý do/)
  })
  it("falls back to the server's message, then to the given text", () => {
    expect(salesErrorMessage(apiError("SOMETHING_NEW", "Server says no"), "fallback")).toBe("Server says no")
    expect(salesErrorMessage(new Error("boom"), "fallback")).toBe("fallback")
  })
})
