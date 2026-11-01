import { useMemo, useState, type FormEvent } from "react"
import { Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, UserRound, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { getCustomerHealth } from "@/api/customer/health"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type Customer = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  birthday: string
  note: string
  createdAt: string
}

type CustomerDraft = Omit<Customer, "id" | "createdAt">

const initialCustomers: Customer[] = [
  { id: "cus-1", name: "Nguyễn Minh Anh", phone: "0901234567", email: "minhanh@example.com", address: "Hà Nội", birthday: "1995-04-12", note: "Khách hàng thân thiết", createdAt: "2026-10-12" },
  { id: "cus-2", name: "Trần Hoàng Nam", phone: "0912345678", email: "hoangnam@example.com", address: "Đà Nẵng", birthday: "", note: "", createdAt: "2026-10-18" },
  { id: "cus-3", name: "Lê Thu Hà", phone: "0987654321", email: "thuha@example.com", address: "TP. Hồ Chí Minh", birthday: "1990-08-20", note: "Ưu tiên giao giờ hành chính", createdAt: "2026-10-21" }
]

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

export function CustomersPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [customers, setCustomers] = useState(initialCustomers)
  const [query, setQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [error, setError] = useState("")
  const healthQuery = useQuery({ queryKey: ["customer-health"], queryFn: getCustomerHealth, enabled: !isDemo, retry: false })

  const filtered = useMemo(() => customers.filter((customer) =>
    `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase())
  ), [customers, query])

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setError("")
    setShowForm(true)
  }

  const openEdit = (customer: Customer) => {
    setEditing(customer)
    setDraft({ name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, birthday: customer.birthday, note: customer.note })
    setError("")
    setShowForm(true)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!draft.name.trim() || !/^\+?[0-9]{8,15}$/.test(draft.phone.trim())) {
      setError("Vui lòng nhập tên và số điện thoại hợp lệ (8-15 chữ số).")
      return
    }
    if (editing) {
      setCustomers((current) => current.map((customer) => customer.id === editing.id ? { ...editing, ...draft, name: draft.name.trim(), phone: draft.phone.trim() } : customer))
    } else {
      if (customers.some((customer) => customer.phone === draft.phone.trim())) {
        setError("Số điện thoại đã tồn tại trong danh sách khách hàng.")
        return
      }
      setCustomers((current) => [{ ...draft, id: `cus-${Date.now()}`, createdAt: new Date().toISOString() }, ...current])
    }
    setShowForm(false)
  }

  const remove = (customer: Customer) => {
    if (window.confirm(`Xóa khách hàng ${customer.name}?`)) {
      setCustomers((current) => current.filter((item) => item.id !== customer.id))
      if (selected?.id === customer.id) setSelected(null)
    }
  }

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quan hệ / Khách hàng</p><h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Khách hàng</h1><p className="mt-2 text-sm text-slate-500">Quản lý hồ sơ và thông tin liên hệ khách hàng.</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-2 text-xs ${isDemo || healthQuery.data ? "bg-[#e6f5ee] text-[#147853]" : "bg-amber-50 text-amber-700"}`}>{isDemo ? "Dữ liệu demo" : healthQuery.data ? "Customer service hoạt động" : "Chưa kết nối API"}</span><Button onClick={openCreate} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={17} /> Thêm khách hàng</Button></div>
      </header>

      <div className="mb-5 grid gap-4 md:grid-cols-3"><SummaryCard label="Tổng khách hàng" value={customers.length} /><SummaryCard label="Có email" value={customers.filter((customer) => customer.email).length} /><SummaryCard label="Có địa chỉ" value={customers.filter((customer) => customer.address).length} /></div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="border-b border-slate-100 p-4"><div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, số điện thoại, email..." className="w-full outline-none placeholder:text-slate-400" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr>{["Khách hàng", "Liên hệ", "Địa chỉ", "Ngày sinh", "Ghi chú", "Thao tác"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-5 py-4"><button type="button" onClick={() => setSelected(customer)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f5ee] font-semibold text-[#16866f]">{customer.name.slice(0, 1)}</span><span><b className="block font-medium text-[#163d36]">{customer.name}</b><span className="text-xs text-slate-400">Mã: {customer.id}</span></span></button></td><td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><Phone size={13} />{customer.phone}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Mail size={13} />{customer.email || "Chưa cập nhật"}</span></td><td className="px-5 py-4 text-slate-500">{customer.address || "Chưa cập nhật"}</td><td className="px-5 py-4 text-slate-500">{customer.birthday ? new Date(`${customer.birthday}T00:00:00`).toLocaleDateString("vi-VN") : "—"}</td><td className="max-w-[180px] truncate px-5 py-4 text-slate-500">{customer.note || "—"}</td><td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${customer.name}`} onClick={() => openEdit(customer)} className="text-slate-400 hover:text-[#16866f]"><Pencil size={16} /></Button><Button variant="ghost" size="icon" title="Xóa" aria-label={`Xóa ${customer.name}`} onClick={() => remove(customer)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy khách hàng phù hợp.</p>}</div>
      </section>

      {showForm && <CustomerForm draft={draft} editing={Boolean(editing)} error={error} onChange={setDraft} onSubmit={submit} onClose={() => setShowForm(false)} />}
      {selected && <CustomerDetails customer={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}

const emptyDraft: CustomerDraft = { name: "", phone: "", email: "", address: "", birthday: "", note: "" }

function CustomerForm({ draft, editing, error, onChange, onSubmit, onClose }: { draft: CustomerDraft; editing: boolean; error: string; onChange: (draft: CustomerDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const update = (key: keyof CustomerDraft, value: string) => onChange({ ...draft, [key]: value })
  return <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-12 backdrop-blur-sm"><form onSubmit={onSubmit} className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-semibold text-[#163d36]">{editing ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}</h2><p className="mt-1 text-xs text-slate-400">Số điện thoại là thông tin định danh trong cửa hàng.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={19} className="text-slate-400" /></button></div><div className="grid gap-4 p-6 md:grid-cols-2"><label className="text-xs font-medium text-slate-600">Họ và tên *<input required className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label className="text-xs font-medium text-slate-600">Số điện thoại *<input required className={inputClass} value={draft.phone} onChange={(event) => update("phone", event.target.value)} pattern="\+?[0-9]{8,15}" /></label><label className="text-xs font-medium text-slate-600">Email<input type="email" className={inputClass} value={draft.email} onChange={(event) => update("email", event.target.value)} /></label><label className="text-xs font-medium text-slate-600">Ngày sinh<input type="date" className={inputClass} value={draft.birthday} onChange={(event) => update("birthday", event.target.value)} /></label><label className="text-xs font-medium text-slate-600 md:col-span-2">Địa chỉ<input className={inputClass} value={draft.address} onChange={(event) => update("address", event.target.value)} /></label><label className="text-xs font-medium text-slate-600 md:col-span-2">Ghi chú<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f]" value={draft.note} onChange={(event) => update("note", event.target.value)} /></label></div>{error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{editing ? "Lưu thay đổi" : "Lưu khách hàng"}</Button></div></form></div>
}

function CustomerDetails({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-20 backdrop-blur-sm"><section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6f5ee] font-semibold text-[#16866f]">{customer.name.slice(0, 1)}</span><div><h2 className="font-semibold text-[#163d36]">{customer.name}</h2><p className="text-xs text-slate-400">{customer.phone}</p></div></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={19} className="text-slate-400" /></button></div><div className="mt-5 space-y-3 text-sm text-slate-600"><p><Mail className="mr-2 inline text-slate-400" size={15} />{customer.email || "Chưa cập nhật email"}</p><p><MapPin className="mr-2 inline text-slate-400" size={15} />{customer.address || "Chưa cập nhật địa chỉ"}</p><p><UserRound className="mr-2 inline text-slate-400" size={15} />Ngày sinh: {customer.birthday || "Chưa cập nhật"}</p><div className="rounded-lg bg-slate-50 p-3 text-sm">Ghi chú: {customer.note || "Không có ghi chú"}</div></div><div className="mt-6 flex justify-end"><Button onClick={onClose} className="bg-[#16866f] text-white hover:bg-[#0f705d]">Đóng</Button></div></section></div>
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
