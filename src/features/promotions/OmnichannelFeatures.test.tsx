import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { ChannelsPage } from "@/features/channels/ChannelsPage"
import { CustomersPage } from "@/features/customers/CustomersPage"
import { ProductsPage } from "@/features/products/ProductsPage"
import { PromotionsPage } from "@/features/promotions/PromotionsPage"
import { ReportsPage } from "@/features/reports/ReportsPage"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("Omnichannel Retail 5-Module Suite (Promotions, PriceList/Combos, CRM 360, Reports, Channels)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/")
    useStoreAuth.setState({
      tokens: {
        userId: "demo-user-01",
        accessToken: "demo-access-token",
        refreshToken: "demo-refresh-token",
        tokenExpires: Date.now() + 3600_000,
        tenantId: "00000000-0000-4000-8000-000000000001",
        tenants: [],
        isDemo: true
      }
    })
  })

  it("renders PromotionsPage and switches between Programs, Coupons, and Simulator", () => {
    renderWithProviders(<PromotionsPage />)

    expect(
      screen.getByText(/Khuyến mãi & Mã giảm giá/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/OMNI-SUMMER15/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Mã giảm giá/i }))
    expect(screen.getByText("HE2026")).toBeInTheDocument()
  })

  it("renders catalog, price lists, and combos together in ProductsPage", () => {
    renderWithProviders(<ProductsPage requestedTab="price-lists" />)
    expect(
      screen.getAllByText(/Bảng giá/i).length
    ).toBeGreaterThan(0)

    expect(
      screen.getAllByText(/Combo/i).length
    ).toBeGreaterThan(0)
  })

  it("renders CustomersPage with CustomerGroups, MembershipTiers/Loyalty, and 360-degree CustomerDetailsDrawer", async () => {
    renderWithProviders(<CustomersPage />)

    expect(screen.getByText("Khách hàng & Tích điểm")).toBeInTheDocument()
    expect(screen.getByText("Nguyễn Minh Anh")).toBeInTheDocument()

    // Open 360 Drawer
    fireEvent.click(screen.getByText("Nguyễn Minh Anh"))
    await waitFor(() => {
      expect(
        screen.getByText(/Hồ sơ Khách hàng 360°/i)
      ).toBeInTheDocument()
    })

    // Switch inside 360 Drawer across 4 tabs
    fireEvent.click(screen.getByRole("tab", { name: /Điểm thưởng/i }))
    expect(
      screen.getByText(/Sổ cái biến động điểm/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Dư nợ & Công nợ/i }))
    expect(screen.getByText(/Thu nợ nhanh/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Sổ địa chỉ/i }))
    expect(screen.getByText(/Thêm địa chỉ/i)).toBeInTheDocument()

    // Close drawer via Escape and test top-level CustomerGroups & Loyalty tabs
    fireEvent.keyDown(window, { key: "Escape" })

    fireEvent.click(screen.getByRole("tab", { name: /Nhóm khách hàng/i }))
    expect(screen.getByText("Tạo nhóm khách hàng")).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("tab", { name: /Hạng thành viên & Tích điểm/i })
    )
    expect(
      screen.getByText(/Mô phỏng Tích & Tiêu điểm trực tiếp/i)
    ).toBeInTheDocument()
  })

  it("renders ReportsPage and switches across all 4 Recharts executive analytics tabs", () => {
    renderWithProviders(<ReportsPage />)

    expect(
      screen.getByText("Báo cáo Điều hành Đa kênh")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Cơ cấu tỷ trọng doanh thu theo Kênh bán/i)
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("tab", { name: /Báo cáo theo Sản phẩm/i })
    )
    expect(
      screen.getByText(/Top SKU Doanh thu & Lợi nhuận/i)
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("tab", { name: /Giá trị Tồn kho & Xuất nhập tồn/i })
    )
    expect(
      screen.getByText(/Sổ Xuất Nhập Tồn trong kỳ/i)
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("tab", { name: /Tài chính & Lợi nhuận gộp/i })
    )
    expect(
      screen.getByText(/Xu hướng Doanh thu thuần & Lợi nhuận gộp/i)
    ).toBeInTheDocument()
  })

  it("supports Bulk Auto-Match SKU and per-shop Sync Configuration in ChannelsPage", async () => {
    renderWithProviders(<ChannelsPage />)

    // Open Sync Config modal
    fireEvent.click(screen.getByText("Cấu hình đồng bộ"))
    expect(
      screen.getByText(/Tự động đẩy tồn kho khả dụng lên sàn/i)
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText("Lưu cấu hình đồng bộ"))

    await waitFor(() => {
      expect(
        screen.getByText(/Đã lưu cấu hình đồng bộ tồn kho/i)
      ).toBeInTheDocument()
    })

    // Open Bulk Auto-Match SKU modal and commit batch matches
    fireEvent.click(screen.getByText("Gợi ý nối SKU"))
    await waitFor(() => {
      expect(
        screen.getByText(/Gợi ý Nối SKU Hàng loạt/i)
      ).toBeInTheDocument()
    })

    const commitBtn = screen.getByRole("button", {
      name: /Xác nhận nối .* SKU đã chọn/i
    })
    fireEvent.click(commitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Đã tự động nối thành công/i)
      ).toBeInTheDocument()
    })
  })
})
