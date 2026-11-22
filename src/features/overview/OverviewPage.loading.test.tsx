import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as stockApi from "@/api/inventory/stock"
import * as salesApi from "@/api/insight/salesSummary"
import * as ordersApi from "@/api/sales/orders"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}))
vi.mock("@/features/orders/OrderTable", () => ({ OrderTable: () => <div /> }))
vi.mock("@/api/inventory/stock", () => ({ getStockSummary: vi.fn(), listStockLevels: vi.fn() }))
vi.mock("@/api/insight/salesSummary", () => ({ getDailySales: vi.fn() }))
vi.mock("@/api/sales/orders", () => ({ getOrdersSummary: vi.fn(), listOrders: vi.fn() }))

import { OverviewPage } from "./OverviewPage"

const never = () => new Promise<never>(() => undefined)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <OverviewPage />
    </QueryClientProvider>
  )
}

describe("dashboard while its data is loading", () => {
  beforeEach(() => {
    useStoreAuth.setState({
      tokens: { userId: "u", accessToken: "t", refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t1", tenants: [] }
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useStoreAuth.setState({ tokens: null })
  })

  it("shows placeholders, and never a zero, an empty chart message or an 'all clear'", () => {
    vi.mocked(salesApi.getDailySales).mockImplementation(never)
    vi.mocked(stockApi.getStockSummary).mockImplementation(never)
    vi.mocked(stockApi.listStockLevels).mockImplementation(never)
    vi.mocked(ordersApi.getOrdersSummary).mockImplementation(never)
    vi.mocked(ordersApi.listOrders).mockImplementation(never)
    renderPage()
    expect(screen.getAllByRole("status", { name: "Đang tải" }).length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByText(/Chưa có dữ liệu doanh thu/)).toBeNull()
    expect(screen.queryByText(/Tất cả mặt hàng đều đạt/)).toBeNull()
    expect(screen.queryByText("0 ₫")).toBeNull()
    expect(screen.queryByText("Đủ định mức")).toBeNull()
  })

  it("shows the real numbers once they arrive", async () => {
    vi.mocked(salesApi.getDailySales).mockResolvedValue({
      data: [{ date: "2026-11-22", orderCount: 3, revenue: 360000 }],
      totals: { orderCount: 3, revenue: 360000 }
    } as never)
    vi.mocked(stockApi.getStockSummary).mockResolvedValue({ belowMinCount: 1, outOfStockCount: 0 } as never)
    vi.mocked(stockApi.listStockLevels).mockResolvedValue({ data: [] } as never)
    vi.mocked(ordersApi.getOrdersSummary).mockResolvedValue({ needsAction: { total: 0 }, awaitingConfirmation: 0 } as never)
    vi.mocked(ordersApi.listOrders).mockResolvedValue({ data: [], pagination: { totalRecords: 3 } } as never)
    renderPage()
    await waitFor(() => expect(screen.queryAllByRole("status", { name: "Đang tải" })).toHaveLength(0))
    expect(screen.getAllByText(/360\.000/).length).toBeGreaterThan(0)
  })
})
