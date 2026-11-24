import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as branchesApi from "@/api/platform/branches"
import * as tenantApi from "@/api/platform/tenant"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { SettingsPage } from "./SettingsPage"

vi.mock("./SubscriptionPlans", () => ({ SubscriptionPlans: () => null }))
vi.mock("@/api/platform/branches", () => ({
  listBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  deleteBranch: vi.fn()
}))
vi.mock("@/api/platform/tenant", () => ({
  getCurrentTenant: vi.fn(),
  updateCurrentTenant: vi.fn()
}))

const httpError = (status: number, data: unknown) =>
  new AxiosError("failed", String(status), undefined, undefined, {
    status,
    data
  } as AxiosResponse)

const tenant = {
  id: "t1",
  name: "Cua hang",
  subdomain: "cua-hang",
  status: "active",
  phone: null,
  email: null,
  address: null,
  createdAt: "2026-01-01T00:00:00Z"
}

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SettingsPage />
    </QueryClientProvider>
  )
}

describe("SettingsPage errors", () => {
  beforeEach(() => {
    useStoreAuth.setState({
      tokens: { userId: "u1", accessToken: "t", refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t1", tenants: [] }
    })
    vi.mocked(tenantApi.getCurrentTenant).mockResolvedValue(tenant as never)
    vi.mocked(branchesApi.listBranches).mockResolvedValue({ data: [] } as never)
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("shows the plan-limit message when creating a branch is refused", async () => {
    const limit = "Gói Free chỉ cho phép tối đa 1 chi nhánh. Hãy nâng cấp gói để thêm."
    vi.mocked(branchesApi.createBranch).mockRejectedValue(httpError(409, { message: limit }))
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: /Thêm chi nhánh/ }))
    fireEvent.change(screen.getByPlaceholderText("Chi nhánh trung tâm"), { target: { value: "Q2" } })
    fireEvent.change(screen.getByPlaceholderText("CN02"), { target: { value: "CN02" } })
    fireEvent.click(screen.getByRole("button", { name: "Tạo chi nhánh" }))
    expect(await screen.findByText(limit)).toBeTruthy()
  })

  it("keeps the generic text when the answer has no message", async () => {
    vi.mocked(branchesApi.createBranch).mockRejectedValue(httpError(500, {}))
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: /Thêm chi nhánh/ }))
    fireEvent.change(screen.getByPlaceholderText("Chi nhánh trung tâm"), { target: { value: "Q2" } })
    fireEvent.change(screen.getByPlaceholderText("CN02"), { target: { value: "CN02" } })
    fireEvent.click(screen.getByRole("button", { name: "Tạo chi nhánh" }))
    expect(await screen.findByText(/Không thể tạo chi nhánh/)).toBeTruthy()
  })

  it("confirms the store save and shows a store save error on the store card", async () => {
    vi.mocked(tenantApi.updateCurrentTenant).mockResolvedValueOnce(tenant as never)
    renderPage()
    const save = await screen.findByRole("button", { name: /Lưu thông tin/ })
    fireEvent.click(save)
    expect(await screen.findByText("Đã lưu thông tin cửa hàng")).toBeTruthy()

    vi.mocked(tenantApi.updateCurrentTenant).mockRejectedValueOnce(
      httpError(400, { message: "Tên cửa hàng đã tồn tại." })
    )
    fireEvent.click(screen.getByRole("button", { name: /Lưu thông tin/ }))
    const message = await screen.findByText("Tên cửa hàng đã tồn tại.")
    expect(message.closest("form")).not.toBeNull()
    await waitFor(() => expect(screen.queryByText("Đã lưu thông tin cửa hàng")).toBeNull())
  })
})
