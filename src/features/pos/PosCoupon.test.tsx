import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as variantsApi from "@/api/catalog/variants"
import * as customersApi from "@/api/customer/customers"
import * as stockApi from "@/api/inventory/stock"
import * as branchesApi from "@/api/platform/branches"
import * as ordersApi from "@/api/sales/orders"
import * as promotionsApi from "@/api/sales/promotions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { PosPage } from "./PosPage"

vi.mock("@/api/catalog/variants", () => ({ listActiveVariants: vi.fn() }))
vi.mock("@/api/customer/customers", () => ({ listCustomers: vi.fn() }))
vi.mock("@/api/inventory/stock", () => ({ listStock: vi.fn() }))
vi.mock("@/api/platform/branches", () => ({ listBranches: vi.fn() }))
vi.mock("@/api/sales/promotions", () => ({ evaluateCoupon: vi.fn() }))
vi.mock("@/api/sales/orders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/sales/orders")>()
  return {
    ...original,
    getActivePosShift: vi.fn(),
    listAvailablePosShifts: vi.fn(),
    openPosShift: vi.fn(),
    closePosShift: vi.fn(),
    posCheckout: vi.fn()
  }
})

const result = (discountAmountVnd: number) =>
  ({
    couponCode: "TET15",
    promotionName: "Tết 15%",
    orderAmountVnd: 130000,
    discountAmountVnd,
    finalAmountVnd: 130000 - discountAmountVnd
  }) as promotionsApi.EvaluateCouponResult

const httpError = (status: number, data: unknown) =>
  new AxiosError("failed", String(status), undefined, undefined, {
    status,
    data
  } as AxiosResponse)

async function addProduct() {
  fireEvent.click(await screen.findByText("Ao thun - M"))
}

const typeCoupon = (code: string) =>
  fireEvent.change(screen.getByPlaceholderText(/SALE10/), { target: { value: code } })

describe("POS coupon preview", () => {
  beforeEach(() => {
    useStoreAuth.setState({
      tokens: { userId: "u1", accessToken: "t", refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t1", tenants: [] }
    })
    vi.mocked(branchesApi.listBranches).mockResolvedValue({ data: [{ id: "b1", name: "Chi nhánh chính", code: "CN01" }] } as never)
    vi.mocked(variantsApi.listActiveVariants).mockResolvedValue([
      { variantId: "v-m", productId: "p1", name: "Ao thun", label: "M", skuCode: "AO-M", barcode: null, price: 130000, imageUrl: null, status: "active", category: null, avgCostPrice: 70000 }
    ] as never)
    vi.mocked(stockApi.listStock).mockResolvedValue({ data: [{ sku: "AO-M", name: "Ao thun (M)", available: 20 }] } as never)
    vi.mocked(customersApi.listCustomers).mockResolvedValue({ data: [] } as never)
    vi.mocked(ordersApi.getActivePosShift).mockResolvedValue(null)
    vi.mocked(ordersApi.listAvailablePosShifts).mockResolvedValue([])
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderPos = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <PosPage />
      </QueryClientProvider>
    )
  }

  it("shows the server's discount for a real coupon", async () => {
    vi.mocked(promotionsApi.evaluateCoupon).mockResolvedValue(result(19500))
    renderPos()
    await addProduct()
    typeCoupon("TET15")
    await waitFor(
      () =>
        expect(promotionsApi.evaluateCoupon).toHaveBeenCalledWith({
          code: "TET15",
          orderAmount: 130000,
          branchId: "b1"
        }),
      { timeout: 3000 }
    )
    expect(await screen.findByText(/Tết 15%: giảm/)).toBeTruthy()
    expect(screen.getAllByText(/110\.500/).length).toBeGreaterThan(0)
  })

  it("evaluates once after typing, not on every key", async () => {
    vi.mocked(promotionsApi.evaluateCoupon).mockResolvedValue(result(19500))
    renderPos()
    await addProduct()
    for (const code of ["T", "TE", "TET", "TET15"]) typeCoupon(code)
    await screen.findByText(/Tết 15%: giảm/, undefined, { timeout: 3000 })
    expect(promotionsApi.evaluateCoupon).toHaveBeenCalledTimes(1)
  })

  it("shows the server's reason and gives no discount for an invalid coupon", async () => {
    vi.mocked(promotionsApi.evaluateCoupon).mockRejectedValue(
      httpError(400, { message: "Mã đã hết lượt sử dụng." })
    )
    renderPos()
    await addProduct()
    typeCoupon("SALE10")
    expect(
      await screen.findByText("Mã đã hết lượt sử dụng.", undefined, { timeout: 3000 })
    ).toBeTruthy()
    expect(screen.queryByText(/Chiết khấu \/ Mã giảm/)).toBeNull()
  })

  it("falls back to the client preset when the evaluate call is missing", async () => {
    vi.mocked(promotionsApi.evaluateCoupon).mockRejectedValue(httpError(404, {}))
    renderPos()
    await addProduct()
    typeCoupon("SALE10")
    await waitFor(() => expect(promotionsApi.evaluateCoupon).toHaveBeenCalled(), {
      timeout: 3000
    })
    expect(await screen.findByText(/Chiết khấu \/ Mã giảm/)).toBeTruthy()
    expect(screen.getAllByText(/117\.000/).length).toBeGreaterThan(0)
  })

  it("accepts exact VND amounts in the tendered cash field", async () => {
    renderPos()
    await addProduct()
    const cash = screen.getByPlaceholderText("130000") as HTMLInputElement
    expect(cash.step).toBe("1")
  })
})
