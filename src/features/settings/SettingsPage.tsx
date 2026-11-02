import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Plus, Store, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type Branch,
  type CreateBranchInput
} from "@/api/platform/branches"
import {
  getCurrentTenant,
  updateCurrentTenant,
  type UpdateTenantInput
} from "@/api/platform/tenant"

const initialForm: CreateBranchInput = {
  name: "",
  code: "",
  address: "",
  phone: "",
  isWarehouse: true
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const tenantInputClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState(initialForm)
  const [tenantForm, setTenantForm] = useState<UpdateTenantInput>({})
  const [error, setError] = useState("")

  const tenantQuery = useQuery({
    queryKey: ["current-tenant"],
    queryFn: getCurrentTenant
  })
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches
  })
  const tenantMutation = useMutation({
    mutationFn: updateCurrentTenant,
    onSuccess: async (tenant) => {
      setTenantForm({
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address
      })
      setError("")
      await queryClient.invalidateQueries({ queryKey: ["current-tenant"] })
    },
    onError: () => setError("Không thể cập nhật thông tin cửa hàng. Hãy kiểm tra dữ liệu và quyền tài khoản.")
  })
  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: async () => {
      setForm(initialForm)
      setShowForm(false)
      setError("")
      await queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
    onError: () => setError("Không thể tạo chi nhánh. Hãy kiểm tra mã chi nhánh và quyền tài khoản.")
  })
  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateBranchInput }) =>
      updateBranch(id, input),
    onSuccess: async () => {
      setForm(initialForm)
      setEditingBranch(null)
      setShowForm(false)
      setError("")
      await queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
    onError: () => setError("Không thể cập nhật chi nhánh. Hãy kiểm tra dữ liệu và quyền tài khoản.")
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      updateBranch(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] })
  })
  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
    onError: () => setError("Không thể xóa chi nhánh cuối cùng hoặc chi nhánh đang được sử dụng.")
  })

  const tenant = tenantQuery.data
  const tenantValues = {
    name: tenantForm.name ?? tenant?.name ?? "",
    phone: tenantForm.phone ?? tenant?.phone ?? "",
    email: tenantForm.email ?? tenant?.email ?? "",
    address: tenantForm.address ?? tenant?.address ?? ""
  }
  const branches = branchesQuery.data?.data ?? []

  const submitTenant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    tenantMutation.mutate({
      name: tenantValues.name.trim(),
      phone: tenantValues.phone.trim() || null,
      email: tenantValues.email.trim() || null,
      address: tenantValues.address.trim() || null
    })
  }

  const submitBranch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    const input = {
      ...form,
      code: form.code.trim().toUpperCase(),
      address: form.address?.trim() || undefined,
      phone: form.phone?.trim() || undefined
    }
    if (editingBranch) {
      editMutation.mutate({ id: editingBranch.id, input })
    } else {
      createMutation.mutate(input)
    }
  }

  const openCreateForm = () => {
    setForm(initialForm)
    setEditingBranch(null)
    setError("")
    setShowForm(true)
  }

  const openEditForm = (branch: Branch) => {
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      isWarehouse: branch.isWarehouse
    })
    setEditingBranch(branch)
    setError("")
    setShowForm(true)
  }

  const closeBranchForm = () => {
    if (createMutation.isPending || editMutation.isPending) return
    setShowForm(false)
    setEditingBranch(null)
    setError("")
  }

  return (
    <main className="mx-auto max-w-[1480px] py-8">
      <div className="mb-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#16866f]">Hệ thống / Cài đặt</p>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#163d36]">Cài đặt cửa hàng</h1>
        <p className="mt-2 text-sm text-slate-500">Quản lý thông tin cửa hàng và các chi nhánh thuộc cửa hàng hiện tại.</p>
      </div>

      <section className="mb-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]">
            <Store size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-800">Thông tin cửa hàng</h2>
            <p className="mt-1 text-xs text-slate-500">Cập nhật thông tin hiển thị của cửa hàng.</p>
          </div>
        </div>
        {tenantQuery.isLoading ? (
          <p className="py-6 text-sm text-slate-500">Đang tải thông tin cửa hàng...</p>
        ) : tenantQuery.isError ? (
          <p className="py-3 text-sm text-red-600">Không thể tải thông tin cửa hàng.</p>
        ) : tenant ? (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitTenant}>
            <label className="text-xs font-semibold text-slate-700">
              Tên cửa hàng
              <input className={`${tenantInputClassName} mt-2`} value={tenantValues.name} onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })} required maxLength={150} />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Mã cửa hàng
              <input className={`${tenantInputClassName} mt-2 bg-slate-50 text-slate-500`} value={tenant.subdomain} readOnly />
              <span className="mt-1 block font-normal text-slate-400">Mã cửa hàng không thể thay đổi.</span>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Số điện thoại
              <input className={`${tenantInputClassName} mt-2`} value={tenantValues.phone} onChange={(event) => setTenantForm({ ...tenantForm, phone: event.target.value })} pattern="\+?[0-9]{8,15}" placeholder="+84901234567" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Email cửa hàng
              <input className={`${tenantInputClassName} mt-2`} type="email" value={tenantValues.email} onChange={(event) => setTenantForm({ ...tenantForm, email: event.target.value })} />
            </label>
            <label className="text-xs font-semibold text-slate-700 md:col-span-2">
              Địa chỉ
              <input className={`${tenantInputClassName} mt-2`} value={tenantValues.address} onChange={(event) => setTenantForm({ ...tenantForm, address: event.target.value })} maxLength={255} />
            </label>
            <div className="flex items-center justify-between md:col-span-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${tenant.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {tenant.status === "active" ? "Đang hoạt động" : tenant.status}
              </span>
              <Button type="submit" className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]" disabled={tenantMutation.isPending}>
                <Check size={16} /> {tenantMutation.isPending ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#163d36]">Chi nhánh</h2>
          <p className="mt-1 text-sm text-slate-500">Tạo và quản lý các điểm bán thuộc cửa hàng.</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]">
          <Plus size={17} /> Thêm chi nhánh
        </Button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-16 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-branch-title"
        >
          <form
            onSubmit={submitBranch}
            className="w-full max-w-xl rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 id="create-branch-title" className="text-lg font-semibold text-[#163d36]">
                  {editingBranch ? "Sửa chi nhánh" : "Thêm chi nhánh"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Nhập thông tin cho điểm bán mới.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBranchForm}
                aria-label="Đóng"
                disabled={createMutation.isPending || editMutation.isPending}
              >
                <X size={19} className="text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Tên chi nhánh
                <input className={`${inputClassName} mt-2`} placeholder="Chi nhánh trung tâm" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={150} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Mã chi nhánh
                <input className={`${inputClassName} mt-2`} placeholder="CN02" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required maxLength={20} pattern="[A-Za-z0-9_-]+" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Địa chỉ
                <input className={`${inputClassName} mt-2`} placeholder="Địa chỉ (không bắt buộc)" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Số điện thoại
                <input className={`${inputClassName} mt-2`} placeholder="+84901234567" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} pattern="\+?[0-9]{8,15}" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                <input type="checkbox" checked={form.isWarehouse} onChange={(event) => setForm({ ...form, isWarehouse: event.target.checked })} />
                Dùng làm kho
              </label>
            </div>
            {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeBranchForm} disabled={createMutation.isPending || editMutation.isPending}>
                Hủy
              </Button>
              <Button type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]" disabled={createMutation.isPending || editMutation.isPending}>
                {createMutation.isPending || editMutation.isPending
                  ? "Đang lưu..."
                  : editingBranch
                    ? "Lưu thay đổi"
                    : "Tạo chi nhánh"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-700">Danh sách chi nhánh</div>
        {branchesQuery.isLoading ? <p className="p-10 text-center text-sm text-slate-500">Đang tải...</p> : branchesQuery.isError ? <p className="p-10 text-center text-sm text-red-600">Không thể tải danh sách chi nhánh.</p> : branches.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Chưa có chi nhánh.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Chi nhánh</th><th className="px-5 py-3">Địa chỉ</th><th className="px-5 py-3">Số điện thoại</th><th className="px-5 py-3">Kho</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><span className="flex items-center gap-3"><Building2 size={18} className="text-[#16866f]" /><span><b className="block text-slate-800">{branch.name}</b><span className="text-xs text-slate-400">{branch.code}</span></span></span></td>
                    <td className="px-5 py-4 text-slate-500">{branch.address || "Chưa cập nhật"}</td>
                    <td className="px-5 py-4 text-slate-500">{branch.phone || "Chưa cập nhật"}</td>
                    <td className="px-5 py-4 text-slate-500">{branch.isWarehouse ? "Có" : "Không"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${branch.status === "active" ? "bg-[#e6f5ee] text-[#147853]" : "bg-slate-100 text-slate-500"}`}>{branch.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</span></td>
                    <td className="px-5 py-4"><Button variant="ghost" size="sm" onClick={() => openEditForm(branch)}>Sửa</Button><Button variant="ghost" size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: branch.id, status: branch.status === "active" ? "inactive" : "active" })}>{branch.status === "active" ? "Ngừng hoạt động" : "Kích hoạt"}</Button><Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" disabled={deleteMutation.isPending} onClick={() => window.confirm(`Xóa chi nhánh ${branch.name}?`) && deleteMutation.mutate(branch.id)}><Trash2 size={16} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && !showForm && <p className="border-t border-slate-100 p-4 text-sm text-red-600">{error}</p>}
      </section>
    </main>
  )
}
