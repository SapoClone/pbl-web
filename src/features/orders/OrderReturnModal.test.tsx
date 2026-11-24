import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AxiosError, type AxiosResponse } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as ordersApi from "@/api/sales/orders"
import { OrderReturnModal } from "./OrderTable"

vi.mock("@/api/sales/orders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/sales/orders")>()
  return { ...original, createOrderReturn: vi.fn() }
})

const order = {
  id: "ORD-1",
  orderUuid: "uuid-1",
  channel: "POS",
  customer: "An",
  items: [
    { id: "i1", sku: "SKU1", name: "Ao", quantity: 1, unitPrice: 100000, lineTotal: 100000 }
  ]
} as never

const refusal = (data: unknown) =>
  new AxiosError("409", "409", undefined, undefined, {
    status: 409,
    data
  } as AxiosResponse)

const renderModal = () => {
  const onSuccess = vi.fn().mockResolvedValue(undefined)
  render(
    <OrderReturnModal order={order} isDemo={false} onClose={vi.fn()} onSuccess={onSuccess} />
  )
  fireEvent.click(screen.getByRole("button", { name: /Xác nhận Trả hàng/ }))
  return onSuccess
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("OrderReturnModal errors", () => {
  it("explains SHIFT_REQUIRED and does not report success", async () => {
    vi.mocked(ordersApi.createOrderReturn).mockRejectedValue(
      refusal({ errorCode: "SHIFT_REQUIRED", message: "Shift required" })
    )
    const onSuccess = renderModal()
    expect(
      await screen.findByText(
        "Cần có ca thu ngân đang mở để hoàn tiền mặt. Hãy mở ca bán hàng trước."
      )
    ).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("shows the server message for other refusals", async () => {
    vi.mocked(ordersApi.createOrderReturn).mockRejectedValue(
      refusal({ message: "Đơn đã được trả đủ." })
    )
    const onSuccess = renderModal()
    expect(await screen.findByText("Đơn đã được trả đủ.")).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("reports success when the call works", async () => {
    vi.mocked(ordersApi.createOrderReturn).mockResolvedValue({})
    const onSuccess = renderModal()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})
