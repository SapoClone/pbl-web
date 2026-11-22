import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as rolesApi from "@/api/platform/roles"
import type { PermissionCatalog, Role, RoleDetail } from "@/api/platform/roles"
import { fakeAccessToken } from "@/test/jwt"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { RolesPanel } from "./RolesPanel"

vi.mock("@/api/platform/roles", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/platform/roles")>()
  return {
    ...original,
    listRoles: vi.fn(),
    getPermissionCatalog: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn()
  }
})

const pair = (module: string, action: string, isApplicable = true) => ({ code: `${module}.${action}`, module, action, isApplicable })

const catalog: PermissionCatalog = {
  modules: [
    { code: "products", label: "Sản phẩm", actions: ["view", "create", "update", "delete"] },
    { code: "reports", label: "Báo cáo", actions: ["view"] }
  ],
  actions: ["view", "create", "update", "delete"],
  permissions: [
    pair("products", "view"),
    pair("products", "create"),
    pair("products", "update"),
    pair("products", "delete"),
    pair("reports", "view"),
    pair("reports", "create", false),
    pair("reports", "update", false),
    pair("reports", "delete", false)
  ],
  defaults: [{ key: "sales_staff", name: "Nhân viên bán hàng", permissions: ["products.view"] }]
}

const role = (over: Partial<Role> & Pick<Role, "id" | "name">): Role => ({
  code: over.id,
  key: null,
  description: null,
  isSeeded: false,
  isOwner: false,
  memberCount: 0,
  permissionCount: 0,
  ...over
})

const roles: Role[] = [
  role({ id: "r-owner", name: "Chủ cửa hàng", key: "owner", isSeeded: true, isOwner: true, memberCount: 1, permissionCount: 5 }),
  role({ id: "r-sales", name: "Nhân viên bán hàng", key: "sales_staff", isSeeded: true, memberCount: 3, permissionCount: 1 }),
  role({ id: "r-cashier", name: "Thu ngân", memberCount: 0, permissionCount: 1 }),
  role({ id: "r-stock", name: "Kiểm kho", memberCount: 2, permissionCount: 1 })
]

const details: Record<string, string[]> = {
  "r-owner": ["products.view", "products.create", "products.update", "products.delete", "reports.view"],
  "r-sales": ["products.view"],
  "r-cashier": ["products.view"],
  "r-stock": ["products.view"]
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RolesPanel />
    </QueryClientProvider>
  )
}

const detailOf = (id: string, permissions = details[id]): RoleDetail => ({
  ...(roles.find((item) => item.id === id) as Role),
  permissions
})

async function openRole(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }))
}

describe("Roles and permission matrix", () => {
  beforeEach(() => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue(roles)
    vi.mocked(rolesApi.getPermissionCatalog).mockResolvedValue(catalog)
    vi.mocked(rolesApi.getRole).mockImplementation(async (id) => detailOf(id))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useStoreAuth.setState({ tokens: null })
  })

  const signInWith = (perms: string[]) =>
    useStoreAuth.setState({
      tokens: { userId: "u", accessToken: fakeAccessToken({ perms }), refreshToken: "r", tokenExpires: Date.now() + 3600_000, tenantId: "t", tenants: [] }
    })

  it("is read-only for a member who may view staff but not change it", async () => {
    signInWith(["staff.view"])
    renderPanel()
    await openRole("Thu ngân")
    const cell = (await screen.findByLabelText("Sản phẩm: Xem")) as HTMLInputElement
    expect(cell.disabled).toBe(true)
    expect((screen.getByLabelText("Tên vai trò") as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByRole("button", { name: /Thêm vai trò/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Xóa vai trò/ })).toBeNull()
    expect(screen.getByText(/chỉ có quyền xem vai trò/)).toBeTruthy()
  })

  it("lets a member with staff.update edit", async () => {
    signInWith(["staff.view", "staff.update"])
    renderPanel()
    await openRole("Thu ngân")
    expect(((await screen.findByLabelText("Sản phẩm: Xem")) as HTMLInputElement).disabled).toBe(false)
    expect(screen.getByRole("button", { name: /Thêm vai trò/ })).toBeTruthy()
  })

  it("lists the roles with their kind and counts, and shows the owner read-only with every permission", async () => {
    renderPanel()
    expect(await screen.findByText("Chủ cửa hàng", { selector: "h2" })).toBeTruthy()
    const list = screen.getByRole("navigation", { name: "Danh sách vai trò" })
    expect(within(list).getByText("Mặc định")).toBeTruthy()
    expect(within(list).getAllByText("Tùy chỉnh")).toHaveLength(2)
    expect(within(list).getByText("2 nhân viên")).toBeTruthy()
    const cell = await screen.findByLabelText("Sản phẩm: Xem")
    expect((cell as HTMLInputElement).checked).toBe(true)
    expect((cell as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull()
    expect(screen.getByText("Chỉ xem")).toBeTruthy()
  })

  it("shows a dash where a function has no such action", async () => {
    renderPanel()
    await screen.findByLabelText("Báo cáo: Xem")
    expect(screen.queryByLabelText("Báo cáo: Tạo")).toBeNull()
    expect(screen.getAllByLabelText("Không áp dụng").length).toBeGreaterThanOrEqual(3)
  })

  it("saves the whole permission set of a custom role in a stable order", async () => {
    vi.mocked(rolesApi.updateRole).mockImplementation(async (id, body) => ({ ...detailOf(id), ...body, permissions: body.permissions ?? [] }) as RoleDetail)
    renderPanel()
    await openRole("Thu ngân")
    const create = await screen.findByLabelText("Sản phẩm: Tạo")
    expect((create as HTMLInputElement).checked).toBe(false)
    const save = screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.click(create)
    expect(save.disabled).toBe(false)
    expect(screen.getByText(/thêm 1 quyền, bỏ 0 quyền/)).toBeTruthy()
    fireEvent.click(save)
    await waitFor(() =>
      expect(rolesApi.updateRole).toHaveBeenCalledWith("r-cashier", {
        name: "Thu ngân",
        description: null,
        permissions: ["products.create", "products.view"]
      })
    )
    await waitFor(() => expect((screen.getByRole("button", { name: "Lưu thay đổi" }) as HTMLButtonElement).disabled).toBe(true))
  })

  it("turns a whole row on with the row checkbox", async () => {
    renderPanel()
    await openRole("Thu ngân")
    await screen.findByLabelText("Sản phẩm: Xem")
    fireEvent.click(screen.getByLabelText("Chọn cả hàng Sản phẩm"))
    for (const action of ["Xem", "Tạo", "Sửa", "Xóa"]) {
      expect((screen.getByLabelText(`Sản phẩm: ${action}`) as HTMLInputElement).checked).toBe(true)
    }
  })

  it("undoes unsaved changes", async () => {
    renderPanel()
    await openRole("Thu ngân")
    const create = (await screen.findByLabelText("Sản phẩm: Tạo")) as HTMLInputElement
    fireEvent.click(create)
    expect(create.checked).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tác" }))
    expect(create.checked).toBe(false)
  })

  it("restores the defaults of a seeded role into the draft without saving", async () => {
    renderPanel()
    await openRole("Nhân viên bán hàng")
    const create = (await screen.findByLabelText("Sản phẩm: Tạo")) as HTMLInputElement
    fireEvent.click(create)
    fireEvent.click(screen.getByRole("button", { name: "Về mặc định" }))
    expect(create.checked).toBe(false)
    expect(rolesApi.updateRole).not.toHaveBeenCalled()
  })

  it("never offers to delete a default role or a role that still has members", async () => {
    renderPanel()
    await openRole("Nhân viên bán hàng")
    await screen.findByLabelText("Sản phẩm: Xem")
    expect(screen.queryByRole("button", { name: /Xóa vai trò/ })).toBeNull()
    await openRole("Kiểm kho")
    await screen.findByLabelText("Sản phẩm: Xem")
    expect((screen.getByRole("button", { name: /Xóa vai trò/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("deletes an unused custom role after a confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.mocked(rolesApi.deleteRole).mockResolvedValue(undefined)
    renderPanel()
    await openRole("Thu ngân")
    await screen.findByLabelText("Sản phẩm: Xem")
    fireEvent.click(screen.getByRole("button", { name: /Xóa vai trò/ }))
    await waitFor(() => expect(rolesApi.deleteRole).toHaveBeenCalledWith("r-cashier"))
  })

  it("does not delete when the confirmation is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    renderPanel()
    await openRole("Thu ngân")
    await screen.findByLabelText("Sản phẩm: Xem")
    fireEvent.click(screen.getByRole("button", { name: /Xóa vai trò/ }))
    expect(rolesApi.deleteRole).not.toHaveBeenCalled()
  })

  it("explains a name that is already taken", async () => {
    vi.mocked(rolesApi.updateRole).mockRejectedValue({ response: { data: { errorCode: "R001" } } })
    renderPanel()
    await openRole("Thu ngân")
    fireEvent.click(await screen.findByLabelText("Sản phẩm: Tạo"))
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }))
    expect((await screen.findByRole("alert")).textContent).toContain("Tên vai trò đã tồn tại")
  })

  it("creates a role, optionally starting from the permissions of another one", async () => {
    vi.mocked(rolesApi.createRole).mockImplementation(async (body) => ({ ...detailOf("r-cashier"), id: "r-new", name: body.name, permissions: body.permissions }))
    renderPanel()
    fireEvent.click(await screen.findByRole("button", { name: /Thêm vai trò/ }))
    const create = screen.getByRole("button", { name: "Tạo vai trò" }) as HTMLButtonElement
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("Tên vai trò"), { target: { value: "Trực quầy" } })
    fireEvent.change(screen.getByLabelText("Sao chép quyền từ vai trò"), { target: { value: "r-sales" } })
    await waitFor(() => expect((screen.getByLabelText("Sản phẩm: Xem") as HTMLInputElement).checked).toBe(true))
    fireEvent.click(create)
    await waitFor(() =>
      expect(rolesApi.createRole).toHaveBeenCalledWith({ name: "Trực quầy", description: null, permissions: ["products.view"] })
    )
  })

  it("asks before leaving unsaved changes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderPanel()
    await openRole("Thu ngân")
    fireEvent.click(await screen.findByLabelText("Sản phẩm: Tạo"))
    fireEvent.click(screen.getByRole("button", { name: /Kiểm kho/ }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByText("Thu ngân", { selector: "h2" })).toBeTruthy()
  })
})
