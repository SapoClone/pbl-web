import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it } from "vitest"
import {
  buildMarketplaceWebhookUrl,
  extractOAuthCodeAndState,
  parseLazadaShopSku
} from "@/api/integration"
import { OrderTable } from "@/features/orders/OrderTable"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { ChannelsPage } from "./ChannelsPage"

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe("Lazada integration utilities & Omnichannel features", () => {
  beforeEach(() => {
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

  it("parses Lazada canonical ShopSku format <item_id>_<platform>-<sku_id>", () => {
    expect(parseLazadaShopSku("13504402059_VNAMZ-117553898643")).toEqual({
      itemId: "13504402059",
      skuId: "117553898643"
    })
    expect(parseLazadaShopSku("  99887766_SG-55443322 ")).toEqual({
      itemId: "99887766",
      skuId: "55443322"
    })
    expect(parseLazadaShopSku("")).toEqual({
      itemId: "",
      skuId: ""
    })
  })

  it("extracts authorization code and state from Lazada OAuth callback URL or raw code", () => {
    const callbackUrl =
      "https://api.sapo.makeasy.id.vn/api/v1/integrations/lazada/callback?code=0_128491_xYz987&state=eyJ2IjoidjEifQ.hmacSig"
    expect(extractOAuthCodeAndState(callbackUrl)).toEqual({
      code: "0_128491_xYz987",
      state: "eyJ2IjoidjEifQ.hmacSig"
    })
    expect(extractOAuthCodeAndState("0_999888_rawCodeOnly")).toEqual({
      code: "0_999888_rawCodeOnly"
    })
  })

  it("builds marketplace webhook URL correctly", () => {
    expect(
      buildMarketplaceWebhookUrl(
        "LAZADA",
        "ck_lazada_abc123",
        "https://api.sapo.makeasy.id.vn/"
      )
    ).toBe(
      "https://api.sapo.makeasy.id.vn/integration/webhooks/v1/lazada/ck_lazada_abc123"
    )
  })

  it("renders Lazada integration hub, switches tabs, and supports OAuth + SKU mapping + conflict resolution", async () => {
    renderWithQueryClient(<ChannelsPage />)

    expect(
      screen.getByText("Kênh bán hàng & Tích hợp Lazada")
    ).toBeInTheDocument()
    expect(screen.getByText("Mộc Store Official Lazada")).toBeInTheDocument()

    // Navigate to SKU Mappings tab and test ShopSku auto-parser + price comparison
    fireEvent.click(screen.getByText("Ánh xạ SKU Lazada"))
    expect(
      screen.getByText("Bình giữ nhiệt Terra 500ml Chính Hãng")
    ).toBeInTheDocument()
    expect(screen.getAllByText("Khớp giá bán lẻ").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText("Liên kết mã hàng (SKU) mới"))
    const shopSkuInput = screen.getByPlaceholderText(
      "VD: 13504402059_VNAMZ-117553898643"
    )
    fireEvent.change(shopSkuInput, {
      target: { value: "13509998888_VNAMZ-11750001111" }
    })

    expect(screen.getByPlaceholderText("VD: 13504402059")).toHaveValue(
      "13509998888"
    )
    expect(screen.getByPlaceholderText("VD: 117553898643")).toHaveValue(
      "11750001111"
    )

    fireEvent.click(screen.getByText("Lưu ánh xạ SKU"))
    await waitFor(() => {
      expect(
        screen.getByText(/Đã tạo ánh xạ SKU Lazada/i)
      ).toBeInTheDocument()
    })

    // Navigate to Conflicts tab and resolve open SKU_UNMAPPED conflict
    fireEvent.click(screen.getByText("Xung đột đồng bộ"))
    expect(screen.getByText("CNF-000004")).toBeInTheDocument()
    expect(
      screen.getByText("Chưa liên kết hàng hóa (Chưa khớp SKU)")
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText("Xử lý & Ánh xạ"))
    fireEvent.click(screen.getByText("Xác nhận xử lý"))

    await waitFor(() => {
      expect(
        screen.getByText(/Đã xử lý xung đột, tạo ánh xạ SKU/i)
      ).toBeInTheDocument()
    })
  })

  it("displays Lazada channel badges and external order codes in OrderTable", () => {
    renderWithQueryClient(<OrderTable />)
    expect(screen.getByText(/LZD-5088776655/i)).toBeInTheDocument()
    expect(screen.getAllByText("Lazada").length).toBeGreaterThan(0)
  })
})
