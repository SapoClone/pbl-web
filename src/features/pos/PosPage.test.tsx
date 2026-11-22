import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as variantsApi from "@/api/catalog/variants"
import * as customersApi from "@/api/customer/customers"
import * as stockApi from "@/api/inventory/stock"
import * as branchesApi from "@/api/platform/branches"
import * as ordersApi from "@/api/sales/orders"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { PosPage } from "./PosPage"

vi.mock("@/api/catalog/variants", () => ({ listActiveVariants: vi.fn() }))
vi.mock("@/api/customer/customers", () => ({ listCustomers: vi.fn() }))
vi.mock("@/api/inventory/stock", () => ({ listStock: vi.fn() }))
vi.mock("@/api/platform/branches", () => ({ listBranches: vi.fn() }))
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

const openShift = (id: string, registerCode = "Q01"): ordersApi.PosShiftApi => ({
  id,
  branchId: "b1",
  registerCode,
  status: "OPEN",
  version: 1,
  openingCash: 1000000,
  expectedCash: 1000000,
  openedAt: "2026-11-22T01:00:00.000Z"
})

const availableShift = (id: string): ordersApi.AvailablePosShift => ({
  id,
  code: "CA-1",
  branchId: "b1",
  register: { id: null, code: "Q02" },
  opener: { id: "someone-else" },
  openedAt: "2026-11-22T01:00:00.000Z",
  plannedEndAt: null
})

function renderPos() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PosPage />
    </QueryClientProvider>
  )
}

async function addProductAndPay() {
  fireEvent.click(await screen.findByText("Ao thun - M"))
  fireEvent.click(screen.getByRole("button", { name: /Thanh toán và tạo đơn/ }))
}

describe("POS checkout", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/")
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
    vi.mocked(ordersApi.posCheckout).mockResolvedValue({
      checkoutId: "c1",
      orderId: "o1",
      orderCode: "HD-1",
      state: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "FULFILLED",
      shiftId: "sh1"
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sells the variant into the cashier's own open shift", async () => {
    vi.mocked(ordersApi.getActivePosShift).mockResolvedValue(openShift("sh1"))
    renderPos()
    await screen.findByText(/Q01.*Đang mở/)
    await addProductAndPay()
    await waitFor(() => expect(ordersApi.posCheckout).toHaveBeenCalledTimes(1))
    expect(ordersApi.posCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: "b1",
        shiftId: "sh1",
        lines: [{ variantId: "v-m", qty: 1 }],
        paymentMethod: "CASH",
        tenderedCash: 130000
      })
    )
    expect((await screen.findAllByText(/HD-1/)).length).toBeGreaterThan(0)
  })

  it("sells into another cashier's open shift when the cashier has none (the drawer is shared)", async () => {
    vi.mocked(ordersApi.listAvailablePosShifts).mockResolvedValue([availableShift("sh2")])
    renderPos()
    await screen.findByText(/Q02 đang mở: bán vào ca này/)
    await addProductAndPay()
    await waitFor(() => expect(ordersApi.posCheckout).toHaveBeenCalledWith(expect.objectContaining({ shiftId: "sh2" })))
  })

  it("does not sell without a shift: it asks the cashier to open one", async () => {
    renderPos()
    await screen.findByText(/Chưa có ca: mở ca để bán/)
    await addProductAndPay()
    expect(ordersApi.posCheckout).not.toHaveBeenCalled()
    expect((await screen.findAllByText(/Chưa có ca thu ngân đang mở/)).length).toBeGreaterThan(0)
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("sends the cashier's discount and the payment method the cashier chose", async () => {
    vi.mocked(ordersApi.getActivePosShift).mockResolvedValue(openShift("sh1"))
    renderPos()
    await screen.findByText(/Q01.*Đang mở/)
    fireEvent.click(await screen.findByText("Ao thun - M"))
    fireEvent.click(screen.getByRole("button", { name: /Quẹt thẻ POS/ }))
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán và tạo đơn/ }))
    await waitFor(() => expect(ordersApi.posCheckout).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(ordersApi.posCheckout).mock.calls[0][0]
    expect(sent.paymentMethod).toBe("CARD")
    expect(sent.tenderedCash).toBeUndefined()
  })

  it("shows the server's reason when the sale is refused", async () => {
    vi.mocked(ordersApi.getActivePosShift).mockResolvedValue(openShift("sh1"))
    vi.mocked(ordersApi.posCheckout).mockRejectedValue({ response: { data: { errorCode: "INSUFFICIENT_STOCK", message: "x" } } })
    renderPos()
    await screen.findByText(/Q01.*Đang mở/)
    await addProductAndPay()
    expect((await screen.findAllByText(/Không đủ tồn khả dụng/)).length).toBeGreaterThan(0)
  })

  it("does not pretend a shift opened when the server refused: no local fake shift", async () => {
    vi.mocked(ordersApi.openPosShift).mockRejectedValue({ response: { data: { errorCode: "SHIFT_ALREADY_OPEN", message: "x" } } })
    renderPos()
    fireEvent.click(await screen.findByRole("button", { name: /Chưa có ca: mở ca để bán/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Mở ca bán hàng" }))
    expect((await within(dialog).findByRole("alert")).textContent).toContain("đã có ca đang mở")
    expect(screen.queryByText(/Đang mở\)/)).toBeNull()
  })

  it("closes a shift and says so when the variance needs a manager", async () => {
    vi.mocked(ordersApi.getActivePosShift).mockResolvedValue(openShift("sh1"))
    vi.mocked(ordersApi.closePosShift).mockResolvedValue({ ...openShift("sh1"), status: "PENDING_APPROVAL" })
    renderPos()
    fireEvent.click(await screen.findByRole("button", { name: /Q01.*Đang mở/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText(/Tiền mặt thực đếm/), { target: { value: "800000" } })
    fireEvent.change(within(dialog).getByLabelText(/Lý do chênh lệch/), { target: { value: "miscounted_change" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận kết ca" }))
    await waitFor(() =>
      expect(ordersApi.closePosShift).toHaveBeenCalledWith("sh1", expect.objectContaining({ actualCash: 800000, reason: "miscounted_change" }))
    )
    expect((await within(dialog).findByRole("status")).textContent).toContain("chờ quản lý")
  })
})
