import { useMemo, useState, type FormEvent } from "react"
import { CheckCircle2, Mail, Plus, Search, ShieldCheck, UserRound } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  addMember,
  changeMemberRole,
  listMembers,
  type Member,
  type MemberRole
} from "@/api/platform/members"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const demoMembers: Member[] = [
  { accountId: "demo-admin", email: "admin@gmail.com", name: "Quản trị viên", role: "owner", createdAt: "2026-10-01" },
  { accountId: "demo-manager", email: "manager@example.com", name: "Quản lý cửa hàng", role: "manager", createdAt: "2026-10-05" },
  { accountId: "demo-cashier", email: "cashier@example.com", name: "Nhân viên bán hàng", role: "cashier", createdAt: "2026-10-12" }
]

const roleLabels: Record<MemberRole, string> = {
  owner: "Chủ cửa hàng",
  manager: "Quản lý",
  cashier: "Nhân viên bán hàng"
}

const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

export function StaffPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"manager" | "cashier">("cashier")
  const [error, setError] = useState("")
  const [demoRows, setDemoRows] = useState(demoMembers)
  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
    enabled: !isDemo
  })
  const rows = isDemo ? demoRows : membersQuery.data ?? []
  const filtered = useMemo(() => rows.filter((member) => `${member.name} ${member.email} ${roleLabels[member.role]}`.toLowerCase().includes(query.toLowerCase())), [query, rows])
  const addMutation = useMutation({
    mutationFn: addMember,
    onSuccess: async () => {
      setEmail("")
      setShowForm(false)
      setError("")
      await queryClient.invalidateQueries({ queryKey: ["members"] })
    },
    onError: () => setError("Không thể thêm nhân viên. Tài khoản phải đăng ký trước và bạn cần quyền chủ cửa hàng.")
  })
  const roleMutation = useMutation({
    mutationFn: ({ accountId, role: nextRole }: { accountId: string; role: "manager" | "cashier" }) => changeMemberRole(accountId, nextRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
    onError: () => setError("Không thể cập nhật vai trò của nhân viên.")
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập email hợp lệ.")
      return
    }
    if (isDemo) {
      setDemoRows((current) => [...current, { accountId: `demo-${Date.now()}`, email: email.trim().toLowerCase(), name: email.trim().split("@")[0], role, createdAt: new Date().toISOString() }])
      setEmail("")
      setShowForm(false)
      setError("")
      return
    }
    addMutation.mutate({ email: email.trim().toLowerCase(), role })
  }

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quản trị / Nhân sự</p><h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Nhân viên & Quyền</h1><p className="mt-2 text-sm text-slate-500">Quản lý thành viên, vai trò và quyền truy cập cửa hàng.</p></div>
        <Button onClick={() => { setShowForm(true); setError("") }} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={17} /> Thêm nhân viên</Button>
      </header>
      <div className="mb-5 grid gap-4 md:grid-cols-3"><Summary label="Tổng thành viên" value={rows.length} /><Summary label="Quản lý" value={rows.filter((member) => member.role === "manager").length} /><Summary label="Nhân viên bán hàng" value={rows.filter((member) => member.role === "cashier").length} /></div>
      {isDemo && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Đang sử dụng danh sách nhân viên demo vì pbl-api chưa chạy.</p>}
      {!isDemo && membersQuery.isError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải danh sách thành viên từ pbl-api.</p>}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="border-b border-slate-100 p-4"><div className="flex max-w-md items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email, vai trò..." className="w-full outline-none" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400"><tr>{["Nhân viên", "Email", "Vai trò", "Ngày tham gia", "Thao tác"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((member) => <tr key={member.accountId} className="hover:bg-slate-50"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f5ee] text-[#16866f]"><UserRound size={17} /></span><span><b className="block font-medium text-[#163d36]">{member.name}</b><span className="text-xs text-slate-400">{member.accountId}</span></span></span></td><td className="px-5 py-4 text-slate-600"><Mail className="mr-1 inline text-slate-400" size={14} />{member.email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${member.role === "owner" ? "bg-[#e6f5ee] text-[#147853]" : "bg-slate-100 text-slate-600"}`}>{roleLabels[member.role]}</span></td><td className="px-5 py-4 text-slate-500">{new Date(member.createdAt).toLocaleDateString("vi-VN")}</td><td className="px-5 py-4 text-right">{member.role === "owner" ? <span className="text-xs text-slate-400">Không thể đổi</span> : <select aria-label={`Vai trò của ${member.name}`} value={member.role} disabled={roleMutation.isPending} onChange={(event) => { const nextRole = event.target.value as "manager" | "cashier"; if (isDemo) setDemoRows((current) => current.map((item) => item.accountId === member.accountId ? { ...item, role: nextRole } : item)); else roleMutation.mutate({ accountId: member.accountId, role: nextRole }) }} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"><option value="manager">Quản lý</option><option value="cashier">Nhân viên bán hàng</option></select>}</td></tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy nhân viên.</p>}</div>
      </section>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {showForm && <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-20 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-center gap-3"><ShieldCheck className="text-[#16866f]" size={22} /><div><h2 className="font-semibold text-[#163d36]">Thêm nhân viên</h2><p className="mt-1 text-xs text-slate-400">Tài khoản phải được đăng ký trước trên hệ thống.</p></div></div><label className="mt-5 block text-xs font-medium text-slate-600">Email tài khoản<input required type="email" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nhanvien@example.com" /></label><label className="mt-4 block text-xs font-medium text-slate-600">Vai trò<select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as "manager" | "cashier")}><option value="cashier">Nhân viên bán hàng</option><option value="manager">Quản lý</option></select></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button><Button type="submit" disabled={addMutation.isPending} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{addMutation.isPending ? "Đang thêm..." : "Thêm nhân viên"}</Button></div></form></div>}
    </main>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
