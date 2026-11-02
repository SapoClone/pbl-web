import { useMemo, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LockKeyhole, Mail, Plus, Search, ShieldCheck, Unlock, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listBranches } from "@/api/platform/branches"
import {
  addMember,
  changeMemberRole,
  getMemberSummary,
  listMembers,
  lockMember,
  removeMember,
  unlockMember,
  type Member,
  type MemberStatus
} from "@/api/platform/members"
import { listRoles, type Role } from "@/api/platform/roles"

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

const roleLabels: Record<string, string> = {
  owner: "Chủ cửa hàng",
  branch_manager: "Quản lý chi nhánh",
  sales_staff: "Nhân viên bán hàng",
  warehouse_staff: "Nhân viên kho",
  accountant: "Kế toán"
}

export function StaffPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all")
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState("")
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [error, setError] = useState("")

  const membersQuery = useQuery({
    queryKey: ["members", statusFilter],
    queryFn: () => listMembers(statusFilter === "all" ? undefined : { status: statusFilter })
  })
  const summaryQuery = useQuery({
    queryKey: ["members-summary"],
    queryFn: getMemberSummary
  })
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles })
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches })

  const invalidateMembers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["members"] }),
      queryClient.invalidateQueries({ queryKey: ["members-summary"] })
    ])
  }
  const addMutation = useMutation({
    mutationFn: addMember,
    onSuccess: async () => {
      closeForm()
      await invalidateMembers()
    },
    onError: () => setError("Không thể thêm nhân viên. Tài khoản phải đăng ký trước và bạn cần quyền phù hợp.")
  })
  const editMutation = useMutation({
    mutationFn: ({ accountId, roleId: nextRoleId, branchIds: nextBranchIds }: { accountId: string; roleId: string; branchIds: string[] }) =>
      changeMemberRole(accountId, { roleId: nextRoleId, branchIds: nextBranchIds }),
    onSuccess: async () => {
      closeForm()
      await invalidateMembers()
    },
    onError: () => setError("Không thể cập nhật vai trò hoặc phạm vi chi nhánh.")
  })
  const statusMutation = useMutation({
    mutationFn: ({ accountId, status }: { accountId: string; status: MemberStatus }) =>
      status === "locked" ? lockMember(accountId) : unlockMember(accountId),
    onSuccess: invalidateMembers,
    onError: () => setError("Không thể thay đổi trạng thái nhân viên.")
  })
  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: invalidateMembers,
    onError: () => setError("Không thể xóa nhân viên. Không thể xóa chủ cửa hàng hoặc tài khoản hiện tại.")
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const roles = (rolesQuery.data ?? []).filter((role) => !role.isOwner)
  const branches = branchesQuery.data?.data ?? []
  const filteredMembers = useMemo(
    () => members.filter((member) =>
      `${member.name} ${member.email} ${member.code} ${member.roleName}`.toLowerCase().includes(search.toLowerCase())
    ),
    [members, search]
  )

  function closeForm() {
    setShowForm(false)
    setEditingMember(null)
    setEmail("")
    setRoleId("")
    setBranchIds([])
    setError("")
  }

  function openCreateForm() {
    setEditingMember(null)
    setEmail("")
    setRoleId(roles[0]?.id ?? "")
    setBranchIds([])
    setError("")
    setShowForm(true)
  }

  function openEditForm(member: Member) {
    setEditingMember(member)
    setRoleId(member.roleId)
    setBranchIds(member.branchIds)
    setError("")
    setShowForm(true)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!roleId) {
      setError("Vui lòng chọn vai trò.")
      return
    }
    if (editingMember) {
      editMutation.mutate({ accountId: editingMember.accountId, roleId, branchIds })
    } else {
      addMutation.mutate({
        email: email.trim().toLowerCase(),
        roleId,
        branchIds
      })
    }
  }

  const isSaving = addMutation.isPending || editMutation.isPending

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quản trị / Nhân sự</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Nhân viên & Quyền</h1>
          <p className="mt-2 text-sm text-slate-500">Quản lý thành viên, vai trò và phạm vi chi nhánh theo quyền API.</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]">
          <Plus size={17} /> Thêm nhân viên
        </Button>
      </header>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Summary label="Tổng thành viên" value={summaryQuery.data?.total ?? members.length} />
        <Summary label="Đang hoạt động" value={summaryQuery.data?.active ?? 0} />
        <Summary label="Đang khóa" value={summaryQuery.data?.locked ?? 0} />
        <Summary label="Đang làm việc" value={summaryQuery.data?.onShift ?? 0} />
      </div>

      {membersQuery.isError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải danh sách thành viên.</p>}
      {error && !showForm && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, mã nhân viên..." className="w-full outline-none" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MemberStatus | "all")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đang khóa</option>
          </select>
        </div>
        {membersQuery.isLoading ? (
          <p className="p-10 text-center text-sm text-slate-500">Đang tải...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400">
                <tr>{["Nhân viên", "Email", "Vai trò", "Chi nhánh", "Trạng thái", "Thao tác"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => (
                  <tr key={member.accountId} className="hover:bg-slate-50">
                    <td className="px-5 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f5ee] text-[#16866f]"><UserRound size={17} /></span><span><b className="block font-medium text-[#163d36]">{member.name}</b><span className="text-xs text-slate-400">{member.code}</span></span></span></td>
                    <td className="px-5 py-4 text-slate-600"><Mail className="mr-1 inline text-slate-400" size={14} />{member.email}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{member.roleName || roleLabels[member.roleCode] || member.roleCode}</span></td>
                    <td className="px-5 py-4 text-slate-500">{member.branchIds.length ? `${member.branchIds.length} chi nhánh` : "Tất cả chi nhánh"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${member.status === "active" ? "bg-[#e6f5ee] text-[#147853]" : "bg-red-50 text-red-600"}`}>{member.status === "active" ? "Đang hoạt động" : "Đang khóa"}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {!member.isOwner && <><Button variant="ghost" size="sm" onClick={() => openEditForm(member)}>Sửa quyền</Button><Button variant="ghost" size="icon" title={member.status === "active" ? "Khóa nhân viên" : "Mở khóa nhân viên"} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ accountId: member.accountId, status: member.status === "active" ? "locked" : "active" })}>{member.status === "active" ? <LockKeyhole size={16} /> : <Unlock size={16} />}</Button><Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" disabled={removeMutation.isPending} onClick={() => window.confirm(`Xóa ${member.name} khỏi cửa hàng?`) && removeMutation.mutate(member.accountId)}>Xóa</Button></>}
                      {member.isOwner && <span className="text-xs text-slate-400">Chủ cửa hàng</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredMembers.length && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy nhân viên.</p>}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-16 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3"><ShieldCheck className="text-[#16866f]" size={22} /><div><h2 className="font-semibold text-[#163d36]">{editingMember ? "Sửa quyền nhân viên" : "Thêm nhân viên"}</h2><p className="mt-1 text-xs text-slate-400">{editingMember ? "Cập nhật vai trò và phạm vi chi nhánh." : "Tài khoản phải được đăng ký trước trên hệ thống."}</p></div></div>
              <button type="button" onClick={closeForm} disabled={isSaving} aria-label="Đóng"><X size={19} className="text-slate-400" /></button>
            </div>
            <div className="grid gap-4 p-6">
              {!editingMember && <label className="text-xs font-medium text-slate-600">Email tài khoản<input required type="email" className={`${inputClass} mt-2`} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nhanvien@example.com" /></label>}
              <label className="text-xs font-medium text-slate-600">Vai trò<select required className={`${inputClass} mt-2`} value={roleId} onChange={(event) => setRoleId(event.target.value)}><option value="" disabled>Chọn vai trò</option>{roles.map((role: Role) => <option key={role.id} value={role.id}>{role.name} ({role.permissionCount} quyền)</option>)}</select></label>
              <fieldset><legend className="text-xs font-medium text-slate-600">Phạm vi chi nhánh <span className="font-normal text-slate-400">(bỏ chọn tất cả để áp dụng mọi chi nhánh)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{branches.map((branch) => <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm text-slate-600"><input type="checkbox" checked={branchIds.includes(branch.id)} onChange={(event) => setBranchIds((current) => event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} />{branch.name}</label>)}</div></fieldset>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>Hủy</Button><Button type="submit" disabled={isSaving || rolesQuery.isLoading} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{isSaving ? "Đang lưu..." : editingMember ? "Lưu thay đổi" : "Thêm nhân viên"}</Button></div>
          </form>
        </div>
      )}
    </main>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
