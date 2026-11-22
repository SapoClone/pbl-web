import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as ordersApi from "@/api/sales/orders"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}))
vi.mock("./OrderTable", () => ({ OrderTable: () => <div /> }))
vi.mock("@/api/sales/orders", () => ({ getOrdersSummary: vi.fn() }))

import { OrdersPage } from "./OrdersPage"

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <OrdersPage />
    </QueryClientProvider>
  )
}

describe("orders summary while it is loading", () => {
  beforeEach(() => {
    useStoreAuth.setState({
      tokens: { userId: "u", accessToken: "t", refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t1", tenants: [] }
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useStoreAuth.setState({ tokens: null })
  })

  it("shows a placeholder in each of the four cards, not a '0' or a '—'", () => {
    vi.mocked(ordersApi.getOrdersSummary).mockImplementation(() => new Promise<never>(() => undefined))
    renderPage()
    expect(screen.getAllByRole("status", { name: "Đang tải" })).toHaveLength(4)
    expect(screen.queryByText("0")).toBeNull()
    expect(screen.queryByText("—")).toBeNull()
  })

  it("shows the counts once the summary arrives", async () => {
    vi.mocked(ordersApi.getOrdersSummary).mockResolvedValue({
      today: { total: 7, completed: 6 },
      awaitingConfirmation: 1,
      inFulfillment: { packing: 0, shipping: 0 },
      needsAction: { total: 0 },
      tabCounts: { all: 7, completed: 6 }
    } as never)
    renderPage()
    await waitFor(() => expect(screen.queryAllByRole("status", { name: "Đang tải" })).toHaveLength(0))
    expect(screen.getByText("7")).toBeTruthy()
    expect(screen.getByText("6")).toBeTruthy()
  })
})
