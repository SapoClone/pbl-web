import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as procurement from "@/api/inventory/procurement"
import { SupplierForm } from "./SuppliersPage"

vi.mock("@/api/inventory/procurement", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/inventory/procurement")>()
  return { ...original, getSupplier: vi.fn(), updateSupplier: vi.fn() }
})

const listRow: procurement.Supplier = {
  id: "s1",
  code: "NCC01",
  name: "Cong ty A",
  phone: "0900000000",
  email: null,
  address: null,
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SupplierForm edit", () => {
  it("loads the full supplier and patches only the changed field", async () => {
    vi.mocked(procurement.getSupplier).mockResolvedValue({
      ...listRow,
      taxCode: "0312345678",
      note: "Ghi chu cu"
    })
    vi.mocked(procurement.updateSupplier).mockResolvedValue(listRow)
    const saved = vi.fn().mockResolvedValue(undefined)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <SupplierForm initial={listRow} close={vi.fn()} saved={saved} />
      </QueryClientProvider>
    )

    const taxInput = (await screen.findByDisplayValue("0312345678")) as HTMLInputElement
    expect(taxInput.value).toBe("0312345678")
    expect(screen.getByDisplayValue("Ghi chu cu")).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue("Cong ty A"), {
      target: { value: "Cong ty B" }
    })
    fireEvent.click(screen.getByRole("button", { name: /Lưu nhà cung cấp/ }))

    await waitFor(() =>
      expect(procurement.updateSupplier).toHaveBeenCalledWith("s1", {
        name: "Cong ty B"
      })
    )
  })
})
