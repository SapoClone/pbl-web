import { useMemo, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
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
  type MemberStatus,
  type MemberSummary
} from "@/api/platform/members"
import { listRoles, type Role } from "@/api/platform/roles"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { RolesPanel } from "./RolesPanel"
import { ShiftsPanel } from "./ShiftsPanel"

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

const roleLabels: Record<string, string> = {
  owner: "Chủ cửa hàng",
  branch_manager: "Quản lý chi nhánh",
  sales_staff: "Nhân viên bán hàng",
  warehouse_staff: "Nhân viên kho",
  accountant: "Kế toán"
}

const DEMO_STAFF_BRANCHES = [
  { id: "branch-q1", name: "Chi nhánh Quận 1 - Flagship" },
  { id: "branch-tanbinh", name: "Kho Tổng Tân Bình" }
]

const DEMO_MEMBERS: Member[] = [
  {
    accountId: "acc-owner-01",
    email: "owner@omnichannel-pbl6.vn",
    name: "Nguyễn Văn An",
    role: "owner",
    code: "NV001",
    status: "active",
    phone: "0901234567",
    createdAt: "2026-01-01T00:00:00Z",
    roleId: "role-owner",
    roleName: "Chủ cửa hàng",
    roleCode: "owner",
    branchIds: [],
    isOwner: true,
    lastLoginAt: "2026-03-22T08:30:00Z",
    isOnShift: true,
    scheduleLabel: "Toàn thời gian"
  },
  {
    accountId: "acc-mgr-02",
    email: "bich.tran@omnichannel-pbl6.vn",
    name: "Trần Thị Bích",
    role: "branch_manager",
    code: "NV002",
    status: "active",
    phone: "0902345678",
    createdAt: "2026-01-10T00:00:00Z",
    roleId: "role-manager",
    roleName: "Quản lý chi nhánh",
    roleCode: "branch_manager",
    branchIds: ["branch-q1"],
    isOwner: false,
    lastLoginAt: "2026-03-22T08:15:00Z",
    isOnShift: true,
    scheduleLabel: "Ca sáng (08:00 - 16:00)"
  },
  {
    accountId: "acc-sales-03",
    email: "nam.le@omnichannel-pbl6.vn",
    name: "Lê Hoàng Nam",
    role: "sales_staff",
    code: "NV003",
    status: "active",
    phone: "0903456789",
    createdAt: "2026-02-01T00:00:00Z",
    roleId: "role-sales",
    roleName: "Nhân viên bán hàng",
    roleCode: "sales_staff",
    branchIds: ["branch-q1"],
    isOwner: false,
    lastLoginAt: "2026-03-22T08:45:00Z",
    isOnShift: true,
    scheduleLabel: "Ca sáng (08:00 - 16:00)"
  },
  {
    accountId: "acc-wh-04",
    email: "tuan.pham@omnichannel-pbl6.vn",
    name: "Phạm Minh Tuấn",
    role: "warehouse_staff",
    code: "NV004",
    status: "active",
    phone: "0904567890",
    createdAt: "2026-02-15T00:00:00Z",
    roleId: "role-warehouse",
    roleName: "Nhân viên kho",
    roleCode: "warehouse_staff",
    branchIds: ["branch-tanbinh"],
    isOwner: false,
    lastLoginAt: "2026-03-21T17:00:00Z",
    isOnShift: false,
    scheduleLabel: "Ca chiều (14:00 - 22:00)"
  },
  {
    accountId: "acc-acc-05",
    email: "mai.vu@omnichannel-pbl6.vn",
    name: "Vũ Thị Mai",
    role: "accountant",
    code: "NV005",
    status: "active",
    phone: "0905678901",
    createdAt: "2026-03-01T00:00:00Z",
    roleId: "role-accountant",
    roleName: "Kế toán",
    roleCode: "accountant",
    branchIds: [],
    isOwner: false,
    lastLoginAt: "2026-03-22T08:00:00Z",
    isOnShift: false,
    scheduleLabel: "Hành chính"
  }
]

const DEMO_SUMMARY: MemberSummary = {
  total: 5,
  active: 5,
  locked: 0,
  onShift: 3,
  onShiftByBranch: [
    { branchId: "branch-q1", branchName: "Chi nhánh Quận 1", count: 2 },
    { branchId: "branch-tanbinh", branchName: "Kho Tổng Tân Bình", count: 1 }
  ],
  defaultRoleCount: 4,
  dataScope: "ALL"
}

const DEMO_ROLES: Role[] = [
  { id: "role-manager", name: "Quản lý chi nhánh", code: "branch_manager", key: "branch_manager", description: "Toàn quyền quản lý doanh thu, kho và nhân sự tại chi nhánh phụ trách", isSeeded: true, isOwner: false, memberCount: 1, permissionCount: 18 },
  { id: "role-sales", name: "Nhân viên bán hàng", code: "sales_staff", key: "sales_staff", description: "Bán hàng POS, xem đơn hàng và quản lý khách hàng", isSeeded: true, isOwner: false, memberCount: 1, permissionCount: 10 },
  { id: "role-warehouse", name: "Nhân viên kho", code: "warehouse_staff", key: "warehouse_staff", description: "Nhập, xuất, chuyển và kiểm kê tồn kho", isSeeded: true, isOwner: false, memberCount: 1, permissionCount: 12 },
  { id: "role-accountant", name: "Kế toán", code: "accountant", key: "accountant", description: "Theo dõi doanh thu, công nợ và báo cáo tài chính", isSeeded: true, isOwner: false, memberCount: 1, permissionCount: 14 }
]

type StaffTab = "members" | "roles" | "shifts"

const staffTabs: Array<{ id: StaffTab; label: string }> = [
  { id: "members", label: "Nhân viên" },
  { id: "roles", label: "Vai trò & phân quyền" },
  { id: "shifts", label: "Ca làm việc" }
]

export function StaffPage() {
  const requestedTab = useRouterState({ select: (state) => new URLSearchParams(state.location.searchStr).get("tab") })
  const navigate = useNavigate()
  const tab: StaffTab = requestedTab === "roles" || requestedTab === "shifts" ? requestedTab : "members"
  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <div role="tablist" aria-label="Nhân viên và quyền" className="mb-6 flex gap-1 border-b border-slate-200">
        {staffTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => void navigate({ to: "/staff", search: { tab: item.id } as never })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === item.id ? "border-[#16866f] text-[#16866f]" : "border-transparent text-slate-500 hover:text-[#163d36]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "roles" ? <RolesPanel /> : tab === "shifts" ? <ShiftsPanel /> : <MembersPanel />}
    </main>
  )
}

function MembersPanel() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all")
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState("")
  const [branchIds, setBranchIds] = useState<string[]>([])
  const [demoMembers, setDemoMembers] = useState<Member[]>(DEMO_MEMBERS)
  const [error, setError] = useState("")

  const membersQuery = useQuery({
    queryKey: ["members", statusFilter],
    queryFn: () => listMembers(statusFilter === "all" ? undefined : { status: statusFilter }),
    enabled: !isDemo
  })
  const summaryQuery = useQuery({
    queryKey: ["members-summary"],
    queryFn: getMemberSummary,
    enabled: !isDemo
  })
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: !isDemo })
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches, enabled: !isDemo })

  const invalidateMembers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["members"] }),
      queryClient.invalidateQueries({ queryKey: ["members-summary"] })
    ])
  }
  const addMutation = useMutation({
    mutationFn: async (input: { email: string; roleId: string; branchIds: string[] }) => {
      if (isDemo) {
        const selectedRole = DEMO_ROLES.find((r) => r.id === input.roleId)
        const newMember: Member = {
          accountId: `acc-demo-${Date.now()}`,
          email: input.email,
          name: input.email.split("@")[0],
          role: selectedRole?.code ?? "sales_staff",
          code: `NV00${demoMembers.length + 1}`,
          status: "active",
          phone: null,
          createdAt: new Date().toISOString(),
          roleId: input.roleId,
          roleName: selectedRole?.name ?? "Nhân viên",
          roleCode: selectedRole?.code ?? "sales_staff",
          branchIds: input.branchIds,
          isOwner: false,
          lastLoginAt: null,
          isOnShift: false,
          scheduleLabel: "Toàn thời gian"
        }
        setDemoMembers((prev) => [newMember, ...prev])
        return newMember
      }
      return addMember(input)
    },
    onSuccess: async () => {
      closeForm()
      if (!isDemo) await invalidateMembers()
    },
    onError: () => setError("Không thể thêm nhân viên. Tài khoản phải đăng ký trước và bạn cần quyền phù hợp.")
  })
  const editMutation = useMutation({
    mutationFn: async ({ accountId, roleId: nextRoleId, branchIds: nextBranchIds }: { accountId: string; roleId: string; branchIds: string[] }) => {
      if (isDemo) {
        const selectedRole = DEMO_ROLES.find((r) => r.id === nextRoleId)
        setDemoMembers((prev) =>
          prev.map((m) =>
            m.accountId === accountId
              ? {
                  ...m,
                  roleId: nextRoleId,
                  roleName: selectedRole?.name ?? m.roleName,
                  roleCode: selectedRole?.code ?? m.roleCode,
                  branchIds: nextBranchIds
                }
              : m
          )
        )
        return
      }
      return changeMemberRole(accountId, { roleId: nextRoleId, branchIds: nextBranchIds })
    },
    onSuccess: async () => {
      closeForm()
      if (!isDemo) await invalidateMembers()
    },
    onError: () => setError("Không thể cập nhật vai trò hoặc phạm vi chi nhánh.")
  })
  const statusMutation = useMutation({
    mutationFn: async ({ accountId, status }: { accountId: string; status: MemberStatus }) => {
      if (isDemo) {
        setDemoMembers((prev) =>
          prev.map((m) => (m.accountId === accountId ? { ...m, status } : m))
        )
        return
      }
      return status === "locked" ? lockMember(accountId) : unlockMember(accountId)
    },
    onSuccess: () => !isDemo && invalidateMembers(),
    onError: () => setError("Không thể thay đổi trạng thái nhân viên.")
  })
  const removeMutation = useMutation({
    mutationFn: async (accountId: string) => {
      if (isDemo) {
        setDemoMembers((prev) => prev.filter((m) => m.accountId !== accountId))
        return
      }
      return removeMember(accountId)
    },
    onSuccess: () => !isDemo && invalidateMembers(),
    onError: () => setError("Không thể xóa nhân viên. Không thể xóa chủ cửa hàng hoặc tài khoản hiện tại.")
  })

  const rawMembers = isDemo || membersQuery.isError ? demoMembers : membersQuery.data ?? []
  const members = useMemo(() => {
    if (statusFilter === "all") return rawMembers
    return rawMembers.filter((m) => m.status === statusFilter)
  }, [rawMembers, statusFilter])

  const roles = isDemo || rolesQuery.isError ? DEMO_ROLES : (rolesQuery.data ?? []).filter((role) => !role.isOwner)
  const branches: Array<{ id: string; name: string }> = isDemo || branchesQuery.isError ? DEMO_STAFF_BRANCHES : (branchesQuery.data?.data ?? [])
  const summary = isDemo || summaryQuery.isError ? DEMO_SUMMARY : summaryQuery.data
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
    <div>
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
        <Summary label="Tổng thành viên" value={summary?.total ?? members.length} />
        <Summary label="Đang hoạt động" value={summary?.active ?? members.filter((m) => m.status === "active").length} />
        <Summary label="Đang khóa" value={summary?.locked ?? members.filter((m) => m.status === "locked").length} />
        <Summary label="Đang làm việc" value={summary?.onShift ?? 0} />
      </div>

      {membersQuery.isError && !isDemo && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải danh sách thành viên.</p>}
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
              <fieldset><legend className="text-xs font-medium text-slate-600">Phạm vi chi nhánh <span className="font-normal text-slate-400">(bỏ chọn tất cả để áp dụng mọi chi nhánh)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{branches.map((branch: { id: string; name: string }) => <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm text-slate-600"><input type="checkbox" checked={branchIds.includes(branch.id)} onChange={(event) => setBranchIds((current) => event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} />{branch.name}</label>)}</div></fieldset>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>Hủy</Button><Button type="submit" disabled={isSaving || rolesQuery.isLoading} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{isSaving ? "Đang lưu..." : editingMember ? "Lưu thay đổi" : "Thêm nhân viên"}</Button></div>
          </form>
        </div>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
