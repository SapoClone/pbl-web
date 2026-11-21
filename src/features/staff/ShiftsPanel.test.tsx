import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as branchesApi from "@/api/platform/branches"
import * as membersApi from "@/api/platform/members"
import * as schedulesApi from "@/api/platform/staff-schedules"
import type { Member } from "@/api/platform/members"
import type { StaffSchedule } from "@/api/platform/staff-schedules"
import { ShiftsPanel } from "./ShiftsPanel"

vi.mock("@/api/platform/branches", () => ({ listBranches: vi.fn() }))
vi.mock("@/api/platform/members", () => ({ listMembers: vi.fn() }))
vi.mock("@/api/platform/staff-schedules", () => ({
  listStaffSchedules: vi.fn(),
  getOnDuty: vi.fn(),
  createStaffSchedule: vi.fn(),
  updateStaffSchedule: vi.fn(),
  deleteStaffSchedule: vi.fn()
}))

const branch = (id: string, name: string) => ({ id, name, code: id, address: null, phone: null, isWarehouse: false, status: "active" as const, createdAt: "2026-11-01T00:00:00Z" })

const member = (accountId: string, name: string, branchIds: string[] = []): Member => ({
  accountId,
  email: `${accountId}@example.com`,
  name,
  role: "sales_staff",
  code: accountId,
  status: "active",
  phone: null,
  createdAt: "2026-11-01T00:00:00Z",
  roleId: "role",
  roleName: "Nhân viên bán hàng",
  roleCode: "sales_staff",
  branchIds,
  isOwner: false,
  lastLoginAt: null,
  isOnShift: false,
  scheduleLabel: null
})

const shift = (over: Partial<StaffSchedule> & Pick<StaffSchedule, "id" | "accountId" | "staffName" | "weekday" | "startTime" | "endTime">): StaffSchedule => ({
  branchId: "b1",
  branchName: "Quận 1",
  name: null,
  duty: "sales",
  note: null,
  ...over
})

const shifts: StaffSchedule[] = [
  shift({ id: "s1", accountId: "an", staffName: "An", weekday: 1, startTime: "08:00", endTime: "16:00", duty: "cashier", name: "Ca sáng" }),
  shift({ id: "s2", accountId: "an", staffName: "An", weekday: 3, startTime: "08:00", endTime: "12:00", duty: "shift_lead" }),
  shift({ id: "s3", accountId: "binh", staffName: "Bình", weekday: 1, startTime: "13:00", endTime: "21:00", duty: "warehouse" })
]

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ShiftsPanel />
    </QueryClientProvider>
  )
}

const cellOf = (rowName: string, dayShort: string) => {
  const row = screen.getByRole("rowheader", { name: new RegExp(rowName) }).closest("tr") as HTMLElement
  const headers = screen.getAllByRole("columnheader")
  const index = headers.findIndex((header) => header.textContent?.startsWith(dayShort))
  return within(row).getAllByRole("cell")[index - 1]
}

describe("Shift management", () => {
  beforeEach(() => {
    vi.mocked(branchesApi.listBranches).mockResolvedValue({ data: [branch("b1", "Quận 1"), branch("b2", "Quận 3")] } as never)
    vi.mocked(membersApi.listMembers).mockResolvedValue([member("an", "An"), member("binh", "Bình", ["b1"]), member("chi", "Chi", ["b2"])])
    vi.mocked(schedulesApi.listStaffSchedules).mockImplementation(async (filter) =>
      filter?.accountId ? shifts.filter((item) => item.accountId === filter.accountId) : shifts
    )
    vi.mocked(schedulesApi.getOnDuty).mockResolvedValue({ at: "2026-11-23T02:00:00.000Z", data: [shifts[0], shifts[2]] })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("puts each shift under its weekday, with the duty and the time range", async () => {
    renderPanel()
    const monday = await waitFor(() => cellOf("An", "T2"))
    expect(within(monday).getByText("08:00–16:00")).toBeTruthy()
    expect(within(monday).getByText(/Ca sáng · Thu ngân/)).toBeTruthy()
    expect(within(cellOf("An", "T4")).getByText(/Trưởng ca/)).toBeTruthy()
    expect(within(cellOf("An", "T3")).queryByText(/–/)).toBeNull()
    expect(within(cellOf("Bình", "T2")).getByText(/Kho/)).toBeTruthy()
  })

  it("only lists people who can work in the chosen branch, and totals their hours", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    expect(screen.getByRole("rowheader", { name: /Bình/ })).toBeTruthy()
    expect(screen.queryByRole("rowheader", { name: /Chi/ })).toBeNull()
    expect(screen.getByRole("rowheader", { name: /12 giờ\/tuần/ })).toBeTruthy()
  })

  it("shows who is on duty now", async () => {
    renderPanel()
    const bar = await screen.findByRole("region", { name: "Đang trực" })
    await waitFor(() => expect(within(bar).getByText(/Đang trực lúc/)).toBeTruthy())
    expect(within(bar).getByText("An")).toBeTruthy()
    expect(within(bar).getByText(/Kho · 13:00–21:00/)).toBeTruthy()
  })

  it("asks the API for the chosen duty only", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.change(screen.getByLabelText("Lọc theo phụ trách"), { target: { value: "cashier" } })
    await waitFor(() => expect(schedulesApi.listStaffSchedules).toHaveBeenCalledWith({ branchId: "b1", duty: "cashier" }))
  })

  it("adds a shift for a person on Monday to Friday by default", async () => {
    vi.mocked(schedulesApi.createStaffSchedule).mockResolvedValue([])
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: /Thêm ca$/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Nhân viên"), { target: { value: "binh" } })
    fireEvent.change(within(dialog).getByLabelText("Phụ trách"), { target: { value: "delivery" } })
    fireEvent.change(within(dialog).getByLabelText("Tên ca"), { target: { value: "Ca giao" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Thêm ca" }))
    await waitFor(() =>
      expect(schedulesApi.createStaffSchedule).toHaveBeenCalledWith({
        accountId: "binh",
        branchId: "b1",
        weekdays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "16:00",
        duty: "delivery",
        name: "Ca giao"
      })
    )
  })

  it("starts from the person and day of the cell that was clicked", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: "Thêm ca cho Bình Thứ sáu" }))
    const dialog = await screen.findByRole("dialog")
    expect((within(dialog).getByLabelText("Nhân viên") as HTMLSelectElement).value).toBe("binh")
    expect((within(dialog).getByLabelText("Thứ sáu") as HTMLInputElement).checked).toBe(true)
    expect((within(dialog).getByLabelText("Thứ hai") as HTMLInputElement).checked).toBe(false)
  })

  it("will not send a shift that ends before it starts", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: /Thêm ca$/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Giờ kết thúc"), { target: { value: "07:00" } })
    expect(within(dialog).getByText(/Giờ kết thúc phải sau giờ bắt đầu/)).toBeTruthy()
    expect((within(dialog).getByRole("button", { name: "Thêm ca" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("warns about an overlap with the person's other shifts before the server does", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: "Thêm ca cho An Thứ hai" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Giờ bắt đầu"), { target: { value: "15:00" } })
    fireEvent.change(within(dialog).getByLabelText("Giờ kết thúc"), { target: { value: "18:00" } })
    const status = await within(dialog).findByRole("status")
    expect(status.textContent).toContain("T2 08:00–16:00")
  })

  it("edits the times and the duty of a shift", async () => {
    vi.mocked(schedulesApi.updateStaffSchedule).mockResolvedValue(shifts[0])
    renderPanel()
    fireEvent.click(await screen.findByRole("button", { name: /Sửa ca An Thứ hai 08:00–16:00 Thu ngân/ }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByLabelText("Nhân viên")).toBeNull()
    fireEvent.change(within(dialog).getByLabelText("Giờ kết thúc"), { target: { value: "17:00" } })
    fireEvent.change(within(dialog).getByLabelText("Phụ trách"), { target: { value: "shift_lead" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }))
    await waitFor(() =>
      expect(schedulesApi.updateStaffSchedule).toHaveBeenCalledWith("s1", {
        startTime: "08:00",
        endTime: "17:00",
        name: "Ca sáng",
        duty: "shift_lead",
        note: null
      })
    )
  })

  it("does not flag the shift being edited as its own overlap", async () => {
    renderPanel()
    fireEvent.click(await screen.findByRole("button", { name: /Sửa ca An Thứ hai/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Giờ bắt đầu"), { target: { value: "09:00" } })
    await waitFor(() => expect(schedulesApi.listStaffSchedules).toHaveBeenCalledWith({ accountId: "an" }))
    expect(within(dialog).queryByRole("status")).toBeNull()
  })

  it("deletes a shift after a confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.mocked(schedulesApi.deleteStaffSchedule).mockResolvedValue(undefined)
    renderPanel()
    fireEvent.click(await screen.findByRole("button", { name: /Sửa ca Bình Thứ hai/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /Xóa ca/ }))
    await waitFor(() => expect(schedulesApi.deleteStaffSchedule).toHaveBeenCalledWith("s3"))
  })

  it("explains an overlap the server refused", async () => {
    vi.mocked(schedulesApi.createStaffSchedule).mockRejectedValue({ response: { data: { errorCode: "S001" } } })
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: "Thêm ca cho Bình Thứ tư" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Thêm ca" }))
    expect((await within(dialog).findByRole("alert")).textContent).toContain("trùng giờ")
  })

  it("closes the dialog with Escape", async () => {
    renderPanel()
    await screen.findByRole("rowheader", { name: /An/ })
    fireEvent.click(screen.getByRole("button", { name: /Thêm ca$/ }))
    await screen.findByRole("dialog")
    fireEvent.keyDown(window, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
