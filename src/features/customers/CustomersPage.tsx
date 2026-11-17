import { useMemo, useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileUp, GitMerge, Mail, MapPin, Pencil, Phone, Plus, Search, ShoppingBag, Tags, Trash2, UserRound, X } from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { getCustomerHealth } from "@/api/customer/health"
import {
  addCustomerAddress,
  createCustomer,
  deactivateCustomer,
  getCustomer,
  getCustomerSummary,
  listCustomers,
  removeCustomerAddress,
  updateCustomer,
  updateCustomerAddress,
  type Customer,
  type CustomerDraft
} from "@/api/customer/customers"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { CustomerDetailsDialog, CustomerDuplicatesDialog, CustomerImportDialog, CustomerSegmentsDialog, downloadBlob } from "./CustomerAdvanced"
import { exportCustomersCsv, listCustomerGroups, listCustomerTags } from "@/api/customer/advanced"

const PAGE_SIZE = 100
const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const emptyDraft: CustomerDraft = { name: "", phone: "", email: "", address: "", birthday: "", note: "" }

const demoCustomers: Customer[] = [
  { id: "demo-cus-1", code: "KH000001", name: "Nguyễn Minh Anh", phone: "0901234567", email: "minhanh@example.com", dateOfBirth: "1995-04-12", note: "Khách hàng thân thiết", source: "STORE", group: { id: "demo-member", code: "MEMBER", name: "Thành viên" }, orderCount: 8, totalSpent: 3400000, loyaltyPoints: 210, status: "ACTIVE", version: 1, createdAt: "2026-10-12" },
  { id: "demo-cus-2", code: "KH000002", name: "Trần Hoàng Nam", phone: "0912345678", email: "hoangnam@example.com", dateOfBirth: null, note: null, source: "STORE", group: { id: "demo-retail", code: "RETAIL", name: "Khách lẻ" }, orderCount: 2, totalSpent: 780000, loyaltyPoints: 35, status: "ACTIVE", version: 1, createdAt: "2026-10-18" },
  { id: "demo-cus-3", code: "KH000003", name: "Lê Thu Hà", phone: "0987654321", email: "thuha@example.com", dateOfBirth: "1990-08-20", note: "Ưu tiên giao giờ hành chính", source: "STORE", group: { id: "demo-vip", code: "VIP", name: "VIP" }, orderCount: 15, totalSpent: 12650000, loyaltyPoints: 860, status: "ACTIVE", version: 1, createdAt: "2026-10-21" }
]

function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Không thể thực hiện thao tác."
  const data = error.response?.data as { message?: string | string[]; errorCode?: string } | undefined
  return (Array.isArray(data?.message) ? data.message.join(" ") : data?.message) || data?.errorCode || "Không thể thực hiện thao tác."
}

const toDraft = (customer: Customer): CustomerDraft => ({
  name: customer.name,
  phone: customer.phone ?? "",
  email: customer.email ?? "",
  address: customer.addresses?.find((address) => address.isDefault)?.addressLine ?? customer.addresses?.[0]?.addressLine ?? "",
  birthday: (customer.dateOfBirth ?? customer.dob ?? "").slice(0, 10),
  note: customer.note ?? ""
})

export function CustomersPage() {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [demoData, setDemoData] = useState(demoCustomers)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [groupFilter, setGroupFilter] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSegments, setShowSegments] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const healthQuery = useQuery({ queryKey: ["customer-health"], queryFn: getCustomerHealth, enabled: !isDemo, retry: false })
  const customersQuery = useQuery({
    queryKey: ["customers", search, page, groupFilter, tagFilter],
    queryFn: () => listCustomers({ q: search.trim() || undefined, page, limit: PAGE_SIZE, group: groupFilter || undefined, tagId: tagFilter || undefined }),
    enabled: !isDemo
  })
  const summaryQuery = useQuery({ queryKey: ["customers-summary"], queryFn: getCustomerSummary, enabled: !isDemo })
  const groupsQuery = useQuery({ queryKey: ["customer-groups"], queryFn: listCustomerGroups, enabled: !isDemo })
  const tagsQuery = useQuery({ queryKey: ["customer-tags"], queryFn: listCustomerTags, enabled: !isDemo })

  const customers = useMemo(() => {
    if (!isDemo) return customersQuery.data?.items ?? []
    const normalizedSearch = search.trim().toLowerCase()
    return demoData.filter((customer) => `${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLowerCase().includes(normalizedSearch))
  }, [customersQuery.data?.items, demoData, isDemo, search])
  const selected = isDemo ? demoData.find((customer) => customer.id === selectedId) ?? null : null

  const invalidateCustomers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["customers-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-detail"] })
    ])
  }

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setError("")
    setShowForm(true)
  }

  const openEdit = async (customer: Customer) => {
    setError("")
    try {
      const detail = isDemo ? customer : await getCustomer(customer.id)
      setEditing(detail)
      setDraft(toDraft(detail))
      setShowForm(true)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!draft.name.trim() || !/^\+?[0-9]{8,15}$/.test(draft.phone.trim())) {
      setError("Vui lòng nhập tên và số điện thoại hợp lệ (8–15 chữ số).")
      return
    }

    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      dateOfBirth: draft.birthday || null,
      note: draft.note.trim() || null
    }
    setSaving(true)
    try {
      if (isDemo) {
        if (editing) {
          setDemoData((current) => current.map((customer) => customer.id === editing.id
            ? { ...customer, ...payload, phone: payload.phone, email: payload.email, dateOfBirth: payload.dateOfBirth }
            : customer))
        } else {
          setDemoData((current) => [{ ...payload, id: `demo-cus-${Date.now()}`, code: `KH${String(current.length + 1).padStart(6, "0")}`, status: "ACTIVE", version: 1, createdAt: new Date().toISOString() }, ...current])
        }
      } else if (editing) {
        const updatedCustomer = await updateCustomer(editing.id, { ...payload, version: editing.version })
        setEditing(updatedCustomer)
        const existingAddress = editing.addresses?.find((address) => address.isDefault) ?? editing.addresses?.[0]
        const nextAddress = draft.address.trim()
        if (existingAddress && nextAddress && existingAddress.addressLine !== nextAddress) {
          await updateCustomerAddress(editing.id, existingAddress.id, { addressLine: nextAddress })
        } else if (existingAddress && !nextAddress) {
          await removeCustomerAddress(editing.id, existingAddress.id)
        } else if (!existingAddress && nextAddress) {
          await addCustomerAddress(editing.id, { recipientName: payload.name, phone: payload.phone ?? undefined, addressLine: nextAddress, isDefault: true })
        }
        await invalidateCustomers()
      } else {
        await createCustomer({ ...payload, ...(draft.address.trim() ? { initialAddress: { addressLine: draft.address.trim() } } : {}) })
        await invalidateCustomers()
      }
      setShowForm(false)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (customer: Customer) => {
    if (!window.confirm(`Ngừng hoạt động khách hàng ${customer.name}?`)) return
    setError("")
    try {
      if (isDemo) setDemoData((current) => current.filter((item) => item.id !== customer.id))
      else {
        await deactivateCustomer(customer.id)
        await invalidateCustomers()
      }
      if (selectedId === customer.id) setSelectedId(null)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const summary = summaryQuery.data
  const connectionLabel = isDemo ? "Dữ liệu demo" : customersQuery.isError
    ? "Không tải được dữ liệu khách hàng"
    : healthQuery.data ? "Customer service hoạt động" : "Đang kết nối API"

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quan hệ / Khách hàng</p><h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Khách hàng</h1><p className="mt-2 text-sm text-slate-500">Quản lý hồ sơ và thông tin liên hệ khách hàng.</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-2 text-xs ${isDemo || (healthQuery.data && !customersQuery.isError) ? "bg-[#e6f5ee] text-[#147853]" : "bg-amber-50 text-amber-700"}`}>{connectionLabel}</span><Button onClick={openCreate} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={17} /> Thêm khách hàng</Button></div>
      </header>

      {!isDemo && <div className="mb-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowSegments(true)} className="gap-2"><Tags size={15} /> Nhóm & thẻ</Button><Button type="button" variant="outline" onClick={() => setShowDuplicates(true)} className="gap-2"><GitMerge size={15} /> Hồ sơ trùng</Button><Button type="button" variant="outline" onClick={() => void exportCustomersCsv({ q: search.trim() || undefined, group: groupFilter || undefined, tagId: tagFilter || undefined }).then((blob) => downloadBlob(blob, "danh-sach-khach-hang.csv")).catch((e: unknown) => setError(errorMessage(e)))} className="gap-2"><Download size={15} /> Xuất CSV</Button><Button type="button" variant="outline" onClick={() => setShowImport(true)} className="gap-2"><FileUp size={15} /> Nhập CSV</Button></div>}

      {(error || customersQuery.isError) && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || errorMessage(customersQuery.error)}</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Tổng khách hàng" value={summary?.total ?? (isDemo ? demoData.length : customersQuery.data?.total ?? 0)} />
        <SummaryCard label="Khách mới tháng này" value={summary?.newThisMonth ?? 0} />
        <SummaryCard label="Thành viên" value={summary?.members ?? 0} />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        {!isDemo && <div className="flex flex-wrap gap-3 border-b border-slate-100 px-4 py-3"><select aria-label="Lọc theo nhóm khách" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={groupFilter} onChange={(event) => { setGroupFilter(event.target.value); setPage(1) }}><option value="">Tất cả nhóm</option>{(groupsQuery.data ?? []).map((group) => <option key={group.id} value={group.code.toLowerCase()}>{group.name}</option>)}</select><select aria-label="Lọc theo thẻ khách" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={tagFilter} onChange={(event) => { setTagFilter(event.target.value); setPage(1) }}><option value="">Tất cả thẻ</option>{(tagsQuery.data ?? []).map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></div>}
        <div className="border-b border-slate-100 p-4"><div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm tên, số điện thoại, email..." className="w-full outline-none placeholder:text-slate-400" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr>{["Khách hàng", "Liên hệ", "Nhóm", "Đơn hàng", "Ngày sinh", "Thao tác"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
          {customers.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-5 py-4"><button type="button" onClick={() => setSelectedId(customer.id)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f5ee] font-semibold text-[#16866f]">{customer.name.slice(0, 1)}</span><span><b className="block font-medium text-[#163d36]">{customer.name}</b><span className="text-xs text-slate-400">Mã: {customer.code}</span></span></button></td><td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><Phone size={13} />{customer.phone ?? customer.phoneMasked ?? "Chưa cập nhật"}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Mail size={13} />{customer.email || "Chưa cập nhật"}</span></td><td className="px-5 py-4 text-slate-500">{customer.group?.name ?? "Khách lẻ"}</td><td className="px-5 py-4 text-slate-500">{customer.orderCount ?? 0}</td><td className="px-5 py-4 text-slate-500">{(customer.dateOfBirth ?? customer.dob) ? new Date(`${(customer.dateOfBirth ?? customer.dob)?.slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</td><td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${customer.name}`} onClick={() => void openEdit(customer)} className="text-slate-400 hover:text-[#16866f]"><Pencil size={16} /></Button><Button variant="ghost" size="icon" title="Ngừng hoạt động" aria-label={`Ngừng hoạt động ${customer.name}`} onClick={() => void remove(customer)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button></td></tr>)}
        </tbody></table>
        {customersQuery.isLoading && !isDemo && <p className="p-10 text-center text-sm text-slate-500">Đang tải danh sách khách hàng...</p>}
        {!customersQuery.isLoading && customers.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy khách hàng phù hợp.</p>}
        {!isDemo && (customersQuery.data?.pagination.totalPages ?? 0) > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-500">Trang {customersQuery.data?.pagination.currentPage} / {customersQuery.data?.pagination.totalPages} · {customersQuery.data?.total} khách hàng</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1 || customersQuery.isFetching} onClick={() => setPage((current) => current - 1)}>Trước</Button><Button type="button" variant="outline" size="sm" disabled={page >= (customersQuery.data?.pagination.totalPages ?? 1) || customersQuery.isFetching} onClick={() => setPage((current) => current + 1)}>Sau</Button></div></div>}
        </div>
      </section>

      {showForm && <CustomerForm draft={draft} editing={Boolean(editing)} error={error} saving={saving} onChange={setDraft} onSubmit={submit} onClose={() => setShowForm(false)} />}
      {selectedId && (isDemo ? <CustomerDetails customer={selected} loading={false} error="" onClose={() => setSelectedId(null)} onEdit={() => { setSelectedId(null); if (selected) void openEdit(selected) }} /> : <CustomerDetailsDialog customerId={selectedId} isDemo={false} onClose={() => setSelectedId(null)} />)}
      {showSegments && <CustomerSegmentsDialog onClose={() => setShowSegments(false)} />}
      {showImport && <CustomerImportDialog onClose={() => setShowImport(false)} onImported={() => { void invalidateCustomers() }} />}
      {showDuplicates && <CustomerDuplicatesDialog onClose={() => setShowDuplicates(false)} onMerged={() => { setShowDuplicates(false); void invalidateCustomers() }} />}
    </main>
  )
}

function CustomerForm({ draft, editing, error, saving, onChange, onSubmit, onClose }: { draft: CustomerDraft; editing: boolean; error: string; saving: boolean; onChange: (draft: CustomerDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const update = (key: keyof CustomerDraft, value: string) => onChange({ ...draft, [key]: value })
  return <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-12 backdrop-blur-sm"><form onSubmit={onSubmit} className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-semibold text-[#163d36]">{editing ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}</h2><p className="mt-1 text-xs text-slate-400">Số điện thoại là thông tin định danh trong cửa hàng.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={19} className="text-slate-400" /></button></div><div className="grid gap-4 p-6 md:grid-cols-2"><label className="text-xs font-medium text-slate-600">Họ và tên *<input required className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label className="text-xs font-medium text-slate-600">Số điện thoại *<input required className={inputClass} value={draft.phone} onChange={(event) => update("phone", event.target.value)} pattern="\+?[0-9]{8,15}" /></label><label className="text-xs font-medium text-slate-600">Email<input type="email" className={inputClass} value={draft.email} onChange={(event) => update("email", event.target.value)} /></label><label className="text-xs font-medium text-slate-600">Ngày sinh<input type="date" className={inputClass} value={draft.birthday} onChange={(event) => update("birthday", event.target.value)} /></label><label className="text-xs font-medium text-slate-600 md:col-span-2">Địa chỉ<input className={inputClass} value={draft.address} onChange={(event) => update("address", event.target.value)} /></label><label className="text-xs font-medium text-slate-600 md:col-span-2">Ghi chú<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f]" value={draft.note} onChange={(event) => update("note", event.target.value)} /></label></div>{error && <p role="alert" className="px-6 pb-2 text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" disabled={saving} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Lưu khách hàng"}</Button></div></form></div>
}

function CustomerDetails({ customer, loading, error, onClose, onEdit }: { customer: Customer | null; loading: boolean; error: string; onClose: () => void; onEdit: () => void }) {
  const [tab, setTab] = useState<"overview" | "orders" | "loyalty">("overview")
  const address = customer?.addresses?.find((item) => item.isDefault) ?? customer?.addresses?.[0]
  const displayAddress = address ? [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(", ") : "Chưa cập nhật địa chỉ"
  const birthday = (customer?.dateOfBirth ?? customer?.dob)?.slice(0, 10)
  const created = customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString("vi-VN") : "—"

  return <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#e9f7f1] via-[#f5fbf8] to-white px-6 pb-5 pt-6 sm:px-8">
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-[#16866f]/[0.06]" />
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"><X size={19} /></button>
        <div className="relative flex items-center gap-4 pr-10">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-[#16866f] shadow-sm ring-1 ring-[#16866f]/10">{customer?.name.slice(0, 1) ?? "?"}</span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#16866f]">Hồ sơ khách hàng</p><h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-[#163d36]">{customer?.name ?? "Chi tiết khách hàng"}</h2><div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{customer?.code ?? ""}</span>{customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{customer.status === "ACTIVE" ? "Đang hoạt động" : customer.status}</span>}<span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">{customer?.group?.name ?? "Khách lẻ"}</span></div></div>
        </div>
        {loading && <p className="relative mt-5 text-sm text-slate-500">Đang tải hồ sơ...</p>}
        {error && <p role="alert" className="relative mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
      {customer && !loading && !error && <>
        <div className="grid grid-cols-3 gap-3 px-6 pt-5 sm:px-8"><Metric label="Đơn hàng" value={(customer.orderCount ?? 0).toLocaleString("vi-VN")} /><Metric label="Tổng chi tiêu" value={`${(customer.totalSpent ?? 0).toLocaleString("vi-VN")} ₫`} /><Metric label="Điểm tích lũy" value={(customer.loyaltyPoints ?? 0).toLocaleString("vi-VN")} /></div>
        <nav className="mt-6 flex gap-5 border-b border-slate-100 px-6 sm:px-8">{([["overview", "Tổng quan"], ["orders", "Đơn hàng"], ["loyalty", "Tích điểm"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`border-b-2 pb-3 text-sm font-medium transition ${tab === id ? "border-[#16866f] text-[#16866f]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>)}</nav>
        <div className="min-h-[230px] px-6 py-5 sm:px-8">
          {tab === "overview" && <div className="grid gap-4 md:grid-cols-2"><InfoTile icon={<Phone size={16} />} label="Số điện thoại" value={customer.phone ?? customer.phoneMasked ?? "Chưa cập nhật"} /><InfoTile icon={<Mail size={16} />} label="Email" value={customer.email || "Chưa cập nhật"} /><InfoTile icon={<MapPin size={16} />} label="Địa chỉ" value={displayAddress} /><InfoTile icon={<UserRound size={16} />} label="Ngày sinh" value={birthday ? new Date(`${birthday}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa cập nhật"} /><div className="rounded-xl bg-slate-50 p-4 md:col-span-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Ghi chú</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{customer.note || "Chưa có ghi chú cho khách hàng này."}</p></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 md:col-span-2"><span>Khách hàng từ {created}</span><span>Nguồn: {customer.source ?? "Cửa hàng"}</span></div></div>}
          {tab === "orders" && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#16866f] shadow-sm"><ShoppingBag size={19} /></span><h3 className="mt-3 text-sm font-semibold text-slate-700">{customer.orderCount ? `${customer.orderCount} đơn hàng đã ghi nhận` : "Chưa có đơn hàng"}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{customer.orderCount ? "Dữ liệu đơn hàng chi tiết sẽ hiển thị trong hồ sơ khi có kết nối API thật." : "Đơn hàng của khách sẽ xuất hiện tại đây khi được gắn với hồ sơ."}</p><span className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">Dữ liệu xem trước</span></div>}
          {tab === "loyalty" && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Metric label="Điểm hiện có" value={(customer.loyaltyPoints ?? 0).toLocaleString("vi-VN")} /><Metric label="Trạng thái thành viên" value={customer.group?.name ?? "Khách lẻ"} /></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-[#163d36]">Lịch sử điểm</p><p className="mt-1 text-xs text-slate-500">Các giao dịch tích và sử dụng điểm sẽ được tải từ Customer API khi đăng nhập bằng tài khoản backend.</p></div></div>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8"><Button type="button" variant="outline" onClick={onClose}>Đóng</Button><Button type="button" onClick={onEdit} className="bg-[#16866f] text-white hover:bg-[#0f705d]"><Pencil size={15} className="mr-2" />Chỉnh sửa hồ sơ</Button></footer>
      </>}
    </section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:px-4"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 truncate text-base font-semibold text-[#163d36] sm:text-lg">{value}</p></div>
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-w-0 gap-3 rounded-xl border border-slate-100 p-4"><span className="mt-0.5 text-slate-400">{icon}</span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 break-words text-sm leading-5 text-slate-700">{value}</p></div></div>
}
function SummaryCard({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value.toLocaleString("vi-VN")}</p></section>
}
