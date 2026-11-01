import { useState, type FormEvent } from "react"
import { FileRoute, redirect } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type CreateBranchInput
} from "@/api/platform/branches"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export const Route = new FileRoute("/settings").createRoute({
  beforeLoad: () => {
    if (!useStoreAuth.getState().tokens?.accessToken) throw redirect({ to: "/login" })
  },
  component: SettingsPage
})

const initialForm: CreateBranchInput = {
  name: "",
  code: "",
  address: "",
  phone: "",
  isWarehouse: true
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

function SettingsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    createMutation.mutate({
      ...form,
      code: form.code.trim().toUpperCase(),
      address: form.address?.trim() || undefined,
      phone: form.phone?.trim() || undefined
    })
  }

  const branches = branchesQuery.data?.data ?? []

  return (
    <main className="mx-auto max-w-[1480px] py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#16866f]">Hệ thống / Cài đặt</p>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#163d36]">Chi nhánh</h1>
          <p className="mt-2 text-sm text-slate-500">Tạo và quản lý các chi nhánh thuộc cửa hàng hiện tại.</p>
        </div>
        <Button onClick={() => setShowForm((visible) => !visible)} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]">
          <Plus size={17} /> Thêm chi nhánh
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <input className={inputClassName} placeholder="Tên chi nhánh" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={150} />
          <input className={inputClassName} placeholder="Mã chi nhánh (VD: CN02)" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required maxLength={20} pattern="[A-Za-z0-9_-]+" />
          <input className={inputClassName} placeholder="Địa chỉ (không bắt buộc)" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          <input className={inputClassName} placeholder="Số điện thoại (không bắt buộc)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} pattern="\+?[0-9]{8,15}" />
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.isWarehouse} onChange={(event) => setForm({ ...form, isWarehouse: event.target.checked })} /> Dùng làm kho mặc định</label>
          <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Đang tạo..." : "Tạo chi nhánh"}</Button>
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 text-sm font-semibold text-slate-700">Danh sách chi nhánh</div>
        {branchesQuery.isLoading ? <p className="p-10 text-center text-sm text-slate-500">Đang tải...</p> : branchesQuery.isError ? <p className="p-10 text-center text-sm text-red-600">Không thể tải danh sách chi nhánh.</p> : branches.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Chưa có chi nhánh.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Chi nhánh</th><th className="px-5 py-3">Địa chỉ</th><th className="px-5 py-3">Kho</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><span className="flex items-center gap-3"><Building2 size={18} className="text-[#16866f]" /><span><b className="block text-slate-800">{branch.name}</b><span className="text-xs text-slate-400">{branch.code}</span></span></span></td>
                    <td className="px-5 py-4 text-slate-500">{branch.address || "Chưa cập nhật"}{branch.phone && <span className="block text-xs text-slate-400">{branch.phone}</span>}</td>
                    <td className="px-5 py-4 text-slate-500">{branch.isWarehouse ? "Có" : "Không"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${branch.status === "active" ? "bg-[#e6f5ee] text-[#147853]" : "bg-slate-100 text-slate-500"}`}>{branch.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</span></td>
                    <td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: branch.id, status: branch.status === "active" ? "inactive" : "active" })}>{branch.status === "active" ? "Ngừng hoạt động" : "Kích hoạt"}</Button><Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" disabled={deleteMutation.isPending} onClick={() => window.confirm(`Xóa chi nhánh ${branch.name}?`) && deleteMutation.mutate(branch.id)}><Trash2 size={16} /></Button></td>
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
